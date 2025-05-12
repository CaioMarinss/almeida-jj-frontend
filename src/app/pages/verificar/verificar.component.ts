import { Component, OnInit } from '@angular/core';
import { DefaultLoginLayoutComponent } from '../../components/default-login-layout/default-login-layout.component';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verificar',
  standalone: true,
  imports: [
    CommonModule,
    DefaultLoginLayoutComponent,
  ],
  templateUrl: './verificar.component.html',
  styleUrl: './verificar.component.scss'
})
export class VerificarComponent implements OnInit {
  mensagem = 'Verificando seu e-mail...';
  status: 'carregando' | 'sucesso' | 'erro' = 'carregando';

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private route: ActivatedRoute, 
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    //const linkBack = "http://localhost:8080/administrador";
    const linkBack = "https://almeida-jj-api.onrender.com/administrador";

    if (token) {
      this.http.get(`${linkBack}/verificar?token=${token}`, { responseType: 'text' })
        .subscribe({
          next: (res) => {
            this.status = 'sucesso';
            this.mensagem = res;
          },
          error: (err) => {
            this.status = 'erro';
            this.mensagem = err.error || 'Erro ao verificar o e-mail.';
          }
        });
    } else {
      this.status = 'erro';
      this.mensagem = 'Token não encontrado na URL.';
    }
  }

  submit() {
    this.router.navigate(['/verificaremail']);
  }
  navigate() {
    this.router.navigate(['/login']);
  }
}
