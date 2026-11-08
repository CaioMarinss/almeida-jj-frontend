import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Notificador } from '../../../core/notificacao/notificador';
import { formatarDiaMes, hojeEmSaoPaulo } from '../../../shared/graduacao/descrever';
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

  readonly data = signal<string | null>(null);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly editando = signal(false);
  readonly rascunho = signal('');
  readonly minimo = signal(hojeEmSaoPaulo());
  readonly salvando = signal(false);
  readonly formatar = formatarDiaMes;

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.service.proxima().subscribe({
      next: (proxima) => {
        this.data.set(proxima?.data ?? null);
        this.carregando.set(false);
      },
      error: (erro: unknown) => {
        this.carregando.set(false);
        this.erro.set(true);
        void this.notificador.erroDaApi(erro, 'Não foi possível carregar a próxima graduação.');
      }
    });
  }

  abrir(): void {
    this.minimo.set(hojeEmSaoPaulo());
    this.rascunho.set(this.data() ?? '');
    this.editando.set(true);
  }

  fechar(): void {
    this.editando.set(false);
  }

  salvar(): void {
    const escolhida = this.rascunho();
    if (!escolhida || this.salvando()) {
      return;
    }
    this.salvando.set(true);
    this.service.agendar(escolhida, null, null).subscribe({
      next: ({ data }) => {
        this.data.set(data);
        this.salvando.set(false);
        this.editando.set(false);
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
        this.data.set(null);
        this.editando.set(false);
        void this.notificador.sucesso('Data da próxima graduação cancelada.');
      },
      error: (erro: unknown) => {
        void this.notificador.erroDaApi(erro, 'Não foi possível cancelar a data.');
      }
    });
  }
}
