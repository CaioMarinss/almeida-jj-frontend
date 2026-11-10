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
import {
  LucideAward,
  LucideCalendarCog,
  LucideCalendarDays,
  LucideCircleCheck,
  LucideClipboardCheck,
  LucideHouse,
  LucideLogOut,
  LucideUser,
  LucideUserX,
  LucideUsers,
  LucideWallet
} from '@lucide/angular';
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
    LucideAward,
    LucideHouse,
    LucideCalendarCog,
    LucideCalendarDays,
    LucideCircleCheck,
    LucideClipboardCheck,
    LucideWallet,
    LucideUser,
    LucideUserX,
    LucideUsers,
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
  readonly ehProfessor = computed(() => {
    const perfil = this.sessao.usuario()?.perfil;
    return perfil === 'PROFESSOR' || perfil === 'DONO';
  });
  readonly ehDono = computed(() => this.sessao.usuario()?.perfil === 'DONO');

  sair(): Promise<void> {
    return this.saida.sair();
  }
}
