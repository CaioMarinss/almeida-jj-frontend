import { DOCUMENT, inject, Injectable, InjectionToken } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';
import { Notificador } from '../notificacao/notificador';

export const RECARREGAR_PAGINA = new InjectionToken<() => void>('RECARREGAR_PAGINA', {
  providedIn: 'root',
  factory: () => {
    const documento = inject(DOCUMENT);
    return () => documento.location.reload();
  }
});

@Injectable({ providedIn: 'root' })
export class AtualizacaoAppService {
  private readonly sw = inject(SwUpdate);
  private readonly notificador = inject(Notificador);
  private readonly recarregar = inject(RECARREGAR_PAGINA);
  private readonly documento = inject(DOCUMENT);

  iniciar(): void {
    if (!this.sw.isEnabled) {
      return;
    }
    this.sw.versionUpdates
      .pipe(filter(evento => evento.type === 'VERSION_READY'))
      .subscribe(() => void this.oferecerAtualizacao());
    this.sw.unrecoverable.subscribe(() => this.recarregar());
    this.documento.addEventListener('visibilitychange', () => {
      if (this.documento.visibilityState === 'visible') {
        this.sw.checkForUpdate().catch(() => false);
      }
    });
  }

  private async oferecerAtualizacao(): Promise<void> {
    const confirmado = await this.notificador.confirmar(
      'Nova versão',
      'Há uma versão nova do app. Atualizar agora?',
      'Atualizar'
    );
    if (confirmado) {
      await this.sw.activateUpdate();
      this.recarregar();
    }
  }
}
