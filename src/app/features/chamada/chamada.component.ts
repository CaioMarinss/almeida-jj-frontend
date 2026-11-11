import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonContent, IonHeader, IonModal, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { LucideChevronLeft, LucideChevronRight, LucideTriangleAlert, LucideUsers } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { codigoDeErro } from '../../core/http/erro-api';
import { SessionService } from '../../core/auth/session.service';
import { Notificador } from '../../core/notificacao/notificador';
import { AulaDoDia, CLASSE_CHIP_MODALIDADE, ROTULO_MODALIDADE } from '../../shared/agenda/agenda.model';
import { AgendaService } from '../../shared/agenda/agenda.service';
import { DIAS_SEMANA_CURTOS, diaSemanaIso, formatarDiaMes, inicioDaSemana, somarDias } from '../../shared/agenda/datas';
import { hojeEmSaoPaulo } from '../../shared/graduacao/descrever';
import { Chamada, PresencaDaAula, ROTULO_ORIGEM } from '../../shared/presenca/presenca.model';
import { PresencaService } from '../../shared/presenca/presenca.service';
import { BotaoComponent } from '../../shared/ui/botao/botao.component';
import { EstadoVazioComponent } from '../../shared/ui/estado-vazio/estado-vazio.component';
import { PessoaAcademia } from '../../shared/alunos/alunos.model';
import { AlunosService } from '../../shared/alunos/alunos.service';
import { IncluirAlunoComponent } from './incluir-aluno/incluir-aluno.component';

const NOMES_DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const SEMANAS_SEM_LIMITE = 12;

@Component({
  selector: 'app-chamada',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonModal,
    IonSpinner,
    LucideChevronLeft,
    LucideChevronRight,
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
  private readonly pessoas = inject(AlunosService);
  private readonly sessao = inject(SessionService);
  private readonly notificador = inject(Notificador);

  readonly rotulo = ROTULO_MODALIDADE;
  readonly classeChip = CLASSE_CHIP_MODALIDADE;
  readonly rotuloOrigem = ROTULO_ORIGEM;

  readonly hoje = signal(hojeEmSaoPaulo());

  readonly ajustaDesde = signal<string | null | undefined>(undefined);
  private readonly semanaAtual = computed(() => inicioDaSemana(this.hoje()));
  private readonly primeiraSemana = computed(() => {
    const anterior = somarDias(this.semanaAtual(), -7);
    const desde = this.ajustaDesde();
    if (desde === undefined) {
      return anterior;
    }
    if (desde === null) {
      return somarDias(this.semanaAtual(), -7 * SEMANAS_SEM_LIMITE);
    }
    const doPrazo = inicioDaSemana(desde);
    return doPrazo < anterior ? doPrazo : anterior;
  });

  readonly semana = signal(this.semanaAtual());
  readonly semanaAnteriorBloqueada = computed(() => this.salvando() || this.semana() <= this.primeiraSemana());
  readonly proximaSemanaBloqueada = computed(() => this.salvando() || this.semana() >= this.semanaAtual());
  readonly intervalo = computed(() =>
    this.semana() === this.semanaAtual()
      ? 'Esta semana'
      : `${formatarDiaMes(this.semana())} a ${formatarDiaMes(somarDias(this.semana(), 6))}`
  );

  readonly dias = computed(() =>
    Array.from({ length: 7 }, (_, i) => {
      const data = somarDias(this.semana(), i);
      return {
        data,
        curto: DIAS_SEMANA_CURTOS[i],
        numero: data.slice(8),
        rotulo: `${NOMES_DIAS[i]}, ${formatarDiaMes(data)}`,
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
  private requisicaoPrazo = 0;
  private primeiraEntrada = true;

  constructor() {
    void this.carregarAulas();
    void this.carregarPrazo();
  }

  async ionViewWillEnter(): Promise<void> {
    if (this.primeiraEntrada) {
      this.primeiraEntrada = false;
      return;
    }
    this.hoje.set(hojeEmSaoPaulo());
    if (!this.salvando() && (this.semana() < this.primeiraSemana() || this.semana() > this.semanaAtual())) {
      this.semana.set(this.semanaAtual());
      this.selecionado.set(this.hoje());
      this.idAula.set(null);
      this.chamada.set(null);
      this.requisicaoChamada++;
    }
    this.alunos.set(null);
    await Promise.all([this.carregarAulas(), this.carregarChamada(), this.carregarPrazo()]);
  }

  async mudarSemana(delta: number): Promise<void> {
    const nova = somarDias(this.semana(), delta * 7);
    if (this.salvando() || nova < this.primeiraSemana() || nova > this.semanaAtual()) {
      return;
    }
    const diaDaSemana = diaSemanaIso(this.selecionado());
    this.semana.set(nova);
    await this.escolherDia(somarDias(nova, diaDaSemana - 1));
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

  async carregarPrazo(): Promise<void> {
    const id = ++this.requisicaoPrazo;
    try {
      const prazo = await firstValueFrom(this.presenca.prazo());
      if (id === this.requisicaoPrazo) {
        this.ajustaDesde.set(prazo.ajustaDesde);
      }
    } catch {
      return;
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
      await this.notificador.erroDaApi(erro, 'Não foi possível carregar as presenças.');
    }
  }

  async tirar(presente: PresencaDaAula): Promise<void> {
    const aula = this.idAula();
    const data = this.selecionado();
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
      await firstValueFrom(this.presenca.tirar(data, aula, presente.idAluno), {
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

  async incluir(pessoas: PessoaAcademia[]): Promise<void> {
    const aula = this.idAula();
    const data = this.selecionado();
    if (aula === null || this.salvando() || pessoas.length === 0) {
      return;
    }
    this.salvando.set(true);
    let incluidas = 0;
    try {
      for (const pessoa of pessoas) {
        try {
          await firstValueFrom(this.presenca.incluir(data, aula, pessoa.id), {
            defaultValue: undefined
          });
        } catch (erro: unknown) {
          if (codigoDeErro(erro) !== 'ERR027') {
            throw erro;
          }
        }
        incluidas++;
      }
      this.fecharIncluir();
      await this.notificador.sucesso(
        pessoas.length === 1 ? `${pessoas[0].nome} entrou na chamada.` : `${pessoas.length} alunos entraram na chamada.`
      );
      await this.recarregar();
    } catch (erro: unknown) {
      const quem = pessoas[incluidas];
      await this.notificador.erroDaApi(erro, `Não foi possível incluir ${quem.nome}.`);
      if (incluidas > 0 && !this.ehDesatualizada(erro)) {
        await this.recarregar();
      }
      await this.recarregarSeDesatualizada(erro);
    } finally {
      this.salvando.set(false);
    }
  }

  private async recarregar(): Promise<void> {
    await Promise.all([this.carregarChamada(), this.atualizarContagem()]);
  }

  private ehDesatualizada(erro: unknown): boolean {
    const codigo = codigoDeErro(erro);
    return codigo === 'ERR027' || codigo === 'ERR028' || codigo === 'ERR029';
  }

  private async recarregarSeDesatualizada(erro: unknown): Promise<void> {
    if (this.ehDesatualizada(erro)) {
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
