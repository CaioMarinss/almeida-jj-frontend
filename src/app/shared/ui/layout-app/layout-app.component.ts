import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../core/auth/session.service';
import { ROTULO_PERFIL } from '../../../core/auth/usuario';
import { DialogoConfirmacaoComponent } from '../dialogo-confirmacao/dialogo-confirmacao.component';

export interface ItemNavegacao {
  label: string;
  route?: string;
  active?: boolean;
}

@Component({
  selector: 'app-layout-app',
  imports: [RouterLink, DialogoConfirmacaoComponent],
  templateUrl: './layout-app.component.html',
  styleUrl: './layout-app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutAppComponent {
  private readonly sessao = inject(SessionService);
  private readonly router = inject(Router);

  readonly heading = input('Bem-vindo');
  readonly title = input('Dashboard');
  readonly navItems = input<ItemNavegacao[]>([
    { label: 'Visão geral', route: '/dashboard', active: true },
    { label: 'Treinos', route: '/calendario' },
    { label: 'Financeiro', route: '/financeiro' },
    { label: 'Configurações', route: '/configuracoes' }
  ]);

  readonly nome = computed(() => this.sessao.usuario()?.nome ?? '');
  readonly perfil = computed(() => {
    const usuario = this.sessao.usuario();
    return usuario ? ROTULO_PERFIL[usuario.perfil] : '';
  });
  readonly inicial = computed(() => this.nome().charAt(0).toUpperCase());
  readonly confirmandoSaida = signal(false);

  confirmarSaida(): void {
    this.confirmandoSaida.set(false);
    this.sessao.encerrar();
    void this.router.navigate(['/login']);
  }
}
