import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar, NavController } from '@ionic/angular';
import { LucideChevronRight, LucideKeyRound } from '@lucide/angular';
import { SaidaService } from '../../core/auth/saida.service';
import { SessionService } from '../../core/auth/session.service';
import { ROTULO_PERFIL } from '../../core/auth/usuario';
import { BotaoComponent } from '../../shared/ui/botao/botao.component';

@Component({
  selector: 'app-perfil',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, BotaoComponent, LucideChevronRight, LucideKeyRound],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerfilComponent {
  private readonly sessao = inject(SessionService);
  private readonly saida = inject(SaidaService);
  private readonly nav = inject(NavController);

  readonly nome = computed(() => this.sessao.usuario()?.nome ?? '');
  readonly email = computed(() => this.sessao.usuario()?.email ?? '');
  readonly perfil = computed(() => {
    const usuario = this.sessao.usuario();
    return usuario ? ROTULO_PERFIL[usuario.perfil] : '';
  });
  readonly inicial = computed(() => this.nome().charAt(0).toUpperCase());

  abrirTrocarSenha(): Promise<boolean> {
    return this.nav.navigateForward('/app/perfil/senha');
  }

  sair(): Promise<void> {
    return this.saida.sair();
  }
}
