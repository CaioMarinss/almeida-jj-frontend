import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { ContadoresDonoService } from '../../core/dono/contadores-dono.service';
import { AptosComponent } from './aptos/aptos.component';
import { ProximaGraduacaoComponent } from './proxima-graduacao/proxima-graduacao.component';

@Component({
  selector: 'app-graduacao',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, AptosComponent, ProximaGraduacaoComponent],
  templateUrl: './graduacao.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraduacaoComponent {
  private readonly contadores = inject(ContadoresDonoService);
  private readonly proxima = viewChild.required(ProximaGraduacaoComponent);
  private readonly aptos = viewChild.required(AptosComponent);

  abrirAlterar(): void {
    this.proxima().abrir();
  }

  aoAlterarEvento(): void {
    this.aptos().carregar();
    void this.contadores.atualizar();
  }
}
