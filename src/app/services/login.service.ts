import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoginResponse } from '../types/login-response.type';
import { catchError, tap, throwError } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class LoginService {

  apiUrlAuth: string = "https://almeida-jj-api.onrender.com/auth";
  apiUrl: string = "https://almeida-jj-api.onrender.com";

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

  cadastrar(nome: string, email: string, senha: string) {
    return this.httpClient.post<LoginResponse>(this.apiUrlAuth + "/register", { nome, email, senha }).pipe(
      tap(
        (value) => {
          sessionStorage.setItem("auth-token", value.token)
          sessionStorage.setItem("username", value.name)
        }
      )
    )
  }


  enviarEmail(email: string) {
    return this.httpClient.post(this.apiUrlAuth + "/enviar-email", { email }).pipe(
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
