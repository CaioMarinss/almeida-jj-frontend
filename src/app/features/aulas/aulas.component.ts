import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { LucideCalendarDays, LucideChevronLeft, LucideChevronRight, LucideTriangleAlert } from '@lucide/angular';
import { AgendaService } from '../../shared/agenda/agenda.service';
import { codigoDeErro } from '../../core/http/erro-api';
import { Notificador } from '../../core/notificacao/notificador';
import { AulaDoDia, DiaAgenda } from '../../shared/agenda/agenda.model';
import { DIAS_SEMANA_CURTOS, diaSemanaIso, formatarDiaMes, inicioDaSemana, somarDias } from '../../shared/agenda/datas';
import { hojeEmSaoPaulo } from '../../shared/graduacao/descrever';
import { PresencaService } from '../../shared/presenca/presenca.service';
import { aplicarPresenca } from '../../shared/presenca/vou';
import { BotaoComponent } from '../../shared/ui/botao/botao.component';
import { EstadoVazioComponent } from '../../shared/ui/estado-vazio/estado-vazio.component';
import { AulaCardComponent } from './aula-card/aula-card.component';

const SEMANAS_A_FRENTE = 4;
const NOMES_DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

@Component({
  selector: 'app-aulas',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSpinner,
    LucideCalendarDays,
    LucideChevronLeft,
    LucideChevronRight,
    LucideTriangleAlert,
    BotaoComponent,
    EstadoVazioComponent,
    AulaCardComponent
  ],
  templateUrl: './aulas.component.html',
  styleUrl: './aulas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AulasComponent {
  private readonly service = inject(AgendaService);
  private readonly presenca = inject(PresencaService);
  private readonly notificador = inject(Notificador);

  private readonly hoje = signal(hojeEmSaoPaulo());
  private readonly semanaAtual = computed(() => inicioDaSemana(this.hoje()));
  private readonly ultimaSemana = computed(() => somarDias(this.semanaAtual(), SEMANAS_A_FRENTE * 7));

  readonly semana = signal(this.semanaAtual());
  readonly selecionado = signal(this.hoje());
  readonly dias = signal<DiaAgenda[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly salvando = signal<ReadonlySet<string>>(new Set());

  readonly semanaAnteriorBloqueada = computed(() => this.semana() <= this.semanaAtual());
  readonly proximaSemanaBloqueada = computed(() => this.semana() >= this.ultimaSemana());
  readonly intervalo = computed(() => `${formatarDiaMes(this.semana())} a ${formatarDiaMes(somarDias(this.semana(), 6))}`);

  readonly tira = computed(() =>
    DIAS_SEMANA_CURTOS.map((curto, i) => {
      const data = somarDias(this.semana(), i);
      return {
        data,
        curto,
        numero: data.slice(8),
        rotulo: `${NOMES_DIAS[i]}, ${formatarDiaMes(data)}`,
        hoje: data === this.hoje()
      };
    })
  );

  readonly diaAtual = computed(() => this.dias().find(d => d.data === this.selecionado()) ?? null);

  private requisicao = 0;

  ionViewWillEnter(): void {
    this.hoje.set(hojeEmSaoPaulo());
    if (this.selecionado() < this.hoje()) {
      this.semana.set(this.semanaAtual());
      this.selecionado.set(this.hoje());
    }
    this.carregar();
  }

  selecionar(data: string): void {
    this.selecionado.set(data);
  }

  mudarSemana(delta: number): void {
    const nova = somarDias(this.semana(), delta * 7);
    if (nova < this.semanaAtual() || nova > this.ultimaSemana()) {
      return;
    }
    const diaDaSemana = diaSemanaIso(this.selecionado());
    this.semana.set(nova);
    this.selecionado.set(somarDias(nova, diaDaSemana - 1));
    this.carregar();
  }

  estaSalvando(data: string, aula: AulaDoDia): boolean {
    return this.salvando().has(`${data}#${aula.id}`);
  }

  alternarPresenca(data: string, aula: AulaDoDia): void {
    const chave = `${data}#${aula.id}`;
    if (this.salvando().has(chave)) {
      return;
    }
    this.salvando.update(s => new Set(s).add(chave));
    const marcar = !aula.euVou;
    const chamada = marcar ? this.presenca.marcar(data, aula.id) : this.presenca.desmarcar(data, aula.id);
    chamada.subscribe({
      next: () => {
        this.dias.update(dias =>
          dias.map(d => (d.data === data ? { ...d, aulas: d.aulas.map(a => (a.id === aula.id ? aplicarPresenca(a, marcar) : a)) } : d))
        );
        this.liberar(chave);
      },
      error: erro => {
        this.liberar(chave);
        const codigo = codigoDeErro(erro);
        if (codigo === 'ERR027' || codigo === 'ERR028') {
          const euVou = codigo === 'ERR027';
          this.dias.update(dias =>
            dias.map(d => (d.data === data ? { ...d, aulas: d.aulas.map(a => (a.id === aula.id ? { ...a, euVou } : a)) } : d))
          );
        } else if (codigo === 'ERR026' || codigo === 'ERR021') {
          this.carregar();
        }
        void this.notificador.erroDaApi(erro);
      }
    });
  }

  private liberar(chave: string): void {
    this.salvando.update(s => {
      const novo = new Set(s);
      novo.delete(chave);
      return novo;
    });
  }

  carregar(): void {
    const id = ++this.requisicao;
    const inicio = this.semana();
    this.carregando.set(true);
    this.erro.set(false);
    this.service.agenda(inicio, somarDias(inicio, 6)).subscribe({
      next: dias => {
        if (id !== this.requisicao) {
          return;
        }
        this.dias.set(dias);
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
