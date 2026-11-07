import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { descreverGraduacao } from '../../graduacao/descrever';
import { Faixa } from '../../graduacao/graduacao.model';

const BLOCOS_CORAL = 12;
const PONTA_PRETA = '#0a0a0a';
const PONTA_FAIXA_PRETA = '#D32F2F';

@Component({
  selector: 'ajj-barra-faixa',
  templateUrl: './barra-faixa.component.html',
  styleUrl: './barra-faixa.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BarraFaixaComponent {
  readonly faixa = input.required<Faixa>();
  readonly grau = input(0);

  readonly mestre = computed(() => this.faixa().categoria === 'MESTRE');
  readonly coral = computed(() => this.mestre() && this.faixa().corSecundaria !== null);
  readonly combinadaInfantil = computed(() => this.faixa().categoria === 'INFANTIL' && this.faixa().corSecundaria !== null);

  readonly grausValidos = computed(() => {
    if (this.mestre()) {
      return 0;
    }
    return Math.min(this.faixa().grauMax, Math.max(0, Math.trunc(this.grau())));
  });
  readonly listaGraus = computed(() => Array.from({ length: this.grausValidos() }, (_, i) => i));
  readonly blocos = computed(() => {
    const { corPrincipal, corSecundaria } = this.faixa();
    return Array.from({ length: BLOCOS_CORAL }, (_, i) => (i % 2 === 0 ? corPrincipal : (corSecundaria ?? corPrincipal)));
  });
  readonly corPonta = computed(() => (this.faixa().codigo === 'FP' ? PONTA_FAIXA_PRETA : PONTA_PRETA));
  readonly rotulo = computed(() => descreverGraduacao(this.faixa(), this.grau()));
}
