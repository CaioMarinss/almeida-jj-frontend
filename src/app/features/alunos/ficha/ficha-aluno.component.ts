import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/angular';
import { LucideUserX } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { codigoDeErro } from '../../../core/http/erro-api';
import { ROTULO_PERFIL } from '../../../core/auth/usuario';
import { ContadoresDonoService } from '../../../core/dono/contadores-dono.service';
import { Notificador } from '../../../core/notificacao/notificador';
import { AlunosService } from '../../../shared/alunos/alunos.service';
import { descreverGraduacao, formatarNota } from '../../../shared/graduacao/descrever';
import { Exame } from '../../../shared/graduacao/graduacao.model';
import { GraduacaoService } from '../../../shared/graduacao/graduacao.service';
import { MinhasPresencas } from '../../../shared/presenca/presenca.model';
import { BarraFaixaComponent } from '../../../shared/ui/barra-faixa/barra-faixa.component';
import { BotaoComponent } from '../../../shared/ui/botao/botao.component';
import { EstadoVazioComponent } from '../../../shared/ui/estado-vazio/estado-vazio.component';
import { dataDoUltimoTreino } from '../ultimo-treino';
import { ExamesAlunoComponent } from './exames-aluno/exames-aluno.component';
import { PresencasAlunoComponent } from './presencas-aluno/presencas-aluno.component';
import { RegistroGraduacaoComponent } from './registro-graduacao/registro-graduacao.component';

export type AbaFicha = 'presencas' | 'graduacoes' | 'exames';

@Component({
  selector: 'app-ficha-aluno',
  imports: [
    RouterLink,
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonTitle,
    IonToolbar,
    LucideUserX,
    BarraFaixaComponent,
    BotaoComponent,
    EstadoVazioComponent,
    ExamesAlunoComponent,
    PresencasAlunoComponent,
    RegistroGraduacaoComponent
  ],
  templateUrl: './ficha-aluno.component.html',
  styleUrl: './ficha-aluno.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FichaAlunoComponent {
  private readonly alunos = inject(AlunosService);
  private readonly graduacao = inject(GraduacaoService);
  private readonly contadores = inject(ContadoresDonoService);
  private readonly notificador = inject(Notificador);

  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  readonly rotulo = ROTULO_PERFIL;
  readonly descrever = descreverGraduacao;

  readonly aba = signal<AbaFicha>('presencas');
  readonly carregando = signal(true);
  readonly erroCarga = signal(false);
  readonly alterando = signal(false);
  readonly exames = signal<Exame[]>([]);
  readonly erroExames = signal(false);
  readonly presencas = signal<MinhasPresencas | null>(null);

  readonly aluno = computed(() => this.alunos.painelEmCache()?.find((a) => a.id === this.id) ?? null);

  readonly presencasNoCiclo = computed(() => {
    const dados = this.presencas();
    if (!dados) {
      return '—';
    }
    const ciclo = dados.ciclo;
    if (!ciclo) {
      return `${dados.presencas.length}`;
    }
    return ciclo.minimo === null ? `${ciclo.contadas}` : `${ciclo.contadas}/${ciclo.minimo}`;
  });
  readonly ultimoTreino = computed(() => {
    const aluno = this.aluno();
    return aluno ? dataDoUltimoTreino(aluno) : '—';
  });
  readonly ultimoExame = computed(() => {
    const primeiro = this.erroExames() ? undefined : this.exames()[0];
    return primeiro ? formatarNota(primeiro.nota) : '—';
  });

  constructor() {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erroCarga.set(false);
    try {
      if (this.alunos.painelEmCache() === null) {
        await firstValueFrom(this.alunos.painel());
      } else {
        void firstValueFrom(this.alunos.painel()).catch(() => undefined);
      }
      this.carregando.set(false);
      if (this.aluno()) {
        this.carregarExames();
      }
    } catch (erro: unknown) {
      this.carregando.set(false);
      this.erroCarga.set(true);
      await this.notificador.erroDaApi(erro, 'Não foi possível carregar o aluno.');
    }
  }

  aoMudarSegmento(valor: unknown): void {
    if (valor === 'presencas' || valor === 'graduacoes' || valor === 'exames') {
      this.aba.set(valor);
    }
  }

  async alterarCargo(): Promise<void> {
    const aluno = this.aluno();
    if (!aluno || aluno.perfil === 'DONO' || this.alterando()) {
      return;
    }
    const promover = aluno.perfil === 'ALUNO';
    try {
      const confirmado = promover
        ? await this.notificador.confirmar('Tornar professor', `Tornar ${aluno.nome} professor?`, 'Tornar professor')
        : await this.notificador.confirmar(
            'Remover professor',
            `Remover o cargo de professor de ${aluno.nome}?`,
            'Remover'
          );
      if (!confirmado) {
        return;
      }
      this.alterando.set(true);
      const novo = promover ? 'PROFESSOR' : 'ALUNO';
      await firstValueFrom(this.alunos.alterarPerfil(aluno.id, novo), { defaultValue: undefined });
      this.alunos.alterarEmCache(aluno.id, { perfil: novo });
      await this.notificador.sucesso(
        promover ? `${aluno.nome} agora é professor.` : `${aluno.nome} voltou a ser aluno.`
      );
      await this.atualizarPainel();
    } catch (erro: unknown) {
      await this.notificador.erroDaApi(erro, 'Não foi possível alterar o cargo.');
      if (codigoDeErro(erro) === 'ERR009') {
        await this.atualizarPainel();
      }
    } finally {
      this.alterando.set(false);
    }
  }

  private async atualizarPainel(): Promise<void> {
    await Promise.all([firstValueFrom(this.alunos.painel()).catch(() => undefined), this.contadores.atualizar()]);
  }

  carregarExames(): void {
    this.erroExames.set(false);
    this.graduacao.exames(this.id).subscribe({
      next: (lista) => this.exames.set(lista),
      error: () => this.erroExames.set(true)
    });
  }
}
