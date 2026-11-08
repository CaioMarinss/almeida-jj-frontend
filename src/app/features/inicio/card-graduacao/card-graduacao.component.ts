import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonModal, IonSpinner } from '@ionic/angular';
import { LucideAward } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { descreverGrau, descreverGraduacao, formatarDiaMes, formatarMesAno } from '../../../shared/graduacao/descrever';
import { MinhaGraduacao, RegistroGraduacao } from '../../../shared/graduacao/graduacao.model';
import { GraduacaoService } from '../../../shared/graduacao/graduacao.service';
import { BarraFaixaComponent } from '../../../shared/ui/barra-faixa/barra-faixa.component';
import { BotaoComponent } from '../../../shared/ui/botao/botao.component';
import { EstadoVazioComponent } from '../../../shared/ui/estado-vazio/estado-vazio.component';

const LIMITE_RESUMO = 3;

@Component({
  selector: 'app-card-graduacao',
  imports: [IonModal, IonSpinner, LucideAward, BarraFaixaComponent, BotaoComponent, EstadoVazioComponent],
  templateUrl: './card-graduacao.component.html',
  styleUrl: './card-graduacao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardGraduacaoComponent {
  private readonly service = inject(GraduacaoService);

  readonly dados = signal<MinhaGraduacao | null>(null);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly modalAberto = signal(false);

  readonly descricao = computed(() => {
    const atual = this.dados()?.atual;
    return atual ? descreverGraduacao(atual.faixa, atual.grau) : '';
  });
  readonly proxima = computed(() => {
    const data = this.dados()?.proxima;
    return data ? `Próxima graduação: ${formatarDiaMes(data)}` : 'Sem data definida para a próxima graduação';
  });
  readonly presencas = computed(() => {
    const ciclo = this.dados()?.presencas;
    if (!ciclo?.ate) {
      return null;
    }
    return ciclo.minimo === null
      ? `${ciclo.contadas} presenças · mínimo não definido`
      : `${ciclo.contadas} de ${ciclo.minimo} presenças até a graduação de ${formatarDiaMes(ciclo.ate)}`;
  });
  readonly historico = computed(() => this.dados()?.historico ?? []);
  readonly resumo = computed(() => this.historico().slice(0, LIMITE_RESUMO));
  readonly temMais = computed(() => this.historico().length > LIMITE_RESUMO);

  constructor() {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(false);
    try {
      this.dados.set(await firstValueFrom(this.service.minha()));
    } catch {
      this.erro.set(true);
    } finally {
      this.carregando.set(false);
    }
  }

  textoRegistro(r: RegistroGraduacao): string {
    const curta = r.faixa.descricao.replace(/^Faixa\s+/, '');
    return `${curta} · ${descreverGrau(r.faixa, r.grau)} — ${formatarMesAno(r.data)}`;
  }

  abrirHistorico(): void {
    this.modalAberto.set(true);
  }

  fecharHistorico(): void {
    this.modalAberto.set(false);
  }
}
