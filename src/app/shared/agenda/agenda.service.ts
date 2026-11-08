import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AulaDoDia,
  AulaGrade,
  DiaAgenda,
  EdicaoAula,
  Excecao,
  NovaAulaGrade,
  NovaAvulsa,
  NovoCancelamento,
} from './agenda.model';

@Injectable({ providedIn: 'root' })
export class AgendaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  agenda(inicio: string, fim: string): Observable<DiaAgenda[]> {
    const params = new HttpParams().set('inicio', inicio).set('fim', fim);
    return this.http.get<DiaAgenda[]>(`${this.base}/agenda`, { params });
  }

  grade(): Observable<AulaGrade[]> {
    return this.http.get<AulaGrade[]>(`${this.base}/aulas/grade`);
  }

  criarAula(nova: NovaAulaGrade): Observable<AulaGrade> {
    return this.http.post<AulaGrade>(`${this.base}/aulas/grade`, nova);
  }

  editarAula(id: number, edicao: EdicaoAula): Observable<AulaGrade> {
    return this.http.put<AulaGrade>(`${this.base}/aulas/grade/${id}`, edicao);
  }

  tirarDaGrade(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/aulas/grade/${id}`);
  }

  excecoes(): Observable<Excecao[]> {
    return this.http.get<Excecao[]>(`${this.base}/agenda/excecoes`);
  }

  cancelar(novo: NovoCancelamento): Observable<void> {
    return this.http.post<{ id: number }>(`${this.base}/agenda/cancelamentos`, novo).pipe(map(() => undefined));
  }

  desfazerCancelamento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/agenda/cancelamentos/${id}`);
  }

  criarAvulsa(nova: NovaAvulsa): Observable<AulaDoDia> {
    return this.http.post<AulaDoDia>(`${this.base}/agenda/avulsas`, nova);
  }

  removerAvulsa(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/agenda/avulsas/${id}`);
  }
}
