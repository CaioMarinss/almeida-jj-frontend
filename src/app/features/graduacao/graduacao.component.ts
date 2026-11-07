import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { IonContent, IonHeader, IonModal, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { LucideAward } from '@lucide/angular';
import { catchError, of } from 'rxjs';
import { Notificador } from '../../core/notificacao/notificador';
import { descreverGraduacao } from '../../shared/graduacao/descrever';
import { AlunoGraduacao, Faixa, GraduacaoAtual } from '../../shared/graduacao/graduacao.model';
import { GraduacaoService } from '../../shared/graduacao/graduacao.service';
import { BarraFaixaComponent } from '../../shared/ui/barra-faixa/barra-faixa.component';
import { BotaoComponent } from '../../shared/ui/botao/botao.component';
import { EstadoVazioComponent } from '../../shared/ui/estado-vazio/estado-vazio.component';
import { PaginacaoComponent } from '../../shared/ui/paginacao/paginacao.component';
import { criarListaFixada } from '../../shared/utils/lista-fixada';
import { compararNomes, contemNome } from '../../shared/utils/texto.util';
import { ProximaGraduacaoComponent } from './proxima-graduacao/proxima-graduacao.component';
import { RegistroGraduacaoComponent } from './registro-graduacao/registro-graduacao.component';

type SelecaoFaixa = 'todas' | 'sem' | number;

@Component({
  selector: 'app-graduacao',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSpinner,
    IonModal,
    LucideAward,
    BarraFaixaComponent,
    BotaoComponent,
    EstadoVazioComponent,
    PaginacaoComponent,
    ProximaGraduacaoComponent,
    RegistroGraduacaoComponent
  ],
  templateUrl: './graduacao.component.html',
  styleUrl: './graduacao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraduacaoComponent {
  private readonly service = inject(GraduacaoService);
  private readonly notificador = inject(Notificador);

  readonly descrever = descreverGraduacao;
  readonly alunos = signal<AlunoGraduacao[]>([]);
  readonly pagina = signal(1);
  readonly carregando = signal(true);
  readonly erroCarga = signal(false);
  readonly nome = signal('');
  readonly faixa = signal<SelecaoFaixa>('todas');
  readonly selecionado = signal<AlunoGraduacao | null>(null);

  private readonly faixas = toSignal(
    this.service.faixas().pipe(catchError(() => of<Faixa[]>([]))),
    { initialValue: [] as Faixa[] }
  );
  private readonly sincronizar = this.service.atualAlterada$
    .pipe(takeUntilDestroyed())
    .subscribe(({ idAluno, atual }) => this.aoMudarAtual(idAluno, atual));

  readonly infantis = computed(() => this.faixas().filter(f => f.categoria === 'INFANTIL'));
  readonly adultas = computed(() => this.faixas().filter(f => f.categoria === 'ADULTO'));
  readonly mestres = computed(() => this.faixas().filter(f => f.categoria === 'MESTRE'));

  readonly filtrados = computed(() => {
    const faixa = this.faixa();
    const nome = this.nome();
    return [...this.alunos()]
      .sort(compararNomes)
      .filter(a => this.naFaixa(a, faixa) && contemNome(a.nome, nome));
  });
  private readonly fixada = criarListaFixada(this.alunos, this.filtrados, this.pagina);
  readonly visiveis = this.fixada.visiveis;
  readonly paginaExibida = this.fixada.paginaExibida;
  readonly totalPaginasExibido = this.fixada.totalPaginasExibido;
  readonly contador = computed(() => {
    const total = this.fixada.total();
    return total === 1 ? '1 aluno' : `${total} alunos`;
  });

  constructor() {
    this.carregar();
  }

  aoDigitar(valor: string): void {
    this.nome.set(valor);
    this.recomecar();
  }

  aoFiltrar(valor: string): void {
    this.faixa.set(valor === 'todas' || valor === 'sem' ? valor : Number(valor));
    this.recomecar();
  }

  irParaPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.fixada.soltar();
  }

  recarregar(): void {
    this.carregar();
  }

  abrir(aluno: AlunoGraduacao): void {
    this.selecionado.set(aluno);
  }

  fechar(): void {
    this.selecionado.set(null);
  }

  aoMudarAtual(id: number, atual: GraduacaoAtual | null): void {
    this.atualizarLinha(id, atual);
    this.selecionado.update(sel => (sel?.id === id ? { ...sel, atual } : sel));
  }

  atualizarLinha(id: number, atual: GraduacaoAtual | null): void {
    this.fixada.fixar();
    this.alunos.update(lista => lista.map(a => (a.id === id ? { ...a, atual } : a)));
  }

  private naFaixa(aluno: AlunoGraduacao, faixa: SelecaoFaixa): boolean {
    if (faixa === 'todas') {
      return true;
    }
    return faixa === 'sem' ? aluno.atual === null : aluno.atual?.faixa.id === faixa;
  }

  private recomecar(): void {
    this.pagina.set(1);
    this.fixada.soltar();
  }

  private carregar(): void {
    this.carregando.set(true);
    this.erroCarga.set(false);
    this.service.alunos().subscribe({
      next: lista => {
        this.alunos.set(lista);
        this.carregando.set(false);
      },
      error: (erro: unknown) => {
        this.carregando.set(false);
        this.erroCarga.set(true);
        void this.notificador.erroDaApi(erro, 'Não foi possível carregar os alunos.');
      }
    });
  }
}
