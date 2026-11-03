import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Notificador } from '../../../core/notificacao/notificador';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { LayoutAuthComponent } from '../../../shared/ui/layout-auth/layout-auth.component';
import { BotaoComponent } from '../../../shared/ui/botao/botao.component';
import { emailValidator } from '../../../shared/validators/email.validator';
import { codigoDeErro, mensagemDeErro } from '../../../core/http/erro-api';
import { normalizarEmail } from '../../../shared/utils/email.util';

@Component({
  selector: 'app-login',
  imports: [LayoutAuthComponent, BotaoComponent, CampoComponent, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly notificador = inject(Notificador);
  private readonly router = inject(Router);
  private readonly nav = inject(NavController);

  readonly enviando = signal(false);

  readonly loginForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, emailValidator()] }),
    senha: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] })
  });

  submit(): void {
    if (this.enviando()) {
      return;
    }
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    const email = normalizarEmail(this.loginForm.getRawValue().email);
    this.enviando.set(true);
    this.auth.login(email, this.loginForm.getRawValue().senha).pipe(finalize(() => this.enviando.set(false))).subscribe({
      next: () => void this.nav.navigateRoot('/app/inicio'),
      error: (erro: unknown) => {
        if (codigoDeErro(erro) === 'ERR003') {
          void this.notificador
            .aviso(mensagemDeErro(erro, 'Verifique seu e-mail antes de entrar.'))
            .then(() => this.router.navigate(['/verificaremail'], { queryParams: { email } }));
          return;
        }
        void this.notificador.erroDaApi(erro, 'Não foi possível entrar.');
      }
    });
  }

  irParaCadastro(): void {
    void this.router.navigate(['/cadastro']);
  }

  irParaVerificacao(): void {
    void this.router.navigate(['/verificaremail']);
  }

  irParaEsqueciSenha(): void {
    void this.router.navigate(['/esquecisenha']);
  }
}
