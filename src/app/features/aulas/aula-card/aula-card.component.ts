import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AulaDoDia, ROTULO_MODALIDADE } from '../../../shared/agenda/agenda.model';

@Component({
  selector: 'app-aula-card',
  templateUrl: './aula-card.component.html',
  styleUrl: './aula-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AulaCardComponent {
  readonly aula = input.required<AulaDoDia>();
  readonly rotulo = ROTULO_MODALIDADE;
}
