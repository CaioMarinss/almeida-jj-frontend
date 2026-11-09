import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AulaDoDia } from '../../agenda/agenda.model';

@Component({
  selector: 'app-botao-vou',
  templateUrl: './botao-vou.component.html',
  styleUrl: './botao-vou.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BotaoVouComponent {
  readonly aula = input.required<AulaDoDia>();
  readonly salvando = input(false);
  readonly alternar = output<AulaDoDia>();

  readonly situacao = computed(() => {
    const aula = this.aula();
    if (aula.cancelada || aula.podeMarcar || !aula.janelaFechada) {
      return null;
    }
    return aula.euVou ? 'Presença contada' : 'Janela fechada';
  });
}
