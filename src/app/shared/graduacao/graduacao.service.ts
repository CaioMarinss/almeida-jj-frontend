import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlunoGraduacao, Faixa, GraduacaoAtual, MinhaGraduacao, RegistroGraduacao } from './graduacao.model';

export interface NovoRegistro {
  idGraduacao: number;
  grau: number;
  data?: string;
}

export interface RegistroCriado extends RegistroGraduacao {
  atual: GraduacaoAtual | null;
}

interface RegistroRemovido {
  atual: GraduacaoAtual | null;
}

interface DataProxima {
  data: string;
}

@Injectable({ providedIn: 'root' })
export class GraduacaoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

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
    return this.http.post<RegistroCriado>(`${this.base}/alunos/${id}/graduacoes`, corpo);
  }

  remover(idAluno: number, idRegistro: number): Observable<GraduacaoAtual | null> {
    return this.http
      .delete<RegistroRemovido>(`${this.base}/alunos/${idAluno}/graduacoes/${idRegistro}`)
      .pipe(map((r) => r.atual));
  }

  proxima(): Observable<string | null> {
    return this.http
      .get<DataProxima>(`${this.base}/graduacoes/proxima`, { observe: 'response' })
      .pipe(map((r: HttpResponse<DataProxima>) => (r.status === 204 || !r.body ? null : r.body.data)));
  }

  agendar(data: string): Observable<string> {
    return this.http.put<DataProxima>(`${this.base}/graduacoes/proxima`, { data }).pipe(map((r) => r.data));
  }

  cancelar(): Observable<void> {
    return this.http.delete<void>(`${this.base}/graduacoes/proxima`);
  }
}
