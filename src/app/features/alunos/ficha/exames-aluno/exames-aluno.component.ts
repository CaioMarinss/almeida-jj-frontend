import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { formatarNota } from '../../../../shared/graduacao/descrever';
import { Exame } from '../../../../shared/graduacao/graduacao.model';

@Component({
  selector: 'app-exames-aluno',
  templateUrl: './exames-aluno.component.html',
  styleUrl: './exames-aluno.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExamesAlunoComponent {
  readonly exames = input.required<Exame[]>();

  readonly nota = formatarNota;

  data(iso: string): string {
    return iso.split('-').reverse().join('/');
  }
}
