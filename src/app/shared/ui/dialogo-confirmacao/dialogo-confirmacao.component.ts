import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-dialogo-confirmacao',
  templateUrl: './dialogo-confirmacao.component.html',
  styleUrl: './dialogo-confirmacao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogoConfirmacaoComponent {
  readonly visible = input(false);
  readonly title = input('Confirmação');
  readonly message = input('Tem certeza que deseja continuar?');
  readonly confirmLabel = input('Sim');
  readonly cancelLabel = input('Não');

  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
