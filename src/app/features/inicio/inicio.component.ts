import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonContent, NavController } from '@ionic/angular';
import { SessionService } from '../../core/auth/session.service';
import { codigoDeErro } from '../../core/http/erro-api';
import { Notificador } from '../../core/notificacao/notificador';
import { BotaoComponent } from '../../shared/ui/botao/botao.component';
import { AulaDoDia, CLASSE_CHIP_MODALIDADE, ROTULO_MODALIDADE } from '../../shared/agenda/agenda.model';
import { AgendaService } from '../../shared/agenda/agenda.service';
import { diaSemanaIso, formatarDiaMes, inicioDaSemana, somarDias } from '../../shared/agenda/datas';
import { hojeEmSaoPaulo } from '../../shared/graduacao/descrever';
import { BotaoVouComponent } from '../../shared/presenca/botao-vou/botao-vou.component';
import { PresencaService } from '../../shared/presenca/presenca.service';
import { aplicarPresenca, textoVao } from '../../shared/presenca/vou';
import { AreaDonoComponent } from './area-dono/area-dono.component';
import { CardGraduacaoComponent } from './card-graduacao/card-graduacao.component';

const NOMES_DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

@Component({
  selector: 'app-inicio',
  imports: [IonContent, BotaoComponent, BotaoVouComponent, CardGraduacaoComponent, AreaDonoComponent],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InicioComponent {
  private readonly sessao = inject(SessionService);
  private readonly agenda = inject(AgendaService);
  private readonly presenca = inject(PresencaService);
  private readonly notificador = inject(Notificador);
  private readonly nav = inject(NavController);

  readonly proxima = signal<{ data: string; aula: AulaDoDia } | null>(null);
  readonly salvando = signal(false);
  readonly rotulo = ROTULO_MODALIDADE;
  readonly classeChip = CLASSE_CHIP_MODALIDADE;
  readonly contador = computed(() => {
    const p = this.proxima();
    return p ? textoVao(p.aula) : null;
  });
  readonly quando = computed(() => {
    const p = this.proxima();
    return p ? `${NOMES_DIAS[diaSemanaIso(p.data) - 1]}, ${formatarDiaMes(p.data)}` : '';
  });

  private requisicao = 0;

  readonly primeiroNome = computed(() => (this.sessao.usuario()?.nome ?? '').trim().split(/\s+/)[0].toUpperCase());
  readonly ehDono = computed(() => this.sessao.usuario()?.perfil === 'DONO');
  readonly ehProfessor = computed(() => {
    const perfil = this.sessao.usuario()?.perfil;
    return perfil === 'PROFESSOR' || perfil === 'DONO';
  });
  readonly inicial = computed(() => this.primeiroNome().charAt(0));

  ionViewWillEnter(): void {
    const id = ++this.requisicao;
    const hoje = hojeEmSaoPaulo();
    this.agenda.agenda(hoje, somarDias(inicioDaSemana(hoje), 6)).subscribe({
      next: dias => {
        if (id !== this.requisicao) {
          return;
        }
        for (const dia of dias) {
          const aula = dia.data >= hoje ? dia.aulas.find(a => a.podeMarcar && !a.cancelada) : undefined;
          if (aula) {
            this.proxima.set({ data: dia.data, aula });
            return;
          }
        }
        this.proxima.set(null);
      },
      error: () => {
        if (id === this.requisicao) {
          this.proxima.set(null);
        }
      }
    });
  }

  abrirChamada(): Promise<boolean> {
    return this.nav.navigateForward('/app/chamada');
  }

  alternarPresenca(aula: AulaDoDia): void {
    const atual = this.proxima();
    if (!atual || this.salvando()) {
      return;
    }
    this.salvando.set(true);
    const marcar = !aula.euVou;
    const chamada = marcar ? this.presenca.marcar(atual.data, aula.id) : this.presenca.desmarcar(atual.data, aula.id);
    chamada.subscribe({
      next: () => {
        this.proxima.set({ data: atual.data, aula: aplicarPresenca(aula, marcar) });
        this.salvando.set(false);
      },
      error: erro => {
        this.salvando.set(false);
        const codigo = codigoDeErro(erro);
        if (codigo === 'ERR027' || codigo === 'ERR028') {
          this.proxima.set({ data: atual.data, aula: { ...aula, euVou: codigo === 'ERR027' } });
        } else if (codigo === 'ERR026' || codigo === 'ERR021') {
          this.ionViewWillEnter();
        }
        void this.notificador.erroDaApi(erro);
      }
    });
  }
}
