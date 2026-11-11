import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonLabel, IonSegment, IonSegmentButton, IonTitle, IonToolbar } from '@ionic/angular';
import { ExcecoesComponent } from './excecoes/excecoes.component';
import { GradeSemanalComponent } from './grade-semanal/grade-semanal.component';

export type AbaAgenda = 'grade' | 'excecoes';

@Component({
  selector: 'app-agenda',
  imports: [IonBackButton, IonButtons, IonHeader, IonToolbar, IonTitle, IonContent, IonLabel, IonSegment, IonSegmentButton, GradeSemanalComponent, ExcecoesComponent],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgendaComponent {
  readonly aba = signal<AbaAgenda>('grade');

  mudarAba(aba: AbaAgenda): void {
    this.aba.set(aba);
  }

  aoMudarSegmento(valor: unknown): void {
    if (valor === 'grade' || valor === 'excecoes') {
      this.mudarAba(valor);
    }
  }
}
