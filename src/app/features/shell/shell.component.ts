import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonSplitPane,
  IonTabBar,
  IonTabButton,
  IonTabs
} from '@ionic/angular';
import { LucideCalendarDays, LucideCircleCheck, LucideHouse, LucideLogOut, LucideUser, LucideWallet } from '@lucide/angular';
import { SessionService } from '../../core/auth/session.service';
import { ROTULO_PERFIL } from '../../core/auth/usuario';
import { Notificador } from '../../core/notificacao/notificador';

@Component({
  selector: 'app-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    IonSplitPane,
    IonMenu,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonTabs,
    IonTabBar,
    IonTabButton,
    LucideHouse,
    LucideCalendarDays,
    LucideCircleCheck,
    LucideWallet,
    LucideUser,
    LucideLogOut
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShellComponent {
  private readonly sessao = inject(SessionService);
  private readonly notificador = inject(Notificador);
  private readonly router = inject(Router);

  readonly nome = computed(() => this.sessao.usuario()?.nome ?? '');
  readonly perfil = computed(() => {
    const usuario = this.sessao.usuario();
    return usuario ? ROTULO_PERFIL[usuario.perfil] : '';
  });
  readonly inicial = computed(() => this.nome().charAt(0).toUpperCase());

  async sair(): Promise<void> {
    if (!(await this.notificador.confirmar('Sair', 'Deseja sair da sua conta?', 'Sair'))) {
      return;
    }
    this.sessao.encerrar();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
