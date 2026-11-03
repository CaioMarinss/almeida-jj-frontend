import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ajj-estado-vazio',
  templateUrl: './estado-vazio.component.html',
  styleUrl: './estado-vazio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EstadoVazioComponent {
  readonly titulo = input.required<string>();
  readonly texto = input('');
}
