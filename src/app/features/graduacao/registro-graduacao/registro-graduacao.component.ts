import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { Notificador } from '../../../core/notificacao/notificador';
import { descreverGraduacao, formatarMesAno, hojeLocal } from '../../../shared/graduacao/descrever';
import { AlunoGraduacao, Faixa, RegistroGraduacao } from '../../../shared/graduacao/graduacao.model';
import { GraduacaoService } from '../../../shared/graduacao/graduacao.service';
import { BotaoComponent } from '../../../shared/ui/botao/botao.component';

@Component({
  selector: 'app-registro-graduacao',
  imports: [BotaoComponent],
  templateUrl: './registro-graduacao.component.html',
  styleUrl: './registro-graduacao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegistroGraduacaoComponent implements OnInit {
  private readonly service = inject(GraduacaoService);
  private readonly notificador = inject(Notificador);

  readonly aluno = input.required<AlunoGraduacao>();
  readonly registrado = output<RegistroGraduacao>();

  readonly hoje = hojeLocal();
  readonly descrever = descreverGraduacao;
  readonly mesAno = formatarMesAno;

  readonly historico = signal<RegistroGraduacao[]>([]);
  readonly carregandoHistorico = signal(true);
  readonly idFaixa = signal<number | null>(null);
  readonly grauEscolhido = signal(0);
  readonly data = signal(this.hoje);
  readonly salvando = signal(false);

  private readonly faixas = toSignal(this.service.faixas().pipe(catchError(() => of<Faixa[]>([]))), {
    initialValue: [] as Faixa[]
  });
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
  readonly dataPassada = computed(() => this.dataValida() && this.data() < this.hoje);

  ngOnInit(): void {
    this.carregarHistorico();
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
    if (!faixa || !this.dataValida() || this.salvando()) {
      return;
    }
    this.salvando.set(true);
    this.service.registrar(this.aluno().id, { idGraduacao: faixa.id, grau: this.grau(), data: this.data() }).subscribe({
      next: (registro) => {
        this.salvando.set(false);
        void this.notificador.sucesso('Graduação registrada.');
        this.registrado.emit(registro);
        this.carregarHistorico();
      },
      error: (erro: unknown) => {
        this.salvando.set(false);
        void this.notificador.erroDaApi(erro, 'Não foi possível registrar a graduação.');
      }
    });
  }

  private carregarHistorico(): void {
    this.service.historicoDe(this.aluno().id).subscribe({
      next: (lista) => {
        this.historico.set(lista);
        this.carregandoHistorico.set(false);
      },
      error: () => {
        this.carregandoHistorico.set(false);
      }
    });
  }
}
