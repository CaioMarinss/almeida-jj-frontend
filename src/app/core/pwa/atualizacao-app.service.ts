import { DOCUMENT, inject, Injectable, InjectionToken } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

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
  private readonly recarregar = inject(RECARREGAR_PAGINA);
  private readonly documento = inject(DOCUMENT);

  iniciar(): void {
    if (!this.sw.isEnabled) {
      return;
    }
    this.sw.versionUpdates
      .pipe(filter(evento => evento.type === 'VERSION_READY'))
      .subscribe(() => void this.atualizar());
    this.sw.unrecoverable.subscribe(() => this.recarregar());
    this.documento.addEventListener('visibilitychange', () => {
      if (this.documento.visibilityState === 'visible') {
        this.sw.checkForUpdate().catch(() => false);
      }
    });
  }

  private async atualizar(): Promise<void> {
    await this.sw.activateUpdate();
    this.recarregar();
  }
}
