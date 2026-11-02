import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Notificador } from '../../../core/notificacao/notificador';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { LayoutAuthComponent } from '../../../shared/ui/layout-auth/layout-auth.component';
import { emailValidator } from '../../../shared/validators/email.validator';
import { ActivatedRoute } from '@angular/router';
import { normalizarEmail } from '../../../shared/utils/email.util';

@Component({
  selector: 'app-reenviar-verificacao',
  imports: [LayoutAuthComponent, CampoComponent, ReactiveFormsModule],
  templateUrl: './reenviar-verificacao.component.html',
  styleUrl: './reenviar-verificacao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReenviarVerificacaoComponent {
  private readonly auth = inject(AuthService);
  private readonly notificador = inject(Notificador);
  private readonly router = inject(Router);

  readonly enviando = signal(false);

  readonly emailForm = new FormGroup({
    email: new FormControl(inject(ActivatedRoute).snapshot.queryParamMap.get('email') ?? '', { nonNullable: true, validators: [Validators.required, emailValidator()] })
  });

  submit(): void {
    if (this.enviando()) {
      return;
    }
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.auth.reenviarVerificacao(normalizarEmail(this.emailForm.getRawValue().email)).pipe(finalize(() => this.enviando.set(false))).subscribe({
      next: () => void this.notificador.sucesso('Se o e-mail estiver cadastrado, você receberá um novo link.').then(() => this.router.navigate(['/login'])),
      error: (erro: unknown) => void this.notificador.erroDaApi(erro, 'Não foi possível enviar o e-mail.')
    });
  }

  voltar(): void {
    void this.router.navigate(['/login']);
  }
}
