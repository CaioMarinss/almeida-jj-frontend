import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonContent, IonHeader, IonModal, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { LucideUsers } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { ROTULO_PERFIL } from '../../core/auth/usuario';
import { Notificador } from '../../core/notificacao/notificador';
import { BotaoComponent } from '../../shared/ui/botao/botao.component';
import { EstadoVazioComponent } from '../../shared/ui/estado-vazio/estado-vazio.component';
import { PaginacaoComponent } from '../../shared/ui/paginacao/paginacao.component';
import { compararNomes, contemNome, paginar, TAMANHO_PAGINA_DONO } from '../../shared/utils/texto.util';
import { PessoaAcademia, ProfessoresService } from './professores.service';

type FiltroCargo = 'todos' | 'PROFESSOR' | 'ALUNO';

@Component({
  selector: 'app-professores',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonModal,
    IonSpinner,
    LucideUsers,
    BotaoComponent,
    EstadoVazioComponent,
    PaginacaoComponent
  ],
  templateUrl: './professores.component.html',
  styleUrl: './professores.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfessoresComponent {
  private readonly service = inject(ProfessoresService);
  private readonly notificador = inject(Notificador);

  readonly rotulo = ROTULO_PERFIL;
  readonly pessoas = signal<PessoaAcademia[]>([]);
  readonly carregando = signal(true);
  readonly alterando = signal<number | null>(null);
  readonly erroCarga = signal(false);
  readonly semAlunos = computed(() => this.pessoas().every(p => p.perfil === 'DONO'));

  readonly filtros: readonly { valor: FiltroCargo; rotulo: string }[] = [
    { valor: 'todos', rotulo: 'Todos' },
    { valor: 'PROFESSOR', rotulo: 'Professores' },
    { valor: 'ALUNO', rotulo: 'Alunos' }
  ];

  readonly busca = signal('');
  readonly cargo = signal<FiltroCargo>('todos');
  readonly pagina = signal(1);
  readonly selecionada = signal<PessoaAcademia | null>(null);
  private readonly idsFixados = signal<number[] | null>(null);

  readonly filtradas = computed(() => {
    const cargo = this.cargo();
    const busca = this.busca();
    return [...this.pessoas()]
      .sort(compararNomes)
      .filter(p => (cargo === 'todos' || p.perfil === cargo) && contemNome(p.nome, busca));
  });
  readonly paginada = computed(() => paginar(this.filtradas(), this.pagina(), TAMANHO_PAGINA_DONO));
  readonly visiveis = computed(() => {
    const ids = this.idsFixados();
    if (ids === null) {
      return this.paginada().itens;
    }
    const porId = new Map(this.pessoas().map(p => [p.id, p]));
    return ids.flatMap(id => porId.get(id) ?? []);
  });
  readonly contador = computed(() => {
    const total = this.filtradas().length;
    return total === 1 ? '1 pessoa' : `${total} pessoas`;
  });

  mudarBusca(valor: string): void {
    this.busca.set(valor);
    this.recomecar();
  }

  mudarCargo(cargo: FiltroCargo): void {
    this.cargo.set(cargo);
    this.recomecar();
  }

  irParaPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.idsFixados.set(null);
  }

  abrir(pessoa: PessoaAcademia): void {
    if (pessoa.perfil !== 'DONO') {
      this.selecionada.set(pessoa);
    }
  }

  fechar(): void {
    this.selecionada.set(null);
  }

  async confirmarAcao(): Promise<void> {
    const pessoa = this.selecionada();
    this.fechar();
    if (pessoa) {
      await this.alternar(pessoa);
    }
  }

  private recomecar(): void {
    this.pagina.set(1);
    this.idsFixados.set(null);
  }

  constructor() {
    void this.carregar();
  }

  async alternar(pessoa: PessoaAcademia): Promise<void> {
    if (this.alterando() !== null || pessoa.perfil === 'DONO') {
      return;
    }
    const promover = pessoa.perfil === 'ALUNO';
    this.alterando.set(pessoa.id);
    try {
      const confirmado = promover
        ? await this.notificador.confirmar('Tornar professor', `Tornar ${pessoa.nome} professor?`, 'Tornar professor')
        : await this.notificador.confirmar(
            'Remover professor',
            `Remover o cargo de professor de ${pessoa.nome}?`,
            'Remover'
          );
      if (!confirmado) {
        return;
      }
      const novo = promover ? 'PROFESSOR' : 'ALUNO';
      await firstValueFrom(this.service.alterarPerfil(pessoa.id, novo), { defaultValue: undefined });
      this.idsFixados.set(this.visiveis().map(p => p.id));
      this.pessoas.update(lista => lista.map(p => (p.id === pessoa.id ? { ...p, perfil: novo } : p)));
      await this.notificador.sucesso(
        promover ? `${pessoa.nome} agora é professor.` : `${pessoa.nome} voltou a ser aluno.`
      );
    } catch (erro: unknown) {
      await this.notificador.erroDaApi(erro, 'Não foi possível alterar o cargo.');
    } finally {
      this.alterando.set(null);
    }
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erroCarga.set(false);
    try {
      this.pessoas.set(await firstValueFrom(this.service.listar()));
      this.carregando.set(false);
    } catch (erro: unknown) {
      this.carregando.set(false);
      this.erroCarga.set(true);
      await this.notificador.erroDaApi(erro, 'Não foi possível carregar os alunos.');
    }
  }
}
