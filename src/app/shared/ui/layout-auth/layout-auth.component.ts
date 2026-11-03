import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IonContent } from '@ionic/angular';

@Component({
  selector: 'app-layout-auth',
  imports: [IonContent],
  templateUrl: './layout-auth.component.html',
  styleUrl: './layout-auth.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutAuthComponent {
  readonly titulo = input.required<string>();
  readonly subtitulo = input('');
}
