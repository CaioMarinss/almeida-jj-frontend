import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, NavController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { SaidaService } from '../../core/auth/saida.service';
import { SessionService } from '../../core/auth/session.service';
import { ROTULO_PERFIL } from '../../core/auth/usuario';
import { Notificador } from '../../core/notificacao/notificador';
import { BotaoComponent } from '../../shared/ui/botao/botao.component';
import { CampoComponent } from '../../shared/ui/campo/campo.component';
import { PerfilService } from './perfil.service';
import { senhaForteValidator } from '../../shared/validators/senha-forte.validator';
import { RegrasSenhaComponent } from '../../shared/ui/regras-senha/regras-senha.component';

function senhasIguais(form: AbstractControl): ValidationErrors | null {
  return form.get('novaSenha')?.value === form.get('passwordConfirm')?.value ? null : { senhasDiferentes: true };
}

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, IonContent, CampoComponent, BotaoComponent, RegrasSenhaComponent],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerfilComponent {
  private readonly sessao = inject(SessionService);
  private readonly perfilService = inject(PerfilService);
  private readonly notificador = inject(Notificador);
  private readonly saida = inject(SaidaService);
  private readonly nav = inject(NavController);

  readonly nome = computed(() => this.sessao.usuario()?.nome ?? '');
  readonly email = computed(() => this.sessao.usuario()?.email ?? '');
  readonly perfil = computed(() => {
    const usuario = this.sessao.usuario();
    return usuario ? ROTULO_PERFIL[usuario.perfil] : '';
  });
  readonly inicial = computed(() => this.nome().charAt(0).toUpperCase());
  readonly ehDono = computed(() => this.sessao.usuario()?.perfil === 'DONO');

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

  abrirProfessores(): Promise<boolean> {
    return this.nav.navigateForward('/app/professores');
  }

  abrirGraduacoes(): Promise<boolean> {
    return this.nav.navigateForward('/app/graduacao');
  }

  sair(): Promise<void> {
    return this.saida.sair();
  }
}
