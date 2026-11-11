import { ChangeDetectionStrategy, Component, computed, effect, inject, Signal, untracked } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonBadge,
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
  LucideCalendarDays,
  LucideCircleCheck,
  LucideClipboardCheck,
  LucideHouse,
  LucideLogOut,
  LucideUser,
  LucideUsers,
  LucideWallet
} from '@lucide/angular';
import { SaidaService } from '../../core/auth/saida.service';
import { SessionService } from '../../core/auth/session.service';
import { ROTULO_PERFIL } from '../../core/auth/usuario';
import { ContadoresDonoService } from '../../core/dono/contadores-dono.service';

export interface Aba {
  tab: string;
  rotulo: string;
  icone: 'presencas' | 'financeiro' | 'graduacao' | 'alunos' | 'perfil' | 'inicio' | 'aulas' | 'presenca';
  contador?: Signal<number>;
  unidade?: string;
}

@Component({
  selector: 'app-shell',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    RouterLinkActive,
    IonSplitPane,
    IonMenu,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonTabs,
    IonTabBar,
    IonTabButton,
    LucideAward,
    LucideHouse,
    LucideCalendarDays,
    LucideCircleCheck,
    LucideClipboardCheck,
    LucideWallet,
    LucideUser,
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
  private readonly contadores = inject(ContadoresDonoService);

  readonly nome = computed(() => this.sessao.usuario()?.nome ?? '');
  readonly perfil = computed(() => {
    const usuario = this.sessao.usuario();
    return usuario ? ROTULO_PERFIL[usuario.perfil] : '';
  });
  readonly inicial = computed(() => this.nome().charAt(0).toUpperCase());
  readonly ehDono = computed(() => this.sessao.usuario()?.perfil === 'DONO');

  readonly abas = computed<Aba[]>(() =>
    this.ehDono()
      ? [
          { tab: 'chamada', rotulo: 'Presenças', icone: 'presencas' },
          { tab: 'financeiro', rotulo: 'Financeiro', icone: 'financeiro' },
          { tab: 'graduacao', rotulo: 'Graduação', icone: 'graduacao', contador: this.contadores.aptos, unidade: 'aptos' },
          { tab: 'alunos', rotulo: 'Alunos', icone: 'alunos', contador: this.contadores.sumidos, unidade: 'sumidos' },
          { tab: 'perfil', rotulo: 'Perfil', icone: 'perfil' }
        ]
      : [
          { tab: 'inicio', rotulo: 'Início', icone: 'inicio' },
          { tab: 'aulas', rotulo: 'Aulas', icone: 'aulas' },
          { tab: 'presenca', rotulo: 'Presença', icone: 'presenca' },
          { tab: 'financeiro', rotulo: 'Financeiro', icone: 'financeiro' },
          { tab: 'perfil', rotulo: 'Perfil', icone: 'perfil' }
        ]
  );

  constructor() {
    effect(() => {
      if (this.ehDono()) {
        untracked(() => void this.contadores.atualizar());
      }
    });
  }

  aoTrocarAba(): void {
    if (this.ehDono()) {
      void this.contadores.atualizar();
    }
  }

  sair(): Promise<void> {
    return this.saida.sair();
  }
}
