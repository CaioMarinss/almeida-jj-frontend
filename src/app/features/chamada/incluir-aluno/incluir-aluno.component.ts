import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { LucideCheck } from '@lucide/angular';
import { compararNomes, contemNome } from '../../../shared/utils/texto.util';
import { PessoaAcademia } from '../../../shared/alunos/alunos.model';

@Component({
  selector: 'app-incluir-aluno',
  imports: [LucideCheck],
  templateUrl: './incluir-aluno.component.html',
  styleUrl: './incluir-aluno.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IncluirAlunoComponent {
  readonly pessoas = input.required<PessoaAcademia[]>();
  readonly salvando = input(false);
  readonly escolher = output<PessoaAcademia[]>();
  readonly fechar = output<void>();

  readonly busca = signal('');
  private readonly marcados = signal<ReadonlySet<number>>(new Set());

  readonly filtradas = computed(() =>
    [...this.pessoas()].filter(p => contemNome(p.nome, this.busca())).sort(compararNomes)
  );
  readonly escolhidas = computed(() =>
    [...this.pessoas()].filter(p => this.marcados().has(p.id)).sort(compararNomes)
  );
  readonly rotuloIncluir = computed(() => {
    const n = this.escolhidas().length;
    return n === 0 ? 'Incluir' : n === 1 ? 'Incluir 1 aluno' : `Incluir ${n} alunos`;
  });

  marcado(pessoa: PessoaAcademia): boolean {
    return this.marcados().has(pessoa.id);
  }

  alternar(pessoa: PessoaAcademia): void {
    this.marcados.update(atual => {
      const novo = new Set(atual);
      if (!novo.delete(pessoa.id)) {
        novo.add(pessoa.id);
      }
      return novo;
    });
  }

  confirmar(): void {
    const escolhidas = this.escolhidas();
    if (escolhidas.length > 0 && !this.salvando()) {
      this.escolher.emit(escolhidas);
    }
  }
}
