import { ChangeDetectionStrategy, Component, computed, inject, OnInit, output, signal } from '@angular/core';
import { Notificador } from '../../../core/notificacao/notificador';
import { formatarDiaMes, hojeEmSaoPaulo } from '../../../shared/graduacao/descrever';
import { ProximaGraduacao } from '../../../shared/graduacao/graduacao.model';
import { GraduacaoService } from '../../../shared/graduacao/graduacao.service';
import { BotaoComponent } from '../../../shared/ui/botao/botao.component';

@Component({
  selector: 'app-proxima-graduacao',
  imports: [BotaoComponent],
  templateUrl: './proxima-graduacao.component.html',
  styleUrl: './proxima-graduacao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProximaGraduacaoComponent implements OnInit {
  private readonly service = inject(GraduacaoService);
  private readonly notificador = inject(Notificador);

  readonly alterada = output<void>();

  readonly data = signal<string | null>(null);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly editando = signal(false);
  readonly rascunho = signal('');
  readonly minimoGrau = signal<number | null>(null);
  readonly minimoFaixa = signal<number | null>(null);
  readonly rascunhoGrau = signal('');
  readonly rascunhoFaixa = signal('');
  readonly minimo = signal(hojeEmSaoPaulo());
  readonly salvando = signal(false);
  readonly formatar = formatarDiaMes;
  readonly minimosDefinidos = computed(() => this.minimoGrau() !== null && this.minimoFaixa() !== null);
  readonly formularioValido = computed(
    () => !!this.rascunho() && inteiroNaoNegativo(this.rascunhoGrau()) && inteiroNaoNegativo(this.rascunhoFaixa())
  );

  ngOnInit(): void {
    this.carregar();
  }

  atualizar(): void {
    this.carregar(true);
  }

  carregar(silencioso = false): void {
    const semDados = !silencioso || this.erro() || this.carregando();
    if (semDados) {
      this.carregando.set(true);
      this.erro.set(false);
    }
    this.service.proxima().subscribe({
      next: (proxima) => {
        this.aplicar(proxima);
        this.carregando.set(false);
      },
      error: (erro: unknown) => {
        if (!semDados) {
          return;
        }
        this.carregando.set(false);
        this.erro.set(true);
        void this.notificador.erroDaApi(erro, 'Não foi possível carregar a próxima graduação.');
      }
    });
  }

  abrir(): void {
    this.minimo.set(hojeEmSaoPaulo());
    this.rascunho.set(this.data() ?? '');
    this.rascunhoGrau.set(this.minimoGrau()?.toString() ?? '');
    this.rascunhoFaixa.set(this.minimoFaixa()?.toString() ?? '');
    this.editando.set(true);
  }

  fechar(): void {
    this.editando.set(false);
  }

  salvar(): void {
    if (!this.formularioValido() || this.salvando()) {
      return;
    }
    this.salvando.set(true);
    this.service.agendar(this.rascunho(), Number(this.rascunhoGrau()), Number(this.rascunhoFaixa())).subscribe({
      next: (agendada) => {
        const { data } = agendada;
        this.aplicar(agendada);
        this.salvando.set(false);
        this.editando.set(false);
        this.alterada.emit();
        void this.notificador.sucesso(`Próxima graduação agendada para ${formatarDiaMes(data)}.`);
      },
      error: (erro: unknown) => {
        this.salvando.set(false);
        void this.notificador.erroDaApi(erro, 'Não foi possível agendar a próxima graduação.');
      }
    });
  }

  async cancelar(): Promise<void> {
    const confirmado = await this.notificador.confirmar(
      'Cancelar graduação',
      'Cancelar a data agendada para a próxima graduação?',
      'Cancelar data'
    );
    if (!confirmado) {
      return;
    }
    this.service.cancelar().subscribe({
      next: () => {
        this.aplicar(null);
        this.editando.set(false);
        this.alterada.emit();
        void this.notificador.sucesso('Data da próxima graduação cancelada.');
      },
      error: (erro: unknown) => {
        void this.notificador.erroDaApi(erro, 'Não foi possível cancelar a data.');
      }
    });
  }

  private aplicar(proxima: ProximaGraduacao | null): void {
    this.data.set(proxima?.data ?? null);
    this.minimoGrau.set(proxima?.minimoGrau ?? null);
    this.minimoFaixa.set(proxima?.minimoFaixa ?? null);
  }
}

function inteiroNaoNegativo(valor: string): boolean {
  return /^\d+$/.test(valor.trim());
}
