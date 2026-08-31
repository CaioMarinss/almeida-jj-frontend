import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BasePageComponent } from '../../components/base-page/base-page.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BasePageComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  userName = 'Maria Almeida';
  role = 'Aluno';

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
