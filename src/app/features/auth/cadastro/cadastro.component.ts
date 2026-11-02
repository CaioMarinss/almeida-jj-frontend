import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { Notificador } from '../../../core/notificacao/notificador';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { LayoutAuthComponent } from '../../../shared/ui/layout-auth/layout-auth.component';
import { emailValidator } from '../../../shared/validators/email.validator';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { cpfValidator } from '../../../shared/validators/cpf.validator';
import { normalizarEmail } from '../../../shared/utils/email.util';

function senhasIguais(form: AbstractControl): ValidationErrors | null {
  return form.get('senha')?.value === form.get('passwordConfirm')?.value ? null : { senhasDiferentes: true };
}

@Component({
  selector: 'app-cadastro',
  imports: [LayoutAuthComponent, CampoComponent, ReactiveFormsModule],
  templateUrl: './cadastro.component.html',
  styleUrl: './cadastro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CadastroComponent {
  private readonly auth = inject(AuthService);
  private readonly notificador = inject(Notificador);
  private readonly router = inject(Router);

  readonly cadastroForm = new FormGroup(
    {
      nome: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
      cpf: new FormControl('', { nonNullable: true, validators: [Validators.required, cpfValidator()] }),
      email: new FormControl('', { nonNullable: true, validators: [Validators.required, emailValidator()] }),
      senha: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(6)] }),
      passwordConfirm: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)]
      })
    },
    { validators: senhasIguais }
  );

  submit(): void {
    if (this.cadastroForm.invalid) {
      this.cadastroForm.markAllAsTouched();
      return;
    }
    const { nome, cpf, email, senha } = this.cadastroForm.getRawValue();
    this.auth
      .cadastrar({ nome: nome.trim(), cpf: cpf.replace(/\D/g, ''), email: normalizarEmail(email), senha })
      .subscribe({
        next: () =>
          void this.notificador
            .sucesso('Cadastro realizado! Verifique seu e-mail para ativar a conta.')
            .then(() => this.router.navigate(['/login'])),
        error: (erro: unknown) => void this.notificador.erroDaApi(erro, 'Não foi possível concluir o cadastro.')
      });
  }

  irParaLogin(): void {
    void this.router.navigate(['/login']);
  }
}
