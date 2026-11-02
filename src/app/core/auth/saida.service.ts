import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Notificador } from '../notificacao/notificador';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class SaidaService {
  private readonly sessao = inject(SessionService);
  private readonly notificador = inject(Notificador);
  private readonly router = inject(Router);

  async sair(): Promise<void> {
    if (!(await this.notificador.confirmar('Sair', 'Deseja sair da sua conta?', 'Sair'))) {
      return;
    }
    this.sessao.encerrar();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
