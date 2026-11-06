import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { LucideAward } from '@lucide/angular';
import { catchError, debounceTime, EMPTY, map, of, Subject, switchMap, tap } from 'rxjs';
import { ROTULO_PERFIL } from '../../core/auth/usuario';
import { Notificador } from '../../core/notificacao/notificador';
import { descreverGraduacao } from '../../shared/graduacao/descrever';
import { AlunoGraduacao, Faixa, FiltroAlunos, GraduacaoAtual } from '../../shared/graduacao/graduacao.model';
import { GraduacaoService } from '../../shared/graduacao/graduacao.service';
import { BarraFaixaComponent } from '../../shared/ui/barra-faixa/barra-faixa.component';
import { BotaoComponent } from '../../shared/ui/botao/botao.component';
import { EstadoVazioComponent } from '../../shared/ui/estado-vazio/estado-vazio.component';
import { ProximaGraduacaoComponent } from './proxima-graduacao/proxima-graduacao.component';

const TAMANHO_PAGINA = 20;
const ESPERA_DIGITACAO_MS = 300;

type SelecaoFaixa = 'todas' | 'sem' | number;

interface Pedido {
  filtro: FiltroAlunos;
  acrescentar: boolean;
}

@Component({
  selector: 'app-graduacao',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSpinner,
    LucideAward,
    BarraFaixaComponent,
    BotaoComponent,
    EstadoVazioComponent,
    ProximaGraduacaoComponent
  ],
  templateUrl: './graduacao.component.html',
  styleUrl: './graduacao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraduacaoComponent {
  private readonly service = inject(GraduacaoService);
  private readonly notificador = inject(Notificador);
  private readonly pedidos = new Subject<Pedido>();
  private readonly digitacao = new Subject<void>();

  readonly rotulo = ROTULO_PERFIL;
  readonly descrever = descreverGraduacao;
  readonly alunos = signal<AlunoGraduacao[]>([]);
  readonly total = signal(0);
  readonly pagina = signal(0);
  readonly carregando = signal(true);
  readonly carregandoMais = signal(false);
  readonly erroCarga = signal(false);
  readonly nome = signal('');
  readonly faixa = signal<SelecaoFaixa>('todas');
  readonly selecionado = signal<AlunoGraduacao | null>(null);
  readonly temMais = computed(() => this.alunos().length < this.total());

  private readonly faixas = toSignal(
    this.service.faixas().pipe(catchError(() => of<Faixa[]>([]))),
    { initialValue: [] as Faixa[] }
  );
  readonly infantis = computed(() => this.faixas().filter(f => f.categoria === 'INFANTIL'));
  readonly adultas = computed(() => this.faixas().filter(f => f.categoria === 'ADULTO'));
  readonly mestres = computed(() => this.faixas().filter(f => f.categoria === 'MESTRE'));

  constructor() {
    this.pedidos
      .pipe(
        switchMap(pedido =>
          this.service.buscarAlunos(pedido.filtro).pipe(
            map(resposta => ({ pedido, resposta })),
            catchError((erro: unknown) => {
              this.aoFalhar(pedido, erro);
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe(({ pedido, resposta }) => {
        this.alunos.update(atuais => (pedido.acrescentar ? [...atuais, ...resposta.itens] : resposta.itens));
        this.total.set(resposta.total);
        this.pagina.set(resposta.pagina);
        this.carregando.set(false);
        this.carregandoMais.set(false);
      });

    this.digitacao
      .pipe(debounceTime(ESPERA_DIGITACAO_MS), tap(() => this.buscar(0)), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe();

    this.buscar(0);
  }

  aoDigitar(valor: string): void {
    this.nome.set(valor);
    this.digitacao.next();
  }

  aoFiltrar(valor: string): void {
    this.faixa.set(valor === 'todas' || valor === 'sem' ? valor : Number(valor));
    this.buscar(0);
  }

  carregarMais(): void {
    if (!this.carregandoMais() && this.temMais()) {
      this.buscar(this.pagina() + 1);
    }
  }

  recarregar(): void {
    this.buscar(0);
  }

  abrir(aluno: AlunoGraduacao): void {
    this.selecionado.set(aluno);
  }

  atualizarLinha(id: number, atual: GraduacaoAtual): void {
    this.alunos.update(lista => lista.map(a => (a.id === id ? { ...a, atual } : a)));
  }

  private buscar(pagina: number): void {
    const acrescentar = pagina > 0;
    this.erroCarga.set(false);
    this.carregando.set(!acrescentar);
    this.carregandoMais.set(acrescentar);
    this.pedidos.next({ filtro: this.filtroAtual(pagina), acrescentar });
  }

  private filtroAtual(pagina: number): FiltroAlunos {
    const filtro: FiltroAlunos = { pagina, tamanho: TAMANHO_PAGINA };
    const nome = this.nome().trim();
    if (nome) {
      filtro.nome = nome;
    }
    const faixa = this.faixa();
    if (faixa !== 'todas') {
      filtro.faixa = faixa;
    }
    return filtro;
  }

  private aoFalhar(pedido: Pedido, erro: unknown): void {
    this.carregando.set(false);
    this.carregandoMais.set(false);
    this.erroCarga.set(!pedido.acrescentar);
    void this.notificador.erroDaApi(erro, 'Não foi possível carregar os alunos.');
  }
}
