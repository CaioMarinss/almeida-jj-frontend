import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { LucideCircleCheck } from '@lucide/angular';
import { EstadoVazioComponent } from '../../shared/ui/estado-vazio/estado-vazio.component';

@Component({
  selector: 'app-presenca',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, EstadoVazioComponent, LucideCircleCheck],
  templateUrl: './presenca.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PresencaComponent {}
