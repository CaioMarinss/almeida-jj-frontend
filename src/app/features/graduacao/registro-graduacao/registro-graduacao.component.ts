import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { LucideTrash2 } from '@lucide/angular';
import { codigoDeErro } from '../../../core/http/erro-api';
import { Notificador } from '../../../core/notificacao/notificador';
import { descreverGraduacao, formatarMesAno, hojeEmSaoPaulo } from '../../../shared/graduacao/descrever';
import { AlunoGraduacao, Faixa, RegistroGraduacao } from '../../../shared/graduacao/graduacao.model';
import { GraduacaoService } from '../../../shared/graduacao/graduacao.service';
import { BotaoComponent } from '../../../shared/ui/botao/botao.component';

@Component({
  selector: 'app-registro-graduacao',
  imports: [BotaoComponent, LucideTrash2],
  templateUrl: './registro-graduacao.component.html',
  styleUrl: './registro-graduacao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistroGraduacaoComponent implements OnInit {
  private readonly service = inject(GraduacaoService);
  private readonly notificador = inject(Notificador);

  readonly aluno = input.required<AlunoGraduacao>();

  readonly hoje = hojeEmSaoPaulo();
  readonly descrever = descreverGraduacao;
  readonly mesAno = formatarMesAno;

  readonly historico = signal<RegistroGraduacao[]>([]);
  readonly carregandoHistorico = signal(true);
  readonly erroHistorico = signal(false);
  readonly erroFaixas = signal(false);
  readonly idFaixa = signal<number | null>(null);
  readonly grauEscolhido = signal(0);
  readonly data = signal(this.hoje);
  readonly salvando = signal(false);
  readonly removendo = signal(false);

  private readonly faixas = signal<Faixa[]>([]);
  readonly infantis = computed(() => this.faixas().filter((f) => f.categoria === 'INFANTIL'));
  readonly adultas = computed(() => this.faixas().filter((f) => f.categoria === 'ADULTO'));
  readonly mestres = computed(() => this.faixas().filter((f) => f.categoria === 'MESTRE'));

  readonly faixa = computed<Faixa | null>(() => {
    const todas = this.faixas();
    const atual = this.aluno().atual?.faixa.id;
    return todas.find((f) => f.id === (this.idFaixa() ?? atual)) ?? todas[0] ?? null;
  });
  readonly opcoesGrau = computed(() => {
    const f = this.faixa();
    return f ? Array.from({ length: f.grauMax - f.grauMin + 1 }, (_, i) => f.grauMin + i) : [];
  });
  readonly grau = computed(() => {
    const f = this.faixa();
    if (!f) {
      return 0;
    }
    const inicial = this.idFaixa() === null ? (this.aluno().atual?.grau ?? f.grauMin) : this.grauEscolhido();
    return Math.min(Math.max(inicial, f.grauMin), f.grauMax);
  });
  readonly dataValida = computed(() => /^\d{4}-\d{2}-\d{2}$/.test(this.data()) && this.data() <= this.hoje);
  readonly dataPassada = computed(() => {
    const atual = this.historico()[0];
    return this.dataValida() && atual !== undefined && this.data() < atual.data;
  });

  ngOnInit(): void {
    this.carregarFaixas();
    this.carregarHistorico();
  }

  carregarFaixas(): void {
    this.erroFaixas.set(false);
    this.service.faixas().subscribe({
      next: (lista) => this.faixas.set(lista),
      error: () => this.erroFaixas.set(true)
    });
  }

  trocarFaixa(valor: string): void {
    this.idFaixa.set(Number(valor));
    this.grauEscolhido.set(0);
  }

  trocarGrau(valor: string): void {
    this.idFaixa.set(this.faixa()?.id ?? null);
    this.grauEscolhido.set(Number(valor));
  }

  rotuloGrau(grau: number): string {
    return this.faixa()?.categoria !== 'MESTRE' && grau === 0 ? 'Sem graus' : `${grau}º grau`;
  }

  salvar(): void {
    const faixa = this.faixa();
    if (!faixa || !this.dataValida() || this.salvando() || this.removendo()) {
      return;
    }
    this.salvando.set(true);
    this.service.registrar(this.aluno().id, { idGraduacao: faixa.id, grau: this.grau(), data: this.data() }).subscribe({
      next: () => {
        this.salvando.set(false);
        void this.notificador.sucesso('Graduação registrada.');
        this.carregarHistorico();
      },
      error: (erro: unknown) => {
        this.salvando.set(false);
        void this.notificador.erroDaApi(erro, 'Não foi possível registrar a graduação.');
      }
    });
  }

  async remover(registro: RegistroGraduacao): Promise<void> {
    if (this.removendo() || this.salvando()) {
      return;
    }
    const confirmado = await this.notificador.confirmar('Remover registro?', this.mensagemDeRemocao(registro), 'Remover');
    if (!confirmado) {
      return;
    }
    this.removendo.set(true);
    this.service.remover(this.aluno().id, registro.id).subscribe({
      next: () => {
        this.removendo.set(false);
        this.historico.update((lista) => lista.filter((r) => r.id !== registro.id));
        void this.notificador.sucesso('Registro removido.');
      },
      error: (erro: unknown) => {
        this.removendo.set(false);
        void this.notificador.erroDaApi(erro, 'Não foi possível remover o registro.');
        if (codigoDeErro(erro) === 'ERR015') {
          this.carregarHistorico();
        }
      }
    });
  }

  rotuloRemover(registro: RegistroGraduacao): string {
    return `Remover registro ${descreverGraduacao(registro.faixa, registro.grau)} de ${formatarMesAno(registro.data)}`;
  }

  private mensagemDeRemocao(registro: RegistroGraduacao): string {
    const lista = this.historico();
    if (lista[0]?.id !== registro.id) {
      return 'A faixa atual não muda.';
    }
    const anterior = lista[1];
    const destino = anterior ? `volta para ${descreverGraduacao(anterior.faixa, anterior.grau)}` : 'fica Sem graduação';
    return `Esta é a faixa atual de ${this.aluno().nome}: ela ${destino}.`;
  }

  carregarHistorico(): void {
    this.carregandoHistorico.set(true);
    this.erroHistorico.set(false);
    this.service.historicoDe(this.aluno().id).subscribe({
      next: (lista) => {
        this.historico.set(lista);
        this.carregandoHistorico.set(false);
      },
      error: () => {
        this.carregandoHistorico.set(false);
        this.erroHistorico.set(true);
      }
    });
  }
}
