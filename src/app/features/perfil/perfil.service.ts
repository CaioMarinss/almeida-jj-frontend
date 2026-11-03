import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);

  alterarSenha(senhaAtual: string, novaSenha: string): Observable<void> {
    return this.http.put<void>(`${environment.apiUrl}/alunos/me/senha`, { senhaAtual, novaSenha });
  }
}
