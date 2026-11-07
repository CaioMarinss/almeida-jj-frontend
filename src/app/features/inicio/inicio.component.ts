import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { SessionService } from '../../core/auth/session.service';
import { BotaoComponent } from '../../shared/ui/botao/botao.component';
import { AreaDonoComponent } from './area-dono/area-dono.component';
import { CardGraduacaoComponent } from './card-graduacao/card-graduacao.component';

@Component({
  selector: 'app-inicio',
  imports: [IonContent, BotaoComponent, CardGraduacaoComponent, AreaDonoComponent],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InicioComponent {
  private readonly sessao = inject(SessionService);

  readonly primeiroNome = computed(() => (this.sessao.usuario()?.nome ?? '').trim().split(/\s+/)[0].toUpperCase());
  readonly ehDono = computed(() => this.sessao.usuario()?.perfil === 'DONO');
  readonly inicial = computed(() => this.primeiroNome().charAt(0));
}
