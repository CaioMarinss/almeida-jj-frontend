import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { compararNomes, contemNome } from '../../../shared/utils/texto.util';
import { PessoaAcademia } from '../../professores/professores.service';

@Component({
  selector: 'app-incluir-aluno',
  templateUrl: './incluir-aluno.component.html',
  styleUrl: './incluir-aluno.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IncluirAlunoComponent {
  readonly pessoas = input.required<PessoaAcademia[]>();
  readonly salvando = input(false);
  readonly escolher = output<PessoaAcademia>();
  readonly fechar = output<void>();

  readonly busca = signal('');
  readonly filtradas = computed(() =>
    [...this.pessoas()].filter(p => contemNome(p.nome, this.busca())).sort(compararNomes)
  );
}
