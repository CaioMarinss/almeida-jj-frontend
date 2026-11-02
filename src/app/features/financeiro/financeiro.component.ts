import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { LucideWallet } from '@lucide/angular';
import { EstadoVazioComponent } from '../../shared/ui/estado-vazio/estado-vazio.component';

@Component({
  selector: 'app-financeiro',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, EstadoVazioComponent, LucideWallet],
  templateUrl: './financeiro.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FinanceiroComponent {}
