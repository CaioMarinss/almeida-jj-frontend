import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AulaDoDia, CLASSE_CHIP_MODALIDADE, ROTULO_MODALIDADE } from '../../../shared/agenda/agenda.model';
import { BotaoVouComponent } from '../../../shared/presenca/botao-vou/botao-vou.component';
import { textoVao } from '../../../shared/presenca/vou';

@Component({
  selector: 'app-aula-card',
  imports: [BotaoVouComponent],
  templateUrl: './aula-card.component.html',
  styleUrl: './aula-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AulaCardComponent {
  readonly aula = input.required<AulaDoDia>();
  readonly salvando = input(false);
  readonly alternar = output<AulaDoDia>();
  readonly contador = computed(() => textoVao(this.aula()));
  readonly rotulo = ROTULO_MODALIDADE;
  readonly classeChip = CLASSE_CHIP_MODALIDADE;
}
