import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-layout-auth',
  templateUrl: './layout-auth.component.html',
  styleUrl: './layout-auth.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutAuthComponent {
  readonly title = input('');
  readonly primeiroBotao = input('');
  readonly segundoBotao = input('');
  readonly primeiroBotaoDesabilitado = input(false);

  readonly submit = output<void>();
  readonly navigate = output<void>();
}
