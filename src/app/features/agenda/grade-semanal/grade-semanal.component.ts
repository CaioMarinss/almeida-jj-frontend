import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonModal, IonSpinner } from '@ionic/angular';
import { LucideCalendarCog, LucidePencil, LucideTriangleAlert } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { Notificador } from '../../../core/notificacao/notificador';
import { AulaGrade, EdicaoAula, ROTULO_MODALIDADE } from '../../../shared/agenda/agenda.model';
import { AgendaService } from '../../../shared/agenda/agenda.service';
import { DIAS_SEMANA_CURTOS } from '../../../shared/agenda/datas';
import { BotaoComponent } from '../../../shared/ui/botao/botao.component';
import { EstadoVazioComponent } from '../../../shared/ui/estado-vazio/estado-vazio.component';
import { artigoDoDia, DIAS_SEMANA_LONGOS } from '../dias';
import { FormAulaComponent } from '../form-aula/form-aula.component';

interface PainelAula {
  aula: AulaGrade | null;
}

@Component({
  selector: 'app-grade-semanal',
  imports: [
    IonModal,
    IonSpinner,
    LucideCalendarCog,
    LucidePencil,
    LucideTriangleAlert,
    BotaoComponent,
    EstadoVazioComponent,
    FormAulaComponent
  ],
  templateUrl: './grade-semanal.component.html',
  styleUrl: './grade-semanal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GradeSemanalComponent {
  private readonly service = inject(AgendaService);
  private readonly notificador = inject(Notificador);

  readonly rotulo = ROTULO_MODALIDADE;
  readonly dias = DIAS_SEMANA_CURTOS.map((curto, i) => ({ numero: i + 1, curto, nome: DIAS_SEMANA_LONGOS[i] }));

  readonly aulas = signal<AulaGrade[]>([]);
  readonly carregando = signal(true);
  readonly erroCarga = signal(false);
  readonly salvando = signal(false);
  readonly diaSemana = signal(1);
  readonly painel = signal<PainelAula | null>(null);

  readonly doDia = computed(() =>
    this.aulas()
      .filter(a => a.diaSemana === this.diaSemana())
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
  );
  readonly rotuloAdicionar = computed(
    () => `+ Aula ${artigoDoDia(this.diaSemana())} ${DIAS_SEMANA_LONGOS[this.diaSemana() - 1]}`
  );

  constructor() {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erroCarga.set(false);
    try {
      this.aulas.set(await firstValueFrom(this.service.grade()));
      this.carregando.set(false);
    } catch (erro: unknown) {
      this.carregando.set(false);
      this.erroCarga.set(true);
      await this.notificador.erroDaApi(erro, 'Não foi possível carregar a grade.');
    }
  }

  selecionar(dia: number): void {
    this.diaSemana.set(dia);
  }

  abrirNova(): void {
    this.painel.set({ aula: null });
  }

  abrirEdicao(aula: AulaGrade): void {
    this.painel.set({ aula });
  }

  fechar(): void {
    this.painel.set(null);
  }

  async salvar(valores: EdicaoAula): Promise<void> {
    const aula = this.painel()?.aula ?? null;
    if (this.salvando()) {
      return;
    }
    this.salvando.set(true);
    try {
      if (aula) {
        const nova = await firstValueFrom(this.service.editarAula(aula.id, valores));
        this.aulas.update(lista => lista.map(a => (a.id === aula.id ? nova : a)));
        this.fechar();
        await this.notificador.sucesso('Aula alterada.');
      } else {
        const criada = await firstValueFrom(
          this.service.criarAula({ diaSemana: this.diaSemana(), ...valores })
        );
        this.aulas.update(lista => [...lista, criada]);
        this.fechar();
        await this.notificador.sucesso('Aula adicionada.');
      }
    } catch (erro: unknown) {
      await this.notificador.erroDaApi(erro, 'Não foi possível salvar a aula.');
    } finally {
      this.salvando.set(false);
    }
  }

  async tirar(): Promise<void> {
    const aula = this.painel()?.aula;
    if (!aula || this.salvando()) {
      return;
    }
    const confirmado = await this.notificador.confirmar(
      'Tirar da grade',
      'A aula sai da grade a partir de amanhã. Continuar?',
      'Tirar da grade'
    );
    if (!confirmado) {
      return;
    }
    this.salvando.set(true);
    try {
      await firstValueFrom(this.service.tirarDaGrade(aula.id), { defaultValue: undefined });
      this.aulas.update(lista => lista.filter(a => a.id !== aula.id));
      this.fechar();
      await this.notificador.sucesso('Aula tirada da grade.');
    } catch (erro: unknown) {
      await this.notificador.erroDaApi(erro, 'Não foi possível tirar a aula da grade.');
    } finally {
      this.salvando.set(false);
    }
  }
}
