import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonContent, IonHeader, IonModal, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { LucideTriangleAlert, LucideUsers } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { codigoDeErro } from '../../core/http/erro-api';
import { SessionService } from '../../core/auth/session.service';
import { Notificador } from '../../core/notificacao/notificador';
import { AulaDoDia, CLASSE_CHIP_MODALIDADE, ROTULO_MODALIDADE } from '../../shared/agenda/agenda.model';
import { AgendaService } from '../../shared/agenda/agenda.service';
import { DIAS_SEMANA_CURTOS, formatarDiaMes, inicioDaSemana, somarDias } from '../../shared/agenda/datas';
import { hojeEmSaoPaulo } from '../../shared/graduacao/descrever';
import { Chamada, PresencaDaAula, ROTULO_ORIGEM } from '../../shared/presenca/presenca.model';
import { PresencaService } from '../../shared/presenca/presenca.service';
import { BotaoComponent } from '../../shared/ui/botao/botao.component';
import { EstadoVazioComponent } from '../../shared/ui/estado-vazio/estado-vazio.component';
import { PessoaAcademia, ProfessoresService } from '../professores/professores.service';
import { IncluirAlunoComponent } from './incluir-aluno/incluir-aluno.component';

const NOMES_DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

@Component({
  selector: 'app-chamada',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonModal,
    IonSpinner,
    LucideTriangleAlert,
    LucideUsers,
    BotaoComponent,
    EstadoVazioComponent,
    IncluirAlunoComponent
  ],
  templateUrl: './chamada.component.html',
  styleUrl: './chamada.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChamadaComponent {
  private readonly agenda = inject(AgendaService);
  private readonly presenca = inject(PresencaService);
  private readonly pessoas = inject(ProfessoresService);
  private readonly sessao = inject(SessionService);
  private readonly notificador = inject(Notificador);

  readonly rotulo = ROTULO_MODALIDADE;
  readonly classeChip = CLASSE_CHIP_MODALIDADE;
  readonly rotuloOrigem = ROTULO_ORIGEM;

  readonly hoje = signal(hojeEmSaoPaulo());

  readonly dias = computed(() =>
    Array.from({ length: 14 }, (_, i) => {
      const data = somarDias(inicioDaSemana(this.hoje()), i - 7);
      const indice = i % 7;
      return {
        data,
        curto: DIAS_SEMANA_CURTOS[indice],
        numero: data.slice(8),
        rotulo: `${NOMES_DIAS[indice]}, ${formatarDiaMes(data)}`,
        hoje: data === this.hoje()
      };
    })
  );

  readonly selecionado = signal(this.hoje());
  readonly aulas = signal<AulaDoDia[]>([]);
  readonly idAula = signal<number | null>(null);
  readonly chamada = signal<Chamada | null>(null);
  readonly carregandoAulas = signal(true);
  readonly erroAulas = signal(false);
  readonly carregandoChamada = signal(false);
  readonly erroChamada = signal(false);
  readonly salvando = signal(false);
  readonly incluindo = signal(false);
  readonly alunos = signal<PessoaAcademia[] | null>(null);

  readonly aindaNaoAbriu = computed(() => this.selecionado() > this.hoje());
  readonly aula = computed(() => this.aulas().find(a => a.id === this.idAula()) ?? null);
  readonly podeIncluir = computed(() => (this.chamada()?.podeAjustar ?? false) && !(this.aula()?.cancelada ?? true));
  readonly candidatos = computed(() => {
    const presentes = new Set((this.chamada()?.presencas ?? []).map(p => p.idAluno));
    return (this.alunos() ?? []).filter(p => !presentes.has(p.id));
  });
  readonly prazo = computed(() => {
    const ate = this.chamada()?.ajustaAte;
    if (!ate) {
      return null;
    }
    const quem = this.sessao.usuario()?.perfil === 'DONO' ? 'Dono' : 'Professor';
    return `${quem} pode ajustar até ${formatarDiaMes(ate)}`;
  });

  private requisicaoAulas = 0;
  private requisicaoChamada = 0;
  private requisicaoContagem = 0;
  private primeiraEntrada = true;

  constructor() {
    void this.carregarAulas();
  }

  async ionViewWillEnter(): Promise<void> {
    if (this.primeiraEntrada) {
      this.primeiraEntrada = false;
      return;
    }
    this.hoje.set(hojeEmSaoPaulo());
    if (!this.dias().some(d => d.data === this.selecionado())) {
      this.selecionado.set(this.hoje());
      this.idAula.set(null);
      this.chamada.set(null);
      this.requisicaoChamada++;
    }
    this.alunos.set(null);
    await Promise.all([this.carregarAulas(), this.carregarChamada()]);
  }

  textoPresencas(aula: AulaDoDia): string {
    return aula.vao === 1 ? '1 presença' : `${aula.vao} presenças`;
  }

  quemRegistrou(p: PresencaDaAula): string | null {
    return p.origem === 'ALUNO' ? null : p.registradoPor;
  }

  async escolherDia(data: string): Promise<void> {
    if (data === this.selecionado() || this.salvando()) {
      return;
    }
    this.selecionado.set(data);
    this.idAula.set(null);
    this.chamada.set(null);
    this.requisicaoChamada++;
    await this.carregarAulas();
  }

  async escolherAula(aula: AulaDoDia): Promise<void> {
    if (this.salvando()) {
      return;
    }
    this.idAula.set(aula.id);
    this.chamada.set(null);
    await this.carregarChamada();
  }

  async carregarAulas(): Promise<void> {
    const id = ++this.requisicaoAulas;
    const data = this.selecionado();
    this.carregandoAulas.set(true);
    this.erroAulas.set(false);
    try {
      const dias = await firstValueFrom(this.agenda.agenda(data, data));
      if (id !== this.requisicaoAulas) {
        return;
      }
      this.aulas.set(dias.find(d => d.data === data)?.aulas ?? []);
      this.carregandoAulas.set(false);
    } catch (erro: unknown) {
      if (id !== this.requisicaoAulas) {
        return;
      }
      this.aulas.set([]);
      this.carregandoAulas.set(false);
      this.erroAulas.set(true);
      await this.notificador.erroDaApi(erro, 'Não foi possível carregar as aulas.');
    }
  }

  async carregarChamada(): Promise<void> {
    const aula = this.idAula();
    if (aula === null) {
      return;
    }
    const id = ++this.requisicaoChamada;
    this.carregandoChamada.set(true);
    this.erroChamada.set(false);
    try {
      const chamada = await firstValueFrom(this.presenca.chamada(this.selecionado(), aula));
      if (id !== this.requisicaoChamada) {
        return;
      }
      this.chamada.set(chamada);
      this.carregandoChamada.set(false);
    } catch (erro: unknown) {
      if (id !== this.requisicaoChamada) {
        return;
      }
      this.carregandoChamada.set(false);
      this.erroChamada.set(true);
      await this.notificador.erroDaApi(erro, 'Não foi possível carregar a chamada.');
    }
  }

  async tirar(presente: PresencaDaAula): Promise<void> {
    const aula = this.idAula();
    if (aula === null || this.salvando()) {
      return;
    }
    this.salvando.set(true);
    try {
      const confirmado = await this.notificador.confirmar(
        'Tirar presença',
        `Tirar ${presente.nome} desta aula?`,
        'Tirar'
      );
      if (!confirmado) {
        return;
      }
      await firstValueFrom(this.presenca.tirar(this.selecionado(), aula, presente.idAluno), {
        defaultValue: undefined
      });
      await this.notificador.sucesso(`${presente.nome} saiu da chamada.`);
      await this.recarregar();
    } catch (erro: unknown) {
      await this.notificador.erroDaApi(erro, 'Não foi possível tirar a presença.');
      await this.recarregarSeDesatualizada(erro);
    } finally {
      this.salvando.set(false);
    }
  }

  async abrirIncluir(): Promise<void> {
    if (this.alunos() === null) {
      try {
        this.alunos.set(await firstValueFrom(this.pessoas.listar()));
      } catch (erro: unknown) {
        await this.notificador.erroDaApi(erro, 'Não foi possível carregar os alunos.');
        return;
      }
    }
    this.incluindo.set(true);
  }

  fecharIncluir(): void {
    this.incluindo.set(false);
  }

  async incluir(pessoa: PessoaAcademia): Promise<void> {
    const aula = this.idAula();
    if (aula === null || this.salvando()) {
      return;
    }
    this.salvando.set(true);
    try {
      await firstValueFrom(this.presenca.incluir(this.selecionado(), aula, pessoa.id), {
        defaultValue: undefined
      });
      this.fecharIncluir();
      await this.notificador.sucesso(`${pessoa.nome} entrou na chamada.`);
      await this.recarregar();
    } catch (erro: unknown) {
      await this.notificador.erroDaApi(erro, 'Não foi possível incluir o aluno.');
      await this.recarregarSeDesatualizada(erro);
    } finally {
      this.salvando.set(false);
    }
  }

  private async recarregar(): Promise<void> {
    await Promise.all([this.carregarChamada(), this.atualizarContagem()]);
  }

  private async recarregarSeDesatualizada(erro: unknown): Promise<void> {
    const codigo = codigoDeErro(erro);
    if (codigo === 'ERR027' || codigo === 'ERR028' || codigo === 'ERR029') {
      this.fecharIncluir();
      await this.recarregar();
    }
  }

  private async atualizarContagem(): Promise<void> {
    const data = this.selecionado();
    const id = ++this.requisicaoContagem;
    try {
      const dias = await firstValueFrom(this.agenda.agenda(data, data));
      if (id === this.requisicaoContagem && data === this.selecionado()) {
        this.aulas.set(dias.find(d => d.data === data)?.aulas ?? []);
      }
    } catch {
      return;
    }
  }
}
