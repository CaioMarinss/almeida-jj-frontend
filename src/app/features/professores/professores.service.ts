import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Perfil } from '../../core/auth/usuario';

export interface PessoaAcademia {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
}

@Injectable({ providedIn: 'root' })
export class ProfessoresService {
  private readonly http = inject(HttpClient);

  listar(): Observable<PessoaAcademia[]> {
    return this.http.get<PessoaAcademia[]>(`${environment.apiUrl}/alunos`);
  }

  alterarPerfil(id: number, perfil: 'ALUNO' | 'PROFESSOR'): Observable<void> {
    return this.http.put<void>(`${environment.apiUrl}/alunos/${id}/perfil`, { perfil });
  }
}
