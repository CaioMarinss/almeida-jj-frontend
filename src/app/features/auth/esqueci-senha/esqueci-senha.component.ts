import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { Notificador } from '../../../core/notificacao/notificador';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { LayoutAuthComponent } from '../../../shared/ui/layout-auth/layout-auth.component';
import { emailValidator } from '../../../shared/validators/email.validator';
import { normalizarEmail } from '../../../shared/utils/email.util';

@Component({
  selector: 'app-esqueci-senha',
  imports: [LayoutAuthComponent, CampoComponent, ReactiveFormsModule],
  templateUrl: './esqueci-senha.component.html',
  styleUrl: './esqueci-senha.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EsqueciSenhaComponent {
  private readonly auth = inject(AuthService);
  private readonly notificador = inject(Notificador);
  private readonly router = inject(Router);

  readonly emailForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, emailValidator()] })
  });

  submit(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.auth.esqueciSenha(normalizarEmail(this.emailForm.getRawValue().email)).subscribe({
      next: () => void this.notificador.sucesso('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.').then(() => this.router.navigate(['/login'])),
      error: (erro: unknown) => void this.notificador.erroDaApi(erro, 'Não foi possível enviar o e-mail.')
    });
  }

  voltar(): void {
    void this.router.navigate(['/login']);
  }
}
