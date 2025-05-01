import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoginResponse } from '../types/login-response.type';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  apiUrl: string ="https://almeida-jj-backend-1.onrender.com/auth";
  constructor(private httpClient: HttpClient) {  }

  login(email: string, senha: string){
    return this.httpClient.post<LoginResponse>(this.apiUrl + "/login", {email,senha}).pipe(
      tap(
        (value) => {
          sessionStorage.setItem("auth-token", value.token)
          sessionStorage.setItem("username", value.name)
        }
      )
    )
  }

  cadastrar(nome: string, email: string, senha: string){
    return this.httpClient.post<LoginResponse>(this.apiUrl + "/register", {nome,email,senha}).pipe(
      tap(
        (value) => {
          sessionStorage.setItem("auth-token", value.token)
          sessionStorage.setItem("username", value.name)
        }
      )
    )
  }

}
