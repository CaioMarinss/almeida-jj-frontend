import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { LucideTriangleAlert, LucideUserX } from '@lucide/angular';
import { formatarDiaMes } from '../../shared/agenda/datas';
import { Sumidos } from '../../shared/presenca/presenca.model';
import { PresencaService } from '../../shared/presenca/presenca.service';
import { BotaoComponent } from '../../shared/ui/botao/botao.component';
import { EstadoVazioComponent } from '../../shared/ui/estado-vazio/estado-vazio.component';

@Component({
  selector: 'app-sumidos',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, LucideTriangleAlert, LucideUserX, BotaoComponent, EstadoVazioComponent],
  templateUrl: './sumidos.component.html',
  styleUrl: './sumidos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SumidosComponent {
  private readonly service = inject(PresencaService);

  readonly dados = signal<Sumidos | null>(null);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly diaMes = formatarDiaMes;

  private requisicao = 0;

  ionViewWillEnter(): void {
    this.carregar();
  }

  carregar(): void {
    const id = ++this.requisicao;
    this.carregando.set(true);
    this.erro.set(false);
    this.service.sumidos().subscribe({
      next: dados => {
        if (id !== this.requisicao) {
          return;
        }
        this.dados.set(dados);
        this.carregando.set(false);
      },
      error: () => {
        if (id !== this.requisicao) {
          return;
        }
        this.carregando.set(false);
        this.erro.set(true);
      }
    });
  }
}
