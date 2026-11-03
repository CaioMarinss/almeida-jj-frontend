import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'ajj-barra-faixa',
  templateUrl: './barra-faixa.component.html',
  styleUrl: './barra-faixa.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BarraFaixaComponent {
  readonly cor = input.required<string>();
  readonly graus = input(0);
  readonly descricao = input.required<string>();

  readonly grausValidos = computed(() => Math.min(4, Math.max(0, Math.trunc(this.graus()))));
  readonly listaGraus = computed(() => Array.from({ length: this.grausValidos() }, (_, i) => i));
  readonly rotulo = computed(() => {
    const n = this.grausValidos();
    return `${this.descricao()}, ${n} ${n === 1 ? 'grau' : 'graus'}`;
  });
}
