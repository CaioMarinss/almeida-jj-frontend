import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IonButton, IonSpinner } from '@ionic/angular';

type Variante = 'primario' | 'secundario' | 'texto';

@Component({
  selector: 'ajj-botao',
  imports: [IonButton, IonSpinner],
  templateUrl: './botao.component.html',
  styleUrl: './botao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BotaoComponent {
  readonly variante = input<Variante>('primario');
  readonly carregando = input(false);
  readonly desabilitado = input(false);
  readonly tipo = input<'button' | 'submit'>('button');

  readonly clique = output<void>();

  readonly preenchimento = computed(() =>
    this.variante() === 'primario' ? 'solid' : this.variante() === 'secundario' ? 'outline' : 'clear'
  );
  readonly bloqueado = computed(() => this.carregando() || this.desabilitado());

  aoClicar(): void {
    if (!this.bloqueado()) {
      this.clique.emit();
    }
  }
}
