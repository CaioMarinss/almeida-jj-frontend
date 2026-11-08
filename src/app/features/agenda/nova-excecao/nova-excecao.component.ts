import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { IonSpinner } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { Notificador } from '../../../core/notificacao/notificador';
import {
  AulaDoDia,
  CLASSE_CHIP_MODALIDADE,
  Modalidade,
  MODALIDADES,
  NovaAvulsa,
  NovoCancelamento,
  ROTULO_MODALIDADE
} from '../../../shared/agenda/agenda.model';
import { AgendaService } from '../../../shared/agenda/agenda.service';
import { hojeEmSaoPaulo } from '../../../shared/graduacao/descrever';
import { BotaoComponent } from '../../../shared/ui/botao/botao.component';

export type TipoNovaExcecao = 'DIA' | 'AULA' | 'AVULSA';

export type NovaExcecao =
  | ({ tipo: 'DIA' } & NovoCancelamento)
  | ({ tipo: 'AULA'; idAula: number } & NovoCancelamento)
  | ({ tipo: 'AVULSA' } & NovaAvulsa);

const TITULO: Record<TipoNovaExcecao, string> = {
  DIA: 'Cancelar o dia inteiro',
  AULA: 'Cancelar uma aula',
  AVULSA: 'Aula avulsa'
};

const DESCRICAO: Record<TipoNovaExcecao, string> = {
  DIA: 'Feriado ou dia sem treino',
  AULA: 'Só uma aula da grade, nesta data',
  AVULSA: 'Um horário extra, só nesta data'
};

@Component({
  selector: 'app-nova-excecao',
  imports: [BotaoComponent, IonSpinner],
  templateUrl: './nova-excecao.component.html',
  styleUrl: './nova-excecao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NovaExcecaoComponent {
  private readonly service = inject(AgendaService);
  private readonly notificador = inject(Notificador);

  readonly salvando = input(false);

  readonly salvar = output<NovaExcecao>();
  readonly cancelar = output<void>();

  readonly hoje = hojeEmSaoPaulo();
  readonly tipos: TipoNovaExcecao[] = ['DIA', 'AULA', 'AVULSA'];
  readonly titulos = TITULO;
  readonly descricoes = DESCRICAO;
  readonly modalidades = MODALIDADES;
  readonly rotulo = ROTULO_MODALIDADE;
  readonly classeChip = CLASSE_CHIP_MODALIDADE;

  readonly tipo = signal<TipoNovaExcecao | null>(null);
  readonly data = signal('');
  readonly motivo = signal('');
  readonly inicio = signal('');
  readonly fim = signal('');
  readonly modalidade = signal<Modalidade>('GI');
  readonly idAula = signal<number | null>(null);
  readonly aulas = signal<AulaDoDia[]>([]);
  readonly buscandoAulas = signal(false);
  readonly aulasBuscadas = signal(false);
  readonly tentou = signal(false);

  private buscaAtual = 0;

  readonly erro = computed<string | null>(() => {
    if (!this.tentou()) {
      return null;
    }
    if (!this.data()) {
      return 'Informe a data.';
    }
    if (this.data() < this.hoje) {
      return 'A data não pode ser passada.';
    }
    if (this.tipo() === 'AULA' && this.idAula() === null) {
      return 'Escolha a aula.';
    }
    if (this.tipo() === 'AVULSA') {
      if (!this.inicio() || !this.fim()) {
        return 'Informe o início e o fim.';
      }
      if (this.fim() <= this.inicio()) {
        return 'O fim deve ser depois do início.';
      }
    }
    return null;
  });

  valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  escolherTipo(tipo: TipoNovaExcecao): void {
    this.tipo.set(tipo);
    this.tentou.set(false);
    this.idAula.set(null);
    this.aulas.set([]);
    this.aulasBuscadas.set(false);
    if (tipo === 'AULA' && this.data()) {
      void this.buscarAulas(this.data());
    }
  }

  voltar(): void {
    this.tipo.set(null);
    this.tentou.set(false);
  }

  async mudarData(valor: string): Promise<void> {
    this.data.set(valor);
    this.idAula.set(null);
    this.aulas.set([]);
    this.aulasBuscadas.set(false);
    if (this.tipo() === 'AULA' && valor && valor >= this.hoje) {
      await this.buscarAulas(valor);
    }
  }

  private async buscarAulas(data: string): Promise<void> {
    const busca = ++this.buscaAtual;
    this.buscandoAulas.set(true);
    try {
      const dias = await firstValueFrom(this.service.agenda(data, data));
      if (busca === this.buscaAtual) {
        this.aulas.set((dias[0]?.aulas ?? []).filter(a => !a.avulsa && !a.cancelada));
        this.aulasBuscadas.set(true);
      }
    } catch (erro: unknown) {
      if (busca === this.buscaAtual) {
        await this.notificador.erroDaApi(erro, 'Não foi possível carregar as aulas do dia.');
      }
    } finally {
      if (busca === this.buscaAtual) {
        this.buscandoAulas.set(false);
      }
    }
  }

  enviar(): void {
    this.tentou.set(true);
    if (this.erro() !== null || this.salvando()) {
      return;
    }
    const data = this.data();
    const motivo = this.motivo().trim();
    const extra = motivo ? { motivo } : {};
    switch (this.tipo()) {
      case 'DIA':
        this.salvar.emit({ tipo: 'DIA', data, ...extra });
        break;
      case 'AULA':
        this.salvar.emit({ tipo: 'AULA', data, idAula: this.idAula()!, ...extra });
        break;
      case 'AVULSA':
        this.salvar.emit({
          tipo: 'AVULSA',
          data,
          inicio: this.inicio(),
          fim: this.fim(),
          modalidade: this.modalidade(),
          ...extra
        });
        break;
    }
  }
}
