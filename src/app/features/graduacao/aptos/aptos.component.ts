import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { codigoDeErro } from '../../../core/http/erro-api';
import { Notificador } from '../../../core/notificacao/notificador';
import { descreverGraduacao, formatarDiaMes, hojeEmSaoPaulo } from '../../../shared/graduacao/descrever';
import { Apto, Faixa, ListaAptos } from '../../../shared/graduacao/graduacao.model';
import { EscolhaGraduacao, GraduacaoService } from '../../../shared/graduacao/graduacao.service';
import { BarraFaixaComponent } from '../../../shared/ui/barra-faixa/barra-faixa.component';
import { BotaoComponent } from '../../../shared/ui/botao/botao.component';

type Estado = 'carregando' | 'pronto' | 'semEvento' | 'erro';

@Component({
  selector: 'app-aptos',
  imports: [BarraFaixaComponent, BotaoComponent],
  templateUrl: './aptos.component.html',
  styleUrl: './aptos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AptosComponent implements OnInit {
  private readonly service = inject(GraduacaoService);
  private readonly notificador = inject(Notificador);

  readonly descrever = descreverGraduacao;
  readonly formatar = formatarDiaMes;

  readonly estado = signal<Estado>('carregando');
  readonly dados = signal<ListaAptos | null>(null);
  readonly selecionado = signal<Apto | null>(null);
  readonly idFaixa = signal<number | null>(null);
  readonly grauEscolhido = signal(0);
  readonly salvando = signal(false);
  readonly erroFaixas = signal(false);

  private readonly faixas = signal<Faixa[]>([]);
  readonly infantis = computed(() => this.faixas().filter((f) => f.categoria === 'INFANTIL'));
  readonly adultas = computed(() => this.faixas().filter((f) => f.categoria === 'ADULTO'));
  readonly mestres = computed(() => this.faixas().filter((f) => f.categoria === 'MESTRE'));

  readonly liberado = computed(() => {
    const evento = this.dados()?.evento;
    return !!evento && hojeEmSaoPaulo() >= evento.data;
  });
  readonly trilhas = computed(() => {
    const dados = this.dados();
    return dados
      ? [
          { titulo: 'Troca de grau', id: 'trilha-grau', alunos: this.ordenar(dados.grau) },
          { titulo: 'Troca de faixa', id: 'trilha-faixa', alunos: this.ordenar(dados.faixa) }
        ]
      : [];
  });

  readonly faixaEscolhida = computed<Faixa | null>(() => this.faixas().find((f) => f.id === this.idFaixa()) ?? null);
  readonly opcoesGrau = computed(() => {
    const f = this.faixaEscolhida();
    return f ? Array.from({ length: f.grauMax - f.grauMin + 1 }, (_, i) => f.grauMin + i) : [];
  });
  readonly grau = computed(() => {
    const f = this.faixaEscolhida();
    return f ? Math.min(Math.max(this.grauEscolhido(), f.grauMin), f.grauMax) : 0;
  });
  readonly podeConfirmar = computed(() => this.faixaEscolhida() !== null && !this.salvando());

  ngOnInit(): void {
    this.carregar();
    this.carregarFaixas();
  }

  carregar(): void {
    this.estado.set('carregando');
    this.service.aptos().subscribe({
      next: (lista) => {
        this.dados.set(lista);
        this.estado.set('pronto');
      },
      error: (erro: unknown) => {
        if (codigoDeErro(erro) === 'ERR033') {
          this.dados.set(null);
          this.estado.set('semEvento');
          return;
        }
        this.estado.set('erro');
        void this.notificador.erroDaApi(erro, 'Não foi possível carregar os aptos.');
      }
    });
  }

  carregarFaixas(): void {
    this.erroFaixas.set(false);
    this.service.faixas().subscribe({
      next: (lista) => {
        this.faixas.set(lista);
        if (this.idFaixa() === null) {
          this.preencher();
        }
      },
      error: () => this.erroFaixas.set(true)
    });
  }

  abrir(apto: Apto): void {
    this.selecionado.set(apto);
    this.preencher();
  }

  voltar(): void {
    this.selecionado.set(null);
  }

  trocarFaixa(valor: string): void {
    this.idFaixa.set(valor === '' ? null : Number(valor));
    this.grauEscolhido.set(this.faixaEscolhida()?.grauMin ?? 0);
  }

  trocarGrau(valor: string): void {
    this.grauEscolhido.set(Number(valor));
  }

  rotuloGrau(grau: number): string {
    return this.faixaEscolhida()?.categoria !== 'MESTRE' && grau === 0 ? 'Sem graus' : `${grau}º grau`;
  }

  faltam(apto: Apto): number {
    return Math.max((apto.minimo ?? 0) - apto.contadas, 0);
  }

  confirmar(): void {
    const apto = this.selecionado();
    const faixa = this.faixaEscolhida();
    if (!apto || !faixa || this.salvando()) {
      return;
    }
    this.salvando.set(true);
    this.service.graduou(apto.id, this.escolha(apto, faixa)).subscribe({
      next: () => {
        this.salvando.set(false);
        this.selecionado.set(null);
        void this.notificador.sucesso(`${apto.nome} graduou.`);
        this.carregar();
      },
      error: (erro: unknown) => {
        this.salvando.set(false);
        void this.notificador.erroDaApi(erro, 'Não foi possível registrar a graduação.');
        const codigo = codigoDeErro(erro);
        if (codigo === 'ERR031' || codigo === 'ERR032') {
          this.selecionado.set(null);
          this.carregar();
        }
      }
    });
  }

  private escolha(apto: Apto, faixa: Faixa): EscolhaGraduacao | undefined {
    const grau = this.grau();
    const sugestao = apto.sugestao;
    return sugestao && sugestao.faixa.id === faixa.id && sugestao.grau === grau ? undefined : { idGraduacao: faixa.id, grau };
  }

  private preencher(): void {
    const sugestao = this.selecionado()?.sugestao ?? null;
    this.idFaixa.set(sugestao?.faixa.id ?? null);
    this.grauEscolhido.set(sugestao?.grau ?? 0);
  }

  private ordenar(lista: Apto[]): Apto[] {
    return [...lista].sort((a, b) => Number(b.apto) - Number(a.apto) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }
}
