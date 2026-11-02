import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { LayoutAuthComponent } from '../../shared/ui/layout-auth/layout-auth.component';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-verificar',
  standalone: true,
  imports: [
    CommonModule,
    LayoutAuthComponent,
  ],
  templateUrl: './verificar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './verificar.component.scss'
})
export class VerificarComponent implements OnInit {
  mensagem = 'Verificando seu e-mail...';
  status: 'carregando' | 'sucesso' | 'erro' = 'carregando';

  constructor(
    private router: Router,
    private route: ActivatedRoute, 
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    const linkBack = `${environment.apiUrl}/aluno`;

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
