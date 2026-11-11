import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GraduacaoService } from '../../shared/graduacao/graduacao.service';
import { PresencaService } from '../../shared/presenca/presenca.service';
import { codigoDeErro } from '../http/erro-api';

@Injectable({ providedIn: 'root' })
export class ContadoresDonoService {
  private readonly graduacao = inject(GraduacaoService);
  private readonly presenca = inject(PresencaService);

  private readonly _aptos = signal(0);
  private readonly _sumidos = signal(0);

  readonly aptos = this._aptos.asReadonly();
  readonly sumidos = this._sumidos.asReadonly();

  async atualizar(): Promise<void> {
    await Promise.all([this.atualizarAptos(), this.atualizarSumidos()]);
  }

  private async atualizarAptos(): Promise<void> {
    try {
      const lista = await firstValueFrom(this.graduacao.aptos());
      const pendentes = [...lista.grau, ...lista.faixa].filter((a) => a.apto && !a.graduado);
      this._aptos.set(pendentes.length);
    } catch (erro) {
      if (codigoDeErro(erro) === 'ERR033') {
        this._aptos.set(0);
      }
    }
  }

  private async atualizarSumidos(): Promise<void> {
    try {
      const resposta = await firstValueFrom(this.presenca.sumidos());
      this._sumidos.set(resposta.alunos.length);
    } catch {
      return;
    }
  }
}
