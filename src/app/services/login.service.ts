import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoginResponse } from '../types/login-response.type';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  apiUrl: string ="http://localhost:8080/auth/login";
  constructor(private httpClient: HttpClient) {  }

  login(email: String, senha: String){
    return this.httpClient.post<LoginResponse>(this.apiUrl, {email,senha}).pipe(
      tap(
        (value) => {
          sessionStorage.setItem("auth-token", value.token)
          sessionStorage.setItem("username", value.name)
        }
      )
    )
  }
}
