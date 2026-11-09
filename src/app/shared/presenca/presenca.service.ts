import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Chamada, MinhasPresencas } from './presenca.model';

@Injectable({ providedIn: 'root' })
export class PresencaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  marcar(data: string, idAula: number): Observable<void> {
    return this.http.post<void>(`${this.aula(data, idAula)}/presenca`, null).pipe(map(() => undefined));
  }

  desmarcar(data: string, idAula: number): Observable<void> {
    return this.http.delete<void>(`${this.aula(data, idAula)}/presenca`);
  }

  minhas(): Observable<MinhasPresencas> {
    return this.http.get<MinhasPresencas>(`${this.base}/alunos/me/presencas`);
  }

  chamada(data: string, idAula: number): Observable<Chamada> {
    return this.http.get<Chamada>(`${this.aula(data, idAula)}/presencas`);
  }

  incluir(data: string, idAula: number, idAluno: number): Observable<void> {
    return this.http.post<void>(`${this.aula(data, idAula)}/presencas`, { idAluno }).pipe(map(() => undefined));
  }

  tirar(data: string, idAula: number, idAluno: number): Observable<void> {
    return this.http.delete<void>(`${this.aula(data, idAula)}/presencas/${idAluno}`);
  }

  private aula(data: string, idAula: number): string {
    return `${this.base}/agenda/${data}/aulas/${idAula}`;
  }
}
