import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { LucideCircleCheck, LucideTriangleAlert } from '@lucide/angular';
import { ROTULO_MODALIDADE } from '../../shared/agenda/agenda.model';
import { DIAS_SEMANA_CURTOS, diaSemanaIso, formatarDiaMes } from '../../shared/agenda/datas';
import { CicloPresenca, MinhasPresencas, PresencaContada, ROTULO_ORIGEM } from '../../shared/presenca/presenca.model';
import { PresencaService } from '../../shared/presenca/presenca.service';
import { BotaoComponent } from '../../shared/ui/botao/botao.component';
import { EstadoVazioComponent } from '../../shared/ui/estado-vazio/estado-vazio.component';

const LIMITE_INICIAL = 10;

interface ItemPresenca {
  chave: string;
  dia: string;
  aula: string;
  origem: string;
}

interface ResumoCiclo {
  titulo: string;
  trilha: string;
  desde: string;
  faltam: string | null;
  progresso: { atual: number; maximo: number; percentual: number } | null;
}

function capitalizar(texto: string): string {
  return texto.charAt(0) + texto.slice(1).toLowerCase();
}

function plural(n: number): string {
  return n === 1 ? '1 presença' : `${n} presenças`;
}

function resumir(ciclo: CicloPresenca): ResumoCiclo {
  const desde = ciclo.desde ? `contando desde ${formatarDiaMes(ciclo.desde)}` : 'contando desde o início';
  const trilha = ciclo.trilha === 'FAIXA' ? 'troca de faixa' : 'troca de grau';
  const base = { trilha, desde, faltam: null, progresso: null };
  if (!ciclo.ate) {
    const quando = ciclo.desde ? `desde ${formatarDiaMes(ciclo.desde)}` : 'contadas';
    return { ...base, titulo: `${plural(ciclo.contadas)} ${quando}` };
  }
  if (ciclo.minimo === null) {
    return { ...base, titulo: `${plural(ciclo.contadas)} · mínimo não definido` };
  }
  const falta = Math.max(ciclo.minimo - ciclo.contadas, 0);
  const percentual = ciclo.minimo > 0 ? Math.min(Math.round((ciclo.contadas / ciclo.minimo) * 100), 100) : 100;
  return {
    ...base,
    titulo: `${ciclo.contadas} de ${ciclo.minimo} presenças até a graduação de ${formatarDiaMes(ciclo.ate)}`,
    faltam: falta > 0 ? `Faltam ${falta}` : 'Você já atingiu o mínimo',
    progresso: { atual: ciclo.contadas, maximo: ciclo.minimo, percentual }
  };
}

function itemDe(p: PresencaContada): ItemPresenca {
  return {
    chave: `${p.data}#${p.inicio}#${p.modalidade}`,
    dia: `${capitalizar(DIAS_SEMANA_CURTOS[diaSemanaIso(p.data) - 1])} ${formatarDiaMes(p.data)}`,
    aula: `${p.inicio} ${ROTULO_MODALIDADE[p.modalidade]}`,
    origem: ROTULO_ORIGEM[p.origem]
  };
}

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
      return resumir(dados.ciclo);
    }
    return { titulo: `${plural(dados.presencas.length)} contadas`, trilha: '', desde: '', faltam: null, progresso: null };
  });

  private readonly itens = computed(() => (this.dados()?.presencas ?? []).map(itemDe));
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
