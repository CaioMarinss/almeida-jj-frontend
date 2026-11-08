import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonModal, IonSpinner } from '@ionic/angular';
import { LucideTrash2, LucideTriangleAlert } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { Notificador } from '../../../core/notificacao/notificador';
import { Excecao, ROTULO_MODALIDADE, TipoExcecao } from '../../../shared/agenda/agenda.model';
import { AgendaService } from '../../../shared/agenda/agenda.service';
import { DIAS_SEMANA_CURTOS, diaSemanaIso, formatarDiaMes } from '../../../shared/agenda/datas';
import { BotaoComponent } from '../../../shared/ui/botao/botao.component';
import { EstadoVazioComponent } from '../../../shared/ui/estado-vazio/estado-vazio.component';
import { NovaExcecao, NovaExcecaoComponent } from '../nova-excecao/nova-excecao.component';

const ROTULO_TIPO: Record<TipoExcecao, string> = {
  DIA: 'Dia cancelado',
  AULA: 'Aula cancelada',
  AVULSA: 'Aula avulsa'
};

interface LinhaExcecao {
  excecao: Excecao;
  descricao: string;
  detalhe: string;
  rotuloDesfazer: string;
}

@Component({
  selector: 'app-excecoes',
  imports: [
    IonModal,
    IonSpinner,
    LucideTrash2,
    LucideTriangleAlert,
    BotaoComponent,
    EstadoVazioComponent,
    NovaExcecaoComponent
  ],
  templateUrl: './excecoes.component.html',
  styleUrl: './excecoes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExcecoesComponent {
  private readonly service = inject(AgendaService);
  private readonly notificador = inject(Notificador);

  readonly excecoes = signal<Excecao[]>([]);
  readonly carregando = signal(true);
  readonly erroCarga = signal(false);
  readonly salvando = signal(false);
  readonly painel = signal(false);

  readonly proximas = computed(() =>
    this.excecoes()
      .filter(e => !e.passada)
      .map(e => this.linha(e))
  );
  readonly passadas = computed(() =>
    this.excecoes()
      .filter(e => e.passada)
      .map(e => this.linha(e))
  );

  constructor() {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erroCarga.set(false);
    try {
      this.excecoes.set(await firstValueFrom(this.service.excecoes()));
      this.carregando.set(false);
    } catch (erro: unknown) {
      this.carregando.set(false);
      this.erroCarga.set(true);
      await this.notificador.erroDaApi(erro, 'Não foi possível carregar as exceções.');
    }
  }

  abrirNova(): void {
    this.painel.set(true);
  }

  fechar(): void {
    this.painel.set(false);
  }

  async salvar(nova: NovaExcecao): Promise<void> {
    if (this.salvando()) {
      return;
    }
    this.salvando.set(true);
    try {
      if (nova.tipo === 'AVULSA') {
        const { tipo: _tipo, ...avulsa } = nova;
        await firstValueFrom(this.service.criarAvulsa(avulsa), { defaultValue: undefined });
      } else {
        const { tipo: _tipo, ...cancelamento } = nova;
        await firstValueFrom(this.service.cancelar(cancelamento), { defaultValue: undefined });
      }
      this.fechar();
      await this.notificador.sucesso('Exceção criada.');
      await this.carregar();
    } catch (erro: unknown) {
      await this.notificador.erroDaApi(erro, 'Não foi possível criar a exceção.');
    } finally {
      this.salvando.set(false);
    }
  }

  async desfazer(excecao: Excecao): Promise<void> {
    if (this.salvando()) {
      return;
    }
    const confirmado = await this.notificador.confirmar(
      'Desfazer esta exceção?',
      'A agenda volta ao normal nesta data.',
      'Desfazer'
    );
    if (!confirmado) {
      return;
    }
    this.salvando.set(true);
    try {
      const chamada =
        excecao.tipo === 'AVULSA'
          ? this.service.removerAvulsa(excecao.id)
          : this.service.desfazerCancelamento(excecao.id);
      await firstValueFrom(chamada, { defaultValue: undefined });
      await this.notificador.sucesso('Exceção desfeita.');
      await this.carregar();
    } catch (erro: unknown) {
      await this.notificador.erroDaApi(erro, 'Não foi possível desfazer a exceção.');
    } finally {
      this.salvando.set(false);
    }
  }

  private linha(e: Excecao): LinhaExcecao {
    const dia = DIAS_SEMANA_CURTOS[diaSemanaIso(e.data) - 1];
    const semana = dia.charAt(0) + dia.slice(1).toLowerCase();
    const diaMes = formatarDiaMes(e.data);
    const aula = e.aula
      ? e.tipo === 'AVULSA'
        ? `${e.aula.inicio.slice(0, 5)}–${e.aula.fim.slice(0, 5)} ${ROTULO_MODALIDADE[e.aula.modalidade]}`
        : `${e.aula.inicio.slice(0, 5)} ${ROTULO_MODALIDADE[e.aula.modalidade]}`
      : 'dia inteiro';
    return {
      excecao: e,
      descricao: `${semana} ${diaMes} · ${aula}`,
      detalhe: e.motivo ? `${ROTULO_TIPO[e.tipo]} · ${e.motivo}` : ROTULO_TIPO[e.tipo],
      rotuloDesfazer: `Desfazer exceção de ${diaMes}`
    };
  }
}
