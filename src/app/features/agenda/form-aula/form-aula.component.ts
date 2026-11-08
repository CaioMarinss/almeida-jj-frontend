import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { AulaGrade, EdicaoAula, MODALIDADES, Modalidade, ROTULO_MODALIDADE } from '../../../shared/agenda/agenda.model';
import { BotaoComponent } from '../../../shared/ui/botao/botao.component';
import { DIAS_SEMANA_LONGOS } from '../dias';

@Component({
  selector: 'app-form-aula',
  imports: [BotaoComponent],
  templateUrl: './form-aula.component.html',
  styleUrl: './form-aula.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormAulaComponent {
  readonly aula = input<AulaGrade | null>(null);
  readonly diaSemana = input.required<number>();
  readonly salvando = input(false);

  readonly salvar = output<EdicaoAula>();
  readonly tirar = output<void>();
  readonly cancelar = output<void>();

  readonly modalidades = MODALIDADES;
  readonly rotulo = ROTULO_MODALIDADE;

  private readonly editado = signal<{ inicio?: string; fim?: string; modalidade?: Modalidade }>({});
  readonly tentou = signal(false);

  readonly inicio = computed(() => this.editado().inicio ?? this.aula()?.inicio.slice(0, 5) ?? '');
  readonly fim = computed(() => this.editado().fim ?? this.aula()?.fim.slice(0, 5) ?? '');
  readonly modalidade = computed<Modalidade>(() => this.editado().modalidade ?? this.aula()?.modalidade ?? 'GI');
  readonly titulo = computed(
    () => `${this.aula() ? 'Editar aula' : 'Nova aula'} · ${DIAS_SEMANA_LONGOS[this.diaSemana() - 1]}`
  );

  readonly erro = computed(() => {
    if (!this.tentou()) {
      return null;
    }
    if (!this.inicio() || !this.fim()) {
      return 'Informe o início e o fim.';
    }
    return this.fim() > this.inicio() ? null : 'O fim deve ser depois do início.';
  });

  mudar(campo: 'inicio' | 'fim', valor: string): void {
    this.editado.update(e => ({ ...e, [campo]: valor }));
  }

  escolher(modalidade: Modalidade): void {
    this.editado.update(e => ({ ...e, modalidade }));
  }

  enviar(): void {
    this.tentou.set(true);
    if (this.erro() === null) {
      this.salvar.emit({ inicio: this.inicio(), fim: this.fim(), modalidade: this.modalidade() });
    }
  }
}
