import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
import { SaidaService } from '../../core/auth/saida.service';
import { SessionService } from '../../core/auth/session.service';
import { ROTULO_PERFIL } from '../../core/auth/usuario';

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
  private readonly saida = inject(SaidaService);

  readonly nome = computed(() => this.sessao.usuario()?.nome ?? '');
  readonly perfil = computed(() => {
    const usuario = this.sessao.usuario();
    return usuario ? ROTULO_PERFIL[usuario.perfil] : '';
  });
  readonly inicial = computed(() => this.nome().charAt(0).toUpperCase());

  sair(): Promise<void> {
    return this.saida.sair();
  }
}
