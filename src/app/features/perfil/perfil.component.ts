import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
import { ROTULO_PERFIL } from '../../core/auth/usuario';
import { Notificador } from '../../core/notificacao/notificador';
import { DialogoConfirmacaoComponent } from '../../shared/ui/dialogo-confirmacao/dialogo-confirmacao.component';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { PerfilService } from './perfil.service';

@Component({
  selector: 'app-perfil',
  imports: [FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, DialogoConfirmacaoComponent],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerfilComponent {
  private readonly sessao = inject(SessionService);
  private readonly perfilService = inject(PerfilService);
  private readonly notificador = inject(Notificador);
  private readonly router = inject(Router);

  readonly nome = computed(() => this.sessao.usuario()?.nome ?? '');
  readonly email = computed(() => this.sessao.usuario()?.email ?? '');
  readonly perfil = computed(() => {
    const usuario = this.sessao.usuario();
    return usuario ? ROTULO_PERFIL[usuario.perfil] : '';
  });

  readonly imagemPerfil = signal('https://images.unsplash.com/photo-1541534401786-2077eed87a74?auto=format&fit=crop&w=400&q=80');
  readonly nomeEditado = signal(this.nome());
  readonly senhaAtual = signal('');
  readonly novaSenha = signal('');
  readonly confirmacaoSenha = signal('');
  readonly confirmandoSenha = signal(false);

  salvar(): void {
    this.salvarNome();
    if (!this.senhaAtual() && !this.novaSenha() && !this.confirmacaoSenha()) {
      void this.notificador.sucesso('Alterações salvas com sucesso!');
      return;
    }
    if (!this.senhaAtual() || !this.novaSenha() || !this.confirmacaoSenha()) {
      void this.notificador.aviso('Preencha a senha atual, a nova senha e a confirmação.');
      return;
    }
    if (this.novaSenha().length < 6) {
      void this.notificador.aviso('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (this.novaSenha() !== this.confirmacaoSenha()) {
      void this.notificador.aviso('As senhas não coincidem.');
      return;
    }
    this.confirmandoSenha.set(true);
  }

  confirmarTrocaDeSenha(): void {
    this.confirmandoSenha.set(false);
    this.perfilService.alterarSenha(this.senhaAtual(), this.novaSenha()).subscribe({
      next: () =>
        void this.notificador.sucesso('Senha alterada! Entre novamente com a nova senha.').then(() => {
          this.sessao.encerrar();
          return this.router.navigate(['/login']);
        }),
      error: (erro: unknown) => void this.notificador.erroDaApi(erro, 'Erro ao alterar a senha.')
    });
  }

  aoTrocarImagem(evento: Event): void {
    const arquivo = (evento.target as HTMLInputElement).files?.[0];
    if (!arquivo) {
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => this.imagemPerfil.set(leitor.result as string);
    leitor.readAsDataURL(arquivo);
  }

  private salvarNome(): void {
    const nome = this.nomeEditado().trim();
    if (nome && nome !== this.nome()) {
      this.sessao.atualizarNome(nome);
    }
  }
}
