import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { LucideUsers } from '@lucide/angular';
import { catchError, of } from 'rxjs';
import { Notificador } from '../../core/notificacao/notificador';
import { AlunoPainel } from '../../shared/alunos/alunos.model';
import { AlunosService } from '../../shared/alunos/alunos.service';
import { descreverGraduacao } from '../../shared/graduacao/descrever';
import { Faixa } from '../../shared/graduacao/graduacao.model';
import { GraduacaoService } from '../../shared/graduacao/graduacao.service';
import { BarraFaixaComponent } from '../../shared/ui/barra-faixa/barra-faixa.component';
import { BotaoComponent } from '../../shared/ui/botao/botao.component';
import { EstadoVazioComponent } from '../../shared/ui/estado-vazio/estado-vazio.component';
import { PaginacaoComponent } from '../../shared/ui/paginacao/paginacao.component';
import { compararNomes, contemNome, paginar, TAMANHO_PAGINA_DONO } from '../../shared/utils/texto.util';
import { textoDoUltimoTreino } from './ultimo-treino';

type Situacao = 'todos' | 'sumidos' | 'professores';
type SelecaoFaixa = 'todas' | 'sem' | number;

@Component({
  selector: 'app-alunos',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSpinner,
    LucideUsers,
    BarraFaixaComponent,
    BotaoComponent,
    EstadoVazioComponent,
    PaginacaoComponent
  ],
  templateUrl: './alunos.component.html',
  styleUrl: './alunos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlunosComponent {
  private readonly service = inject(AlunosService);
  private readonly notificador = inject(Notificador);

  readonly descrever = descreverGraduacao;
  readonly situacaoDe = textoDoUltimoTreino;

  private iniciado = false;

  readonly carregando = signal(true);
  readonly erroCarga = signal(false);
  readonly busca = signal('');
  readonly situacao = signal<Situacao>('todos');
  readonly faixa = signal<SelecaoFaixa>('todas');
  readonly pagina = signal(1);

  private readonly faixas = toSignal(inject(GraduacaoService).faixas().pipe(catchError(() => of<Faixa[]>([]))), {
    initialValue: [] as Faixa[]
  });
  readonly infantis = computed(() => this.faixas().filter((f) => f.categoria === 'INFANTIL'));
  readonly adultas = computed(() => this.faixas().filter((f) => f.categoria === 'ADULTO'));
  readonly mestres = computed(() => this.faixas().filter((f) => f.categoria === 'MESTRE'));

  readonly alunos = computed(() => this.service.painelEmCache() ?? []);
  readonly totalSumidos = computed(() => this.alunos().filter((a) => a.sumido).length);

  readonly filtros = computed<readonly { valor: Situacao; rotulo: string }[]>(() => [
    { valor: 'todos', rotulo: 'Todos' },
    { valor: 'sumidos', rotulo: `Sumidos · ${this.totalSumidos()}` },
    { valor: 'professores', rotulo: 'Professores' }
  ]);

  readonly filtrados = computed(() => {
    const situacao = this.situacao();
    const faixa = this.faixa();
    const busca = this.busca();
    return [...this.alunos()]
      .sort(compararNomes)
      .filter((a) => this.naSituacao(a, situacao) && this.naFaixa(a, faixa) && contemNome(a.nome, busca));
  });
  private readonly paginada = computed(() => paginar(this.filtrados(), this.pagina(), TAMANHO_PAGINA_DONO));
  readonly visiveis = computed(() => this.paginada().itens);
  readonly paginaExibida = computed(() => this.paginada().pagina);
  readonly totalPaginas = computed(() => this.paginada().totalPaginas);
  readonly contador = computed(() => {
    const total = this.filtrados().length;
    return total === 1 ? '1 aluno' : `${total} alunos`;
  });

  constructor() {
    this.carregar();
  }

  ionViewWillEnter(): void {
    if (this.iniciado) {
      this.carregar();
    }
  }

  carregar(): void {
    this.iniciado = true;
    const semCache = this.service.painelEmCache() === null;
    this.carregando.set(semCache);
    this.erroCarga.set(false);
    this.service.painel().subscribe({
      next: () => this.carregando.set(false),
      error: (erro: unknown) => {
        this.carregando.set(false);
        if (semCache) {
          this.erroCarga.set(true);
        }
        void this.notificador.erroDaApi(erro, 'Não foi possível carregar os alunos.');
      }
    });
  }

  aoDigitar(valor: string): void {
    this.busca.set(valor);
    this.pagina.set(1);
  }

  aoMudarSituacao(valor: Situacao): void {
    this.situacao.set(valor);
    this.pagina.set(1);
  }

  aoFiltrarFaixa(valor: string): void {
    this.faixa.set(valor === 'todas' || valor === 'sem' ? valor : Number(valor));
    this.pagina.set(1);
  }

  irParaPagina(pagina: number): void {
    this.pagina.set(pagina);
  }

  private naSituacao(aluno: AlunoPainel, situacao: Situacao): boolean {
    if (situacao === 'sumidos') {
      return aluno.sumido;
    }
    return situacao === 'professores' ? aluno.perfil === 'PROFESSOR' : true;
  }

  private naFaixa(aluno: AlunoPainel, faixa: SelecaoFaixa): boolean {
    if (faixa === 'todas') {
      return true;
    }
    return faixa === 'sem' ? aluno.atual === null : aluno.atual?.faixa.id === faixa;
  }
}
