import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { mensagemDeErro } from '../../../core/http/erro-api';
import { LayoutAuthComponent } from '../../../shared/ui/layout-auth/layout-auth.component';

type Status = 'carregando' | 'sucesso' | 'erro';

@Component({
  selector: 'app-verificar',
  imports: [LayoutAuthComponent],
  templateUrl: './verificar.component.html',
  styleUrl: './verificar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerificarComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');

  readonly status = signal<Status>('carregando');
  readonly mensagem = signal('Verificando seu e-mail...');

  ngOnInit(): void {
    if (!this.token) {
      this.falhar('Link inválido ou expirado.');
      return;
    }
    this.auth.verificarEmail(this.token).subscribe({
      next: () => {
        this.status.set('sucesso');
        this.mensagem.set('E-mail verificado com sucesso!');
      },
      error: (erro: unknown) => this.falhar(mensagemDeErro(erro, 'Erro ao verificar o e-mail.'))
    });
  }

  reenviar(): void {
    void this.router.navigate(['/verificaremail']);
  }

  voltar(): void {
    void this.router.navigate(['/login']);
  }

  private falhar(mensagem: string): void {
    this.status.set('erro');
    this.mensagem.set(mensagem);
  }
}
