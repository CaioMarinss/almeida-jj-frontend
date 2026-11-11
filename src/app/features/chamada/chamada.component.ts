import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonButtons, IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar, NavController } from '@ionic/angular';
import { LucideCheck, LucideChevronLeft, LucideChevronRight, LucideTriangleAlert, LucideUsers } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { Notificador } from '../../core/notificacao/notificador';
import { AulaDoDia, CLASSE_CHIP_MODALIDADE, ROTULO_MODALIDADE } from '../../shared/agenda/agenda.model';
import { AgendaService } from '../../shared/agenda/agenda.service';
import { DIAS_SEMANA_CURTOS, diaSemanaIso, formatarDiaMes, inicioDaSemana, somarDias } from '../../shared/agenda/datas';
import { hojeEmSaoPaulo } from '../../shared/graduacao/descrever';
import { Chamada, OrigemPresenca } from '../../shared/presenca/presenca.model';
import { PresencaService } from '../../shared/presenca/presenca.service';
import { BotaoComponent } from '../../shared/ui/botao/botao.component';
import { EstadoVazioComponent } from '../../shared/ui/estado-vazio/estado-vazio.component';
import { PessoaAcademia } from '../../shared/alunos/alunos.model';
import { compararNomes, contemNome } from '../../shared/utils/texto.util';
import { AlunosService } from '../../shared/alunos/alunos.service';
import { agoraEmSaoPaulo, aulaInicial } from './aula-inicial';

const NOMES_DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const SEMANAS_SEM_LIMITE = 12;

const ROTULO_ORIGEM_CHAMADA: Record<OrigemPresenca, string> = {
  ALUNO: 'marcou Vou',
  DONO: 'incluído por você',
  PROFESSOR: 'incluída pelo professor',
  IA: 'registrada pela IA'
};

export interface LinhaChamada {
  id: number;
  nome: string;
  presente: boolean;
  origem: string | null;
}

@Component({
  selector: 'app-chamada',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonSpinner,
    LucideCheck,
    LucideChevronLeft,
    LucideChevronRight,
    LucideTriangleAlert,
    LucideUsers,
    BotaoComponent,
    EstadoVazioComponent
  ],
  templateUrl: './chamada.component.html',
  styleUrl: './chamada.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChamadaComponent {
  private readonly agenda = inject(AgendaService);
  private readonly presenca = inject(PresencaService);
  private readonly pessoas = inject(AlunosService);
  private readonly nav = inject(NavController);
  private readonly notificador = inject(Notificador);

  readonly rotulo = ROTULO_MODALIDADE;
  readonly classeChip = CLASSE_CHIP_MODALIDADE;

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
  readonly pendentes = signal<ReadonlySet<number>>(new Set());
  readonly salvando = computed(() => this.pendentes().size > 0);
  readonly alunos = signal<PessoaAcademia[] | null>(null);
  readonly erroAlunos = signal(false);
  readonly busca = signal('');

  readonly aindaNaoAbriu = computed(() => this.selecionado() > this.hoje());
  readonly aula = computed(() => this.aulas().find(a => a.id === this.idAula()) ?? null);
  readonly podeIncluir = computed(() => (this.chamada()?.podeAjustar ?? false) && !(this.aula()?.cancelada ?? true));
  readonly totalPresentes = computed(() => this.chamada()?.presencas.length ?? 0);
  readonly presentes = computed<LinhaChamada[]>(() =>
    (this.chamada()?.presencas ?? [])
      .map(p => ({ id: p.idAluno, nome: p.nome, presente: true, origem: ROTULO_ORIGEM_CHAMADA[p.origem] }))
      .filter(l => contemNome(l.nome, this.busca()))
      .sort(compararNomes)
  );
  readonly outros = computed<LinhaChamada[]>(() => {
    const ids = new Set((this.chamada()?.presencas ?? []).map(p => p.idAluno));
    return (this.alunos() ?? [])
      .filter(p => !ids.has(p.id) && contemNome(p.nome, this.busca()))
      .map(p => ({ id: p.id, nome: p.nome, presente: false, origem: null }))
      .sort(compararNomes);
  });
  readonly prazo = computed(() => {
    const ate = this.chamada()?.ajustaAte;
    return ate ? `ajustável até ${formatarDiaMes(ate)}` : null;
  });

  private requisicaoAulas = 0;
  private requisicaoChamada = 0;
  private requisicaoContagem = 0;
  private requisicaoPrazo = 0;
  private primeiraEntrada = true;

  constructor() {
    void this.carregarAulas();
    void this.carregarPrazo();
    void this.carregarAlunos();
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
      this.chamada.set(null);
      this.requisicaoChamada++;
    }
    if (this.selecionado() === this.hoje()) {
      this.idAula.set(null);
    }
    await Promise.all([this.carregarAulas(), this.carregarChamada(), this.carregarPrazo(), this.carregarAlunos()]);
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

  editarGrade(): Promise<boolean> {
    return this.nav.navigateForward('/app/grade');
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
      const doDia = dias.find(d => d.data === data)?.aulas ?? [];
      this.aulas.set(doDia);
      this.carregandoAulas.set(false);
      await this.abrirAulaInicial(doDia, data);
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

  private async abrirAulaInicial(doDia: AulaDoDia[], data: string): Promise<void> {
    const atual = this.idAula();
    if (atual !== null && doDia.some(a => a.id === atual)) {
      return;
    }
    const inicial = data === this.hoje() ? aulaInicial(doDia, agoraEmSaoPaulo()) : (doDia[0] ?? null);
    this.idAula.set(inicial?.id ?? null);
    this.chamada.set(null);
    await this.carregarChamada();
  }

  async carregarAlunos(): Promise<void> {
    this.erroAlunos.set(false);
    try {
      this.alunos.set(await firstValueFrom(this.pessoas.listar()));
    } catch (erro: unknown) {
      this.erroAlunos.set(true);
      await this.notificador.erroDaApi(erro, 'Não foi possível carregar os alunos.');
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

  async alternar(linha: LinhaChamada): Promise<void> {
    const aula = this.idAula();
    const data = this.selecionado();
    if (aula === null || this.pendentes().has(linha.id)) {
      return;
    }
    this.pendentes.update(atual => new Set(atual).add(linha.id));
    try {
      if (linha.presente) {
        const confirmado = await this.notificador.confirmar(
          'Tirar a presença',
          `Tirar a presença de ${linha.nome}?`,
          'Tirar'
        );
        if (!confirmado) {
          return;
        }
        await firstValueFrom(this.presenca.tirar(data, aula, linha.id), { defaultValue: undefined });
      } else {
        await firstValueFrom(this.presenca.incluir(data, aula, linha.id), { defaultValue: undefined });
      }
      await this.recarregar(data, aula);
    } catch (erro: unknown) {
      await this.notificador.erroDaApi(
        erro,
        linha.presente ? 'Não foi possível tirar a presença.' : `Não foi possível incluir ${linha.nome}.`
      );
      await this.recarregar(data, aula);
    } finally {
      this.pendentes.update(atual => {
        const novo = new Set(atual);
        novo.delete(linha.id);
        return novo;
      });
    }
  }

  private async recarregar(data: string, aula: number): Promise<void> {
    if (data !== this.selecionado() || aula !== this.idAula()) {
      return;
    }
    await Promise.all([this.carregarChamada(), this.atualizarContagem()]);
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
