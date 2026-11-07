import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BotaoComponent } from '../botao/botao.component';

@Component({
  selector: 'ajj-paginacao',
  imports: [BotaoComponent],
  templateUrl: './paginacao.component.html',
  styleUrl: './paginacao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaginacaoComponent {
  readonly pagina = input.required<number>();
  readonly totalPaginas = input.required<number>();

  readonly paginaChange = output<number>();
}
