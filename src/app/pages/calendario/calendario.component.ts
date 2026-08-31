import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BasePageComponent } from '../../components/base-page/base-page.component';

interface Aula {
  horario: string;
  nome: string;
  professor: string;
  modalidade: string;
  vagas: number;
  confirmado: boolean;
}

@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, BasePageComponent],
  templateUrl: './calendario.component.html',
  styleUrl: './calendario.component.scss'
})
export class CalendarioComponent {
  userName = 'Maria Almeida';
  role = 'Aluno';

  currentDate = new Date();
  selectedDate = new Date(2026, 7, 12);

  weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  calendarDays = [
    { day: 1, isCurrentMonth: false },
    { day: 2, isCurrentMonth: false },
    { day: 3, isCurrentMonth: false },
    { day: 4, isCurrentMonth: false },
    { day: 5, isCurrentMonth: false },
    { day: 6, isCurrentMonth: false },
    { day: 7, isCurrentMonth: true },
    { day: 8, isCurrentMonth: true },
    { day: 9, isCurrentMonth: true },
    { day: 10, isCurrentMonth: true },
    { day: 11, isCurrentMonth: true },
    { day: 12, isCurrentMonth: true, hasClass: true },
    { day: 13, isCurrentMonth: true },
    { day: 14, isCurrentMonth: true },
    { day: 15, isCurrentMonth: true },
    { day: 16, isCurrentMonth: true },
    { day: 17, isCurrentMonth: true },
    { day: 18, isCurrentMonth: true },
    { day: 19, isCurrentMonth: true },
    { day: 20, isCurrentMonth: true },
    { day: 21, isCurrentMonth: true },
    { day: 22, isCurrentMonth: true },
    { day: 23, isCurrentMonth: true },
    { day: 24, isCurrentMonth: true },
    { day: 25, isCurrentMonth: true },
    { day: 26, isCurrentMonth: true },
    { day: 27, isCurrentMonth: true },
    { day: 28, isCurrentMonth: true },
    { day: 29, isCurrentMonth: true },
    { day: 30, isCurrentMonth: true },
    { day: 31, isCurrentMonth: true }
  ];

  aulas: Record<string, Aula[]> = {
    '2026-08-12': [
      { horario: '06:00', nome: 'Musculação', professor: 'Carlos', modalidade: 'Força', vagas: 6, confirmado: true },
      { horario: '08:30', nome: 'Funcional', professor: 'Ana', modalidade: 'Cardio', vagas: 4, confirmado: false },
      { horario: '18:00', nome: 'Pilates', professor: 'Bruna', modalidade: 'Mobilidade', vagas: 3, confirmado: false }
    ],
    '2026-08-13': [
      { horario: '07:00', nome: 'Circuito', professor: 'Renato', modalidade: 'HIIT', vagas: 5, confirmado: false },
      { horario: '17:30', nome: 'Yoga', professor: 'Lívia', modalidade: 'Alongamento', vagas: 2, confirmado: false }
    ],
    '2026-08-15': [
      { horario: '06:30', nome: 'CrossFit', professor: 'Diego', modalidade: 'Alta intensidade', vagas: 7, confirmado: false },
      { horario: '19:00', nome: 'Spinning', professor: 'Fernanda', modalidade: 'Cardio', vagas: 8, confirmado: true }
    ]
  };

  selectedDateKey = '2026-08-12';

  get selectedDayAulas(): Aula[] {
    return this.aulas[this.selectedDateKey] ?? [];
  }

  selectDay(day: number): void {
    this.selectedDate = new Date(2026, 7, day);
    this.selectedDateKey = this.formatDateKey(this.selectedDate);
  }

  formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  togglePresenca(aula: Aula): void {
    aula.confirmado = !aula.confirmado;
  }
}
