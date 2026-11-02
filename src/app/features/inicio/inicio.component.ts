import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SessionService } from '../../core/auth/session.service';
import { LayoutAppComponent } from '../../shared/ui/layout-app/layout-app.component';

@Component({
  selector: 'app-inicio',
  imports: [CommonModule, LayoutAppComponent],
  templateUrl: './inicio.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './inicio.component.scss'
})
export class InicioComponent {
  private readonly sessao = inject(SessionService);
  readonly nome = computed(() => this.sessao.usuario()?.nome ?? '');

  metrics = [
    { label: 'Treinos concluídos', value: '18', tone: 'primary' },
    { label: 'Faltas', value: '02', tone: 'warning' },
    { label: 'Presença', value: '96%', tone: 'accent' },
    { label: 'Próximo treino', value: '12/09', tone: 'neutral' }
  ];

  quickActions = [
    'Meu progresso',
    'Agenda',
    'Treinos',
    'Configurações'
  ];

  recentItems = [
    { title: 'Nova rotina de hipertrofia liberada', meta: 'Hoje • 9:30' },
    { title: 'Seu plano foi atualizado', meta: 'Ontem • 16:10' },
    { title: 'Check-in confirmado na academia', meta: 'Segunda • 11:45' }
  ];
}
