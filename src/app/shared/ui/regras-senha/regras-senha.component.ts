import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { REGRAS_SENHA } from '../../validators/senha-forte.validator';

@Component({
  selector: 'ajj-regras-senha',
  templateUrl: './regras-senha.component.html',
  styleUrl: './regras-senha.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegrasSenhaComponent {
  readonly senha = input('');

  readonly regras = computed(() => {
    const senha = this.senha();
    return REGRAS_SENHA.map(regra => ({ id: regra.id, rotulo: regra.rotulo, cumprida: regra.cumpre(senha) }));
  });
}
