import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { MinhasPresencas } from '../../../shared/presenca/presenca.model';
import { pluralPresencas } from '../../../shared/presenca/plural';
import { PresencaService } from '../../../shared/presenca/presenca.service';
import { itemDePresenca, resumirCiclo } from '../../../shared/presenca/resumo';
import { BotaoComponent } from '../../../shared/ui/botao/botao.component';

const LIMITE_INICIAL = 5;

@Component({
  selector: 'app-presencas-aluno',
  imports: [BotaoComponent],
  templateUrl: './presencas-aluno.component.html',
  styleUrl: './presencas-aluno.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PresencasAlunoComponent implements OnInit {
  private readonly service = inject(PresencaService);

  readonly idAluno = input.required<number>();

  readonly dados = signal<MinhasPresencas | null>(null);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly expandido = signal(false);

  readonly resumo = computed(() => {
    const dados = this.dados();
    if (!dados) {
      return null;
    }
    return dados.ciclo
      ? resumirCiclo(dados.ciclo, 'Já atingiu o mínimo')
      : { titulo: `${pluralPresencas(dados.presencas.length)} desde a última graduação`, faltam: null };
  });
  private readonly itens = computed(() => (this.dados()?.presencas ?? []).map(itemDePresenca));
  readonly visiveis = computed(() => (this.expandido() ? this.itens() : this.itens().slice(0, LIMITE_INICIAL)));
  readonly temMais = computed(() => !this.expandido() && this.itens().length > LIMITE_INICIAL);

  ngOnInit(): void {
    this.carregar();
  }

  verTodas(): void {
    this.expandido.set(true);
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(false);
    this.service.doAluno(this.idAluno()).subscribe({
      next: dados => {
        this.dados.set(dados);
        this.carregando.set(false);
      },
      error: () => {
        this.carregando.set(false);
        this.erro.set(true);
      }
    });
  }
}
