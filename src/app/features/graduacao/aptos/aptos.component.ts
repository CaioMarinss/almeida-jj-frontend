import { ChangeDetectionStrategy, Component, computed, inject, OnInit, output, signal } from '@angular/core';
import { IonLabel, IonModal, IonSegment, IonSegmentButton } from '@ionic/angular';
import { ContadoresDonoService } from '../../../core/dono/contadores-dono.service';
import { codigoDeErro } from '../../../core/http/erro-api';
import { Notificador } from '../../../core/notificacao/notificador';
import { descreverGraduacao, formatarDiaMes, formatarNota, hojeEmSaoPaulo } from '../../../shared/graduacao/descrever';
import { Apto, Faixa, ListaAptos } from '../../../shared/graduacao/graduacao.model';
import { EscolhaGraduacao, ExameRegistrado, GraduacaoService } from '../../../shared/graduacao/graduacao.service';
import { BarraFaixaComponent } from '../../../shared/ui/barra-faixa/barra-faixa.component';
import { BotaoComponent } from '../../../shared/ui/botao/botao.component';
import { ExameComponent } from '../exame/exame.component';

type Trilha = 'grau' | 'faixa';
type Estado = 'carregando' | 'pronto' | 'semEvento' | 'erro';

@Component({
  selector: 'app-aptos',
  imports: [IonSegment, IonSegmentButton, IonLabel, IonModal, BarraFaixaComponent, BotaoComponent, ExameComponent],
  templateUrl: './aptos.component.html',
  styleUrl: './aptos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AptosComponent implements OnInit {
  private readonly service = inject(GraduacaoService);
  private readonly notificador = inject(Notificador);
  private readonly contadores = inject(ContadoresDonoService);

  readonly agendar = output<void>();

  readonly descrever = descreverGraduacao;
  readonly formatar = formatarDiaMes;
  readonly nota = formatarNota;
  readonly trilhaAtiva = signal<Trilha>('grau');
  readonly exameDe = signal<Apto | null>(null);

  readonly estado = signal<Estado>('carregando');
  readonly dados = signal<ListaAptos | null>(null);
  readonly selecionado = signal<Apto | null>(null);
  readonly idFaixa = signal<number | null>(null);
  readonly grauEscolhido = signal(0);
  readonly salvando = signal(false);
  readonly erroFaixas = signal(false);

  private readonly faixas = signal<Faixa[]>([]);
  readonly infantis = computed(() => this.faixas().filter((f) => f.categoria === 'INFANTIL'));
  readonly adultas = computed(() => this.faixas().filter((f) => f.categoria === 'ADULTO'));
  readonly mestres = computed(() => this.faixas().filter((f) => f.categoria === 'MESTRE'));

  readonly liberado = computed(() => {
    const evento = this.dados()?.evento;
    return !!evento && hojeEmSaoPaulo() >= evento.data;
  });
  readonly resumo = computed(() => {
    const dados = this.dados();
    const todos = dados ? [...dados.grau, ...dados.faixa] : [];
    const aptos = todos.filter((a) => a.apto && !a.graduado).length;
    const exames = todos.filter((a) => a.exame !== null).length;
    const graduados = todos.filter((a) => a.graduado).length;
    return `${aptos} ${aptos === 1 ? 'apto' : 'aptos'} · ${exames} ${exames === 1 ? 'exame feito' : 'exames feitos'} · ${graduados} ${graduados === 1 ? 'graduado' : 'graduados'}`;
  });
  readonly contagemGrau = computed(() => this.dados()?.grau.length ?? 0);
  readonly contagemFaixa = computed(() => this.dados()?.faixa.length ?? 0);
  readonly lista = computed(() => {
    const dados = this.dados();
    return dados ? this.ordenar(this.trilhaAtiva() === 'grau' ? dados.grau : dados.faixa) : [];
  });
  readonly contagemAtiva = computed(() => this.lista().length);
  readonly secoes = computed(() =>
    [
      { id: 'grupo-principal', titulo: null, alunos: this.lista().filter((a) => a.apto || a.graduado) },
      { id: 'grupo-ainda-nao', titulo: 'Ainda não aptos', alunos: this.lista().filter((a) => !a.apto && !a.graduado) }
    ].filter((s) => s.alunos.length > 0)
  );

  readonly faixaEscolhida = computed<Faixa | null>(() => this.faixas().find((f) => f.id === this.idFaixa()) ?? null);
  readonly opcoesGrau = computed(() => {
    const f = this.faixaEscolhida();
    return f ? Array.from({ length: f.grauMax - f.grauMin + 1 }, (_, i) => f.grauMin + i) : [];
  });
  readonly grau = computed(() => {
    const f = this.faixaEscolhida();
    return f ? Math.min(Math.max(this.grauEscolhido(), f.grauMin), f.grauMax) : 0;
  });
  readonly podeConfirmar = computed(() => this.faixaEscolhida() !== null && !this.salvando());

  ngOnInit(): void {
    this.carregar();
    this.carregarFaixas();
  }

  carregar(): void {
    this.estado.set('carregando');
    this.service.aptos().subscribe({
      next: (lista) => {
        this.dados.set(lista);
        this.estado.set('pronto');
      },
      error: (erro: unknown) => {
        if (codigoDeErro(erro) === 'ERR033') {
          this.dados.set(null);
          this.estado.set('semEvento');
          return;
        }
        this.estado.set('erro');
        void this.notificador.erroDaApi(erro, 'Não foi possível carregar os aptos.');
      }
    });
  }

  carregarFaixas(): void {
    this.erroFaixas.set(false);
    this.service.faixas().subscribe({
      next: (lista) => {
        this.faixas.set(lista);
        if (this.idFaixa() === null) {
          this.preencher();
        }
      },
      error: () => this.erroFaixas.set(true)
    });
  }

  abrir(apto: Apto): void {
    this.selecionado.set(apto);
    this.preencher();
  }

  trocarTrilha(valor: unknown): void {
    if (valor === 'grau' || valor === 'faixa') {
      this.trilhaAtiva.set(valor);
    }
  }

  abrirExame(apto: Apto): void {
    this.exameDe.set(apto);
  }

  fecharExame(): void {
    this.exameDe.set(null);
  }

  aoSalvarExame(registrado: ExameRegistrado): void {
    const nome = this.exameDe()?.nome ?? '';
    this.exameDe.set(null);
    void this.notificador.sucesso(registrado.graduacao ? `${nome} graduou.` : `Exame de ${nome} registrado.`);
    this.recarregarTudo();
  }

  aoRemoverExame(): void {
    this.exameDe.set(null);
    void this.notificador.sucesso('Exame removido.');
    this.recarregarTudo();
  }

  voltar(): void {
    this.selecionado.set(null);
  }

  trocarFaixa(valor: string): void {
    this.idFaixa.set(valor === '' ? null : Number(valor));
    this.grauEscolhido.set(this.faixaEscolhida()?.grauMin ?? 0);
  }

  trocarGrau(valor: string): void {
    this.grauEscolhido.set(Number(valor));
  }

  rotuloGrau(grau: number): string {
    return this.faixaEscolhida()?.categoria !== 'MESTRE' && grau === 0 ? 'Sem graus' : `${grau}º grau`;
  }

  faltam(apto: Apto): number {
    return Math.max((apto.minimo ?? 0) - apto.contadas, 0);
  }

  confirmar(): void {
    const apto = this.selecionado();
    const faixa = this.faixaEscolhida();
    if (!apto || !faixa || this.salvando()) {
      return;
    }
    this.salvando.set(true);
    this.service.graduou(apto.id, this.escolha(apto, faixa)).subscribe({
      next: () => {
        this.salvando.set(false);
        this.selecionado.set(null);
        void this.notificador.sucesso(`${apto.nome} graduou.`);
        this.recarregarTudo();
      },
      error: (erro: unknown) => {
        this.salvando.set(false);
        void this.notificador.erroDaApi(erro, 'Não foi possível registrar a graduação.');
        const codigo = codigoDeErro(erro);
        if (codigo === 'ERR031' || codigo === 'ERR032' || codigo === 'ERR035') {
          this.selecionado.set(null);
          this.carregar();
        }
      }
    });
  }

  private recarregarTudo(): void {
    this.carregar();
    void this.contadores.atualizar();
  }

  private escolha(apto: Apto, faixa: Faixa): EscolhaGraduacao | undefined {
    const grau = this.grau();
    const sugestao = apto.sugestao;
    return sugestao && sugestao.faixa.id === faixa.id && sugestao.grau === grau ? undefined : { idGraduacao: faixa.id, grau };
  }

  private preencher(): void {
    const sugestao = this.selecionado()?.sugestao ?? null;
    this.idFaixa.set(sugestao?.faixa.id ?? null);
    this.grauEscolhido.set(sugestao?.grau ?? 0);
  }

  private ordenar(lista: Apto[]): Apto[] {
    return [...lista].sort(
      (a, b) =>
        Number(a.graduado) - Number(b.graduado) ||
        Number(b.apto) - Number(a.apto) ||
        a.nome.localeCompare(b.nome, 'pt-BR')
    );
  }
}
