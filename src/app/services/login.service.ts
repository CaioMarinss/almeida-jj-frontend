import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoginResponse } from '../types/login-response.type';
import { catchError, tap, throwError } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class LoginService {

  //apiUrl: string = "https://almeida-jj-api.onrender.com";
  apiUrl: string = "http://localhost:8080";
  apiUrlAuth: string = this.apiUrl + "/auth";
  apiUrlEmail: string = this.apiUrl + "/email";

  constructor(private httpClient: HttpClient) { }

  login(email: string, senha: string) {
    return this.httpClient.post<LoginResponse>(this.apiUrlAuth + "/login", { email, senha }).pipe(
      tap(
        (value) => {
          sessionStorage.setItem("auth-token", value.token)
          sessionStorage.setItem("username", value.name)
        }
      )
    )
  }

  cadastrar(nome: string, cpf: string, email: string, senha: string) {
    return this.httpClient.post<LoginResponse>(this.apiUrlAuth + "/register", { nome, cpf, email, senha }).pipe(
      tap(
        (value) => {
          sessionStorage.setItem("auth-token", value.token)
          sessionStorage.setItem("username", value.name)
        }
      )
    )
  }


  enviarEmailRecuperacao(email: string) {
    return this.httpClient.post(this.apiUrlEmail + "/enviar-email-recuperacao", { email }).pipe(
      catchError(err => {
        console.error("Erro ao enviar e-mail:", err);
        return throwError(() => new Error("Erro ao enviar e-mail"));
      })
    );
  }
  
  enviarEmailVerificacao(email: string) {
    return this.httpClient.post(this.apiUrlEmail + "/enviar-email-verificacao", { email }).pipe(
      catchError(err => {
        console.error("Erro ao enviar e-mail:", err);
        return throwError(() => new Error("Erro ao enviar e-mail"));
      })
    );
  }

  resetSenha(email: string, novaSenha: string, token: string) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    return this.httpClient.put(this.apiUrl + "/administrador/resetar",
      { email, novaSenha }, 
      { headers }            
    );
  }
  


}
