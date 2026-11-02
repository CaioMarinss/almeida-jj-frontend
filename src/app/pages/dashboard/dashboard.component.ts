import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LayoutAppComponent } from '../../shared/ui/layout-app/layout-app.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LayoutAppComponent],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  userName = sessionStorage.getItem('username') ?? 'User';
  role = sessionStorage.getItem('user-is-admin') === 'true' ? 'Admin' : 'Aluno';

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
