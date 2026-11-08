import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, Subject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AlunoGraduacao,
  Faixa,
  GraduacaoAtual,
  ListaAptos,
  MinhaGraduacao,
  ProximaGraduacao,
  RegistroGraduacao
} from './graduacao.model';

export interface NovoRegistro {
  idGraduacao: number;
  grau: number;
  data?: string;
}

export interface RegistroCriado extends RegistroGraduacao {
  atual: GraduacaoAtual | null;
}

export interface AtualAlterada {
  idAluno: number;
  atual: GraduacaoAtual | null;
}

interface RegistroRemovido {
  atual: GraduacaoAtual | null;
}

export interface EscolhaGraduacao {
  idGraduacao: number;
  grau: number;
}

@Injectable({ providedIn: 'root' })
export class GraduacaoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;
  private readonly alteracoes = new Subject<AtualAlterada>();

  readonly atualAlterada$: Observable<AtualAlterada> = this.alteracoes.asObservable();

  faixas(): Observable<Faixa[]> {
    return this.http.get<Faixa[]>(`${this.base}/graduacoes/faixas`);
  }

  minha(): Observable<MinhaGraduacao> {
    return this.http.get<MinhaGraduacao>(`${this.base}/alunos/me/graduacao`);
  }

  alunos(): Observable<AlunoGraduacao[]> {
    return this.http.get<AlunoGraduacao[]>(`${this.base}/graduacoes/alunos`);
  }

  historicoDe(id: number): Observable<RegistroGraduacao[]> {
    return this.http.get<RegistroGraduacao[]>(`${this.base}/alunos/${id}/graduacoes`);
  }

  registrar(id: number, corpo: NovoRegistro): Observable<RegistroCriado> {
    return this.http
      .post<RegistroCriado>(`${this.base}/alunos/${id}/graduacoes`, corpo)
      .pipe(tap((r) => this.alteracoes.next({ idAluno: id, atual: r.atual })));
  }

  remover(idAluno: number, idRegistro: number): Observable<GraduacaoAtual | null> {
    return this.http
      .delete<RegistroRemovido>(`${this.base}/alunos/${idAluno}/graduacoes/${idRegistro}`)
      .pipe(
        map((r) => r.atual),
        tap((atual) => this.alteracoes.next({ idAluno, atual }))
      );
  }

  proxima(): Observable<ProximaGraduacao | null> {
    return this.http
      .get<ProximaGraduacao>(`${this.base}/graduacoes/proxima`, { observe: 'response' })
      .pipe(map((r: HttpResponse<ProximaGraduacao>) => (r.status === 204 || !r.body ? null : r.body)));
  }

  agendar(data: string, minimoGrau: number | null, minimoFaixa: number | null): Observable<ProximaGraduacao> {
    return this.http.put<ProximaGraduacao>(`${this.base}/graduacoes/proxima`, { data, minimoGrau, minimoFaixa });
  }

  cancelar(): Observable<void> {
    return this.http.delete<void>(`${this.base}/graduacoes/proxima`);
  }

  aptos(): Observable<ListaAptos> {
    return this.http.get<ListaAptos>(`${this.base}/graduacoes/aptos`);
  }

  graduou(idAluno: number, escolha?: EscolhaGraduacao): Observable<RegistroCriado> {
    return this.http
      .post<RegistroCriado>(`${this.base}/graduacoes/aptos/${idAluno}`, escolha ?? {})
      .pipe(tap((r) => this.alteracoes.next({ idAluno, atual: r.atual })));
  }
}
