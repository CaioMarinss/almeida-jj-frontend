import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { IonContent, IonHeader, IonSpinner, IonTitle, IonToolbar } from '@ionic/angular';
import { LucideUsers } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { ROTULO_PERFIL } from '../../core/auth/usuario';
import { Notificador } from '../../core/notificacao/notificador';
import { BotaoComponent } from '../../shared/ui/botao/botao.component';
import { EstadoVazioComponent } from '../../shared/ui/estado-vazio/estado-vazio.component';
import { PessoaAcademia, ProfessoresService } from './professores.service';

@Component({
  selector: 'app-professores',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonSpinner, LucideUsers, BotaoComponent, EstadoVazioComponent],
  templateUrl: './professores.component.html',
  styleUrl: './professores.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfessoresComponent {
  private readonly service = inject(ProfessoresService);
  private readonly notificador = inject(Notificador);

  readonly rotulo = ROTULO_PERFIL;
  readonly pessoas = signal<PessoaAcademia[]>([]);
  readonly carregando = signal(true);
  readonly alterando = signal<number | null>(null);

  constructor() {
    void this.carregar();
  }

  async alternar(pessoa: PessoaAcademia): Promise<void> {
    if (this.alterando() !== null || pessoa.perfil === 'DONO') {
      return;
    }
    const promover = pessoa.perfil === 'ALUNO';
    this.alterando.set(pessoa.id);
    try {
      const confirmado = promover
        ? await this.notificador.confirmar('Tornar professor', `Tornar ${pessoa.nome} professor?`, 'Tornar professor')
        : await this.notificador.confirmar(
            'Remover professor',
            `Remover o cargo de professor de ${pessoa.nome}?`,
            'Remover'
          );
      if (!confirmado) {
        return;
      }
      const novo = promover ? 'PROFESSOR' : 'ALUNO';
      await firstValueFrom(this.service.alterarPerfil(pessoa.id, novo), { defaultValue: undefined });
      this.pessoas.update(lista => lista.map(p => (p.id === pessoa.id ? { ...p, perfil: novo } : p)));
      await this.notificador.sucesso(
        promover ? `${pessoa.nome} agora é professor.` : `${pessoa.nome} voltou a ser aluno.`
      );
    } catch (erro: unknown) {
      await this.notificador.erroDaApi(erro, 'Não foi possível alterar o cargo.');
    } finally {
      this.alterando.set(null);
    }
  }

  private async carregar(): Promise<void> {
    try {
      this.pessoas.set(await firstValueFrom(this.service.listar()));
    } catch (erro: unknown) {
      await this.notificador.erroDaApi(erro, 'Não foi possível carregar os alunos.');
    } finally {
      this.carregando.set(false);
    }
  }
}
