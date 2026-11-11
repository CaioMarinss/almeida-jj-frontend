import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlunoPainel, PessoaAcademia } from './alunos.model';

@Injectable({ providedIn: 'root' })
export class AlunosService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}`;

  painel(): Observable<AlunoPainel[]> {
    return this.http.get<AlunoPainel[]>(`${this.base}/alunos/painel`);
  }

  listar(): Observable<PessoaAcademia[]> {
    return this.http.get<PessoaAcademia[]>(`${this.base}/alunos`);
  }

  alterarPerfil(id: number, perfil: 'PROFESSOR' | 'ALUNO'): Observable<void> {
    return this.http.put<void>(`${this.base}/alunos/${id}/perfil`, { perfil });
  }
}
