import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar, NavController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../../../core/auth/session.service';
import { Notificador } from '../../../core/notificacao/notificador';
import { BotaoComponent } from '../../../shared/ui/botao/botao.component';
import { CampoComponent } from '../../../shared/ui/campo/campo.component';
import { RegrasSenhaComponent } from '../../../shared/ui/regras-senha/regras-senha.component';
import { senhaForteValidator } from '../../../shared/validators/senha-forte.validator';
import { PerfilService } from '../perfil.service';

function senhasIguais(form: AbstractControl): ValidationErrors | null {
  return form.get('novaSenha')?.value === form.get('passwordConfirm')?.value ? null : { senhasDiferentes: true };
}

@Component({
  selector: 'app-trocar-senha',
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    CampoComponent,
    BotaoComponent,
    RegrasSenhaComponent
  ],
  templateUrl: './trocar-senha.component.html',
  styleUrl: './trocar-senha.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrocarSenhaComponent {
  private readonly sessao = inject(SessionService);
  private readonly perfilService = inject(PerfilService);
  private readonly notificador = inject(Notificador);
  private readonly nav = inject(NavController);

  readonly trocandoSenha = signal(false);

  readonly senhaForm = new FormGroup(
    {
      senhaAtual: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      novaSenha: new FormControl('', { nonNullable: true, validators: [Validators.required, senhaForteValidator()] }),
      passwordConfirm: new FormControl('', { nonNullable: true, validators: [Validators.required] })
    },
    { validators: senhasIguais }
  );

  readonly novaSenha = toSignal(this.senhaForm.controls.novaSenha.valueChanges, { initialValue: '' });

  async trocarSenha(): Promise<void> {
    if (this.trocandoSenha()) {
      return;
    }
    if (this.senhaForm.invalid) {
      this.senhaForm.markAllAsTouched();
      return;
    }
    this.trocandoSenha.set(true);
    try {
      const confirmado = await this.notificador.confirmar(
        'Trocar senha',
        'Tem certeza que deseja alterar sua senha?',
        'Alterar'
      );
      if (!confirmado) {
        return;
      }
      const { senhaAtual, novaSenha } = this.senhaForm.getRawValue();
      await firstValueFrom(this.perfilService.alterarSenha(senhaAtual, novaSenha), { defaultValue: undefined });
      await this.notificador.sucesso('Senha alterada! Entre novamente com a nova senha.');
      this.sessao.encerrar();
      await this.nav.navigateRoot('/login');
    } catch (erro: unknown) {
      if (erro instanceof HttpErrorResponse && erro.status === 401) {
        return;
      }
      await this.notificador.erroDaApi(erro, 'Erro ao alterar a senha.');
    } finally {
      this.trocandoSenha.set(false);
    }
  }
}
