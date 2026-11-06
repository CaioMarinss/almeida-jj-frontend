import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Faixa, FiltroAlunos, MinhaGraduacao, PaginaAlunos, RegistroGraduacao } from './graduacao.model';

export interface NovoRegistro {
  idGraduacao: number;
  grau: number;
  data?: string;
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

  buscarAlunos(f: FiltroAlunos): Observable<PaginaAlunos> {
    let params = new HttpParams();
    if (f.nome) {
      params = params.set('nome', f.nome);
    }
    if (f.faixa !== undefined) {
      params = params.set('faixa', String(f.faixa));
    }
    params = params.set('pagina', String(f.pagina)).set('tamanho', String(f.tamanho));
    return this.http.get<PaginaAlunos>(`${this.base}/graduacoes/alunos`, { params });
  }

  historicoDe(id: number): Observable<RegistroGraduacao[]> {
    return this.http.get<RegistroGraduacao[]>(`${this.base}/alunos/${id}/graduacoes`);
  }

  registrar(id: number, corpo: NovoRegistro): Observable<RegistroGraduacao> {
    return this.http.post<RegistroGraduacao>(`${this.base}/alunos/${id}/graduacoes`, corpo);
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
