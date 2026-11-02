import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionService } from './session.service';
import { Perfil, Usuario } from './usuario';

interface LoginResposta {
  token: string;
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
}

export interface DadosCadastro {
  nome: string;
  cpf: string;
  email: string;
  senha: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sessao = inject(SessionService);
  private readonly base = `${environment.apiUrl}/auth`;

  login(email: string, senha: string): Observable<Usuario> {
    return this.http.post<LoginResposta>(`${this.base}/login`, { email, senha }).pipe(
      map(({ token, id, nome, email: emailUsuario, perfil }) => {
        const usuario: Usuario = { id, nome, email: emailUsuario, perfil };
        this.sessao.iniciar(token, usuario);
        return usuario;
      })
    );
  }

  cadastrar(dados: DadosCadastro): Observable<void> {
    return this.http.post<void>(`${this.base}/cadastro`, dados);
  }

  verificarEmail(token: string): Observable<void> {
    return this.http.post<void>(`${this.base}/verificacao`, { token });
  }

  reenviarVerificacao(email: string): Observable<void> {
    return this.http.post<void>(`${this.base}/verificacao/reenvio`, { email });
  }

  esqueciSenha(email: string): Observable<void> {
    return this.http.post<void>(`${this.base}/senha/esqueci`, { email });
  }

  redefinirSenha(token: string, novaSenha: string): Observable<void> {
    return this.http.post<void>(`${this.base}/senha/redefinir`, { token, novaSenha });
  }
}
