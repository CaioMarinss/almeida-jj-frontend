import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { Notificador } from '../../../core/notificacao/notificador';
import { descreverGraduacao, formatarNota } from '../../../shared/graduacao/descrever';
import { Apto } from '../../../shared/graduacao/graduacao.model';
import { ExameRegistrado, GraduacaoService } from '../../../shared/graduacao/graduacao.service';
import { BotaoComponent } from '../../../shared/ui/botao/botao.component';

export function lerNota(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.');
  if (!/^\d{1,2}(\.\d)?$/.test(limpo)) {
    return null;
  }
  const nota = Number(limpo);
  return nota >= 0 && nota <= 10 ? nota : null;
}

@Component({
  selector: 'app-exame',
  imports: [BotaoComponent],
  templateUrl: './exame.component.html',
  styleUrl: './exame.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExameComponent implements OnInit {
  private readonly service = inject(GraduacaoService);
  private readonly notificador = inject(Notificador);

  readonly apto = input.required<Apto>();
  readonly liberadoGraduar = input(false);

  readonly salvo = output<ExameRegistrado>();
  readonly removido = output<void>();
  readonly fechar = output<void>();

  readonly aprovado = signal<boolean | null>(null);
  readonly nota = signal('');
  readonly observacao = signal('');
  readonly graduar = signal(true);
  readonly tocouNota = signal(false);
  readonly salvando = signal(false);

  readonly notaLida = computed(() => lerNota(this.nota()));
  readonly notaInvalida = computed(() => this.nota().trim() !== '' && this.notaLida() === null);
  readonly mostrarErroNota = computed(() => this.notaInvalida() || (this.tocouNota() && this.nota().trim() === ''));
  readonly podeSalvar = computed(() => this.aprovado() !== null && this.notaLida() !== null && !this.salvando());
  readonly sugestao = computed(() => this.apto().sugestao);
  readonly mostrarGraduar = computed(
    () => this.aprovado() === true && this.apto().apto && this.liberadoGraduar() && this.sugestao() !== null
  );
  readonly descrever = descreverGraduacao;
  readonly rotuloGraduar = computed(() => {
    const s = this.sugestao();
    return s ? `Já registrar a graduação (${descreverGraduacao(s.faixa, s.grau)})` : '';
  });

  ngOnInit(): void {
    const exame = this.apto().exame;
    if (exame) {
      this.aprovado.set(exame.aprovado);
      this.nota.set(formatarNota(exame.nota));
      this.observacao.set(exame.observacao ?? '');
    }
  }

  salvar(): void {
    this.tocouNota.set(true);
    const nota = this.notaLida();
    const aprovado = this.aprovado();
    if (aprovado === null || nota === null || this.salvando()) {
      return;
    }
    const sugestao = this.sugestao();
    const graduar = this.mostrarGraduar() && this.graduar() && sugestao ? { idGraduacao: sugestao.faixa.id, grau: sugestao.grau } : null;
    this.salvando.set(true);
    this.service
      .registrarExame(this.apto().id, { aprovado, nota, observacao: this.observacao().trim() || null, graduar })
      .subscribe({
        next: (registrado) => {
          this.salvando.set(false);
          this.salvo.emit(registrado);
        },
        error: (erro: unknown) => {
          this.salvando.set(false);
          void this.notificador.erroDaApi(erro, 'Não foi possível salvar o exame.');
        }
      });
  }

  async remover(): Promise<void> {
    if (this.salvando()) {
      return;
    }
    const confirmado = await this.notificador.confirmar(
      'Remover exame',
      `Remover o exame de ${this.apto().nome}?`,
      'Remover exame'
    );
    if (!confirmado) {
      return;
    }
    this.salvando.set(true);
    this.service.removerExame(this.apto().id).subscribe({
      next: () => {
        this.salvando.set(false);
        this.removido.emit();
      },
      error: (erro: unknown) => {
        this.salvando.set(false);
        void this.notificador.erroDaApi(erro, 'Não foi possível remover o exame.');
      }
    });
  }
}
