import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Notificador } from '../../../core/notificacao/notificador';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { LayoutAuthComponent } from '../../../shared/ui/layout-auth/layout-auth.component';
import { BotaoComponent } from '../../../shared/ui/botao/botao.component';
import { ActivatedRoute } from '@angular/router';
import { senhaForteValidator } from '../../../shared/validators/senha-forte.validator';
import { RegrasSenhaComponent } from '../../../shared/ui/regras-senha/regras-senha.component';

@Component({
  selector: 'app-redefinir-senha',
  imports: [LayoutAuthComponent, BotaoComponent, CampoComponent, RegrasSenhaComponent, ReactiveFormsModule],
  templateUrl: './redefinir-senha.component.html',
  styleUrl: './redefinir-senha.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RedefinirSenhaComponent {
  private readonly auth = inject(AuthService);
  private readonly notificador = inject(Notificador);
  private readonly router = inject(Router);

  readonly enviando = signal(false);
  private readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');

  readonly linkValido = () => !!this.token;

  readonly formSenha = new FormGroup({
    novaSenha: new FormControl('', { nonNullable: true, validators: [Validators.required, senhaForteValidator()] }),
    confirmarSenha: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  readonly novaSenha = toSignal(this.formSenha.controls.novaSenha.valueChanges, { initialValue: '' });

  submit(): void {
    if (this.enviando()) {
      return;
    }
    const { novaSenha, confirmarSenha } = this.formSenha.getRawValue();
    if (!this.token || this.formSenha.invalid || novaSenha !== confirmarSenha) {
      this.formSenha.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.auth.redefinirSenha(this.token, novaSenha).pipe(finalize(() => this.enviando.set(false))).subscribe({
      next: () => void this.notificador.sucesso('Senha redefinida com sucesso!').then(() => this.router.navigate(['/login'])),
      error: (erro: unknown) => void this.notificador.erroDaApi(erro, 'Erro ao redefinir a senha.')
    });
  }

  voltar(): void {
    void this.router.navigate(['/login']);
  }
}
