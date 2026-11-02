import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { LucideCalendarDays } from '@lucide/angular';
import { EstadoVazioComponent } from '../../shared/ui/estado-vazio/estado-vazio.component';

@Component({
  selector: 'app-aulas',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, EstadoVazioComponent, LucideCalendarDays],
  templateUrl: './aulas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AulasComponent {}
