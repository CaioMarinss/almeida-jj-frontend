import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavController } from '@ionic/angular';
import { BotaoComponent } from '../../../shared/ui/botao/botao.component';

@Component({
  selector: 'app-area-dono',
  imports: [BotaoComponent],
  templateUrl: './area-dono.component.html',
  styleUrl: './area-dono.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AreaDonoComponent {
  private readonly nav = inject(NavController);

  abrirProfessores(): Promise<boolean> {
    return this.nav.navigateForward('/app/professores');
  }

  abrirAgenda(): Promise<boolean> {
    return this.nav.navigateForward('/app/agenda');
  }

  abrirGraduacoes(): Promise<boolean> {
    return this.nav.navigateForward('/app/graduacao');
  }
}
