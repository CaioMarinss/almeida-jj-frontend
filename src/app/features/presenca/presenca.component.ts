import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { LucideCircleCheck, LucideTriangleAlert } from '@lucide/angular';
import { MinhasPresencas } from '../../shared/presenca/presenca.model';
import { itemDePresenca, resumirCiclo, ResumoCiclo } from '../../shared/presenca/resumo';
import { pluralPresencas } from '../../shared/presenca/plural';
import { PresencaService } from '../../shared/presenca/presenca.service';
import { BotaoComponent } from '../../shared/ui/botao/botao.component';
import { EstadoVazioComponent } from '../../shared/ui/estado-vazio/estado-vazio.component';

const LIMITE_INICIAL = 10;

@Component({
  selector: 'app-presenca',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSpinner,
    LucideCircleCheck,
    LucideTriangleAlert,
    BotaoComponent,
    EstadoVazioComponent
  ],
  templateUrl: './presenca.component.html',
  styleUrl: './presenca.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PresencaComponent {
  private readonly service = inject(PresencaService);

  readonly dados = signal<MinhasPresencas | null>(null);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly expandido = signal(false);

  readonly resumo = computed<ResumoCiclo | null>(() => {
    const dados = this.dados();
    if (!dados) {
      return null;
    }
    if (dados.ciclo) {
      return resumirCiclo(dados.ciclo);
    }
    return { titulo: `${pluralPresencas(dados.presencas.length)} contadas`, trilha: '', desde: '', faltam: null, progresso: null };
  });

  private readonly itens = computed(() => (this.dados()?.presencas ?? []).map(itemDePresenca));
  readonly visiveis = computed(() => (this.expandido() ? this.itens() : this.itens().slice(0, LIMITE_INICIAL)));
  readonly temMais = computed(() => !this.expandido() && this.itens().length > LIMITE_INICIAL);

  private requisicao = 0;

  ionViewWillEnter(): void {
    this.carregar();
  }

  verTodas(): void {
    this.expandido.set(true);
  }

  carregar(): void {
    const id = ++this.requisicao;
    this.carregando.set(true);
    this.erro.set(false);
    this.service.minhas().subscribe({
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
