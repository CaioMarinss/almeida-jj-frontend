import { TestBed } from '@angular/core/testing';
import { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { criarNotificador } from '../../features/auth/testes-auth';
import { Notificador } from '../notificacao/notificador';
import { AtualizacaoAppService, RECARREGAR_PAGINA } from './atualizacao-app.service';

describe('AtualizacaoAppService', () => {
  let versoes: Subject<VersionEvent>;
  let irrecuperavel: Subject<UnrecoverableStateEvent>;
  let sw: { isEnabled: boolean; versionUpdates: Subject<VersionEvent>; unrecoverable: Subject<UnrecoverableStateEvent>; activateUpdate: jasmine.Spy; checkForUpdate: jasmine.Spy };
  let notificador: ReturnType<typeof criarNotificador>;
  let recarregar: jasmine.Spy;

  function configurar(habilitado = true): AtualizacaoAppService {
    versoes = new Subject();
    irrecuperavel = new Subject();
    sw = {
      isEnabled: habilitado,
      versionUpdates: versoes,
      unrecoverable: irrecuperavel,
      activateUpdate: jasmine.createSpy('activateUpdate').and.resolveTo(true),
      checkForUpdate: jasmine.createSpy('checkForUpdate').and.resolveTo(false)
    };
    notificador = criarNotificador();
    recarregar = jasmine.createSpy('recarregar');
    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: sw },
        { provide: Notificador, useValue: notificador },
        { provide: RECARREGAR_PAGINA, useValue: recarregar }
      ]
    });
    return TestBed.inject(AtualizacaoAppService);
  }

  const versaoPronta = (): VersionEvent => ({
    type: 'VERSION_READY',
    currentVersion: { hash: 'a' },
    latestVersion: { hash: 'b' }
  });
  const aguardar = () => new Promise(r => setTimeout(r));

  it('versão nova confirmada ativa e recarrega', async () => {
    configurar().iniciar();

    versoes.next(versaoPronta());
    await aguardar();

    expect(notificador.confirmar).toHaveBeenCalledTimes(1);
    expect(sw.activateUpdate).toHaveBeenCalled();
    expect(recarregar).toHaveBeenCalled();
  });

  it('versão nova recusada não recarrega', async () => {
    configurar().iniciar();
    notificador.confirmar.and.resolveTo(false);

    versoes.next(versaoPronta());
    await aguardar();

    expect(sw.activateUpdate).not.toHaveBeenCalled();
    expect(recarregar).not.toHaveBeenCalled();
  });

  it('estado irrecuperável recarrega a página', () => {
    configurar().iniciar();

    irrecuperavel.next({ type: 'UNRECOVERABLE_STATE', reason: 'x' });

    expect(recarregar).toHaveBeenCalled();
  });

  it('procura versão nova quando o app volta a ficar visível', () => {
    configurar().iniciar();

    document.dispatchEvent(new Event('visibilitychange'));

    expect(sw.checkForUpdate).toHaveBeenCalled();
  });

  it('sem service worker não faz nada', async () => {
    configurar(false).iniciar();

    versoes.next(versaoPronta());
    irrecuperavel.next({ type: 'UNRECOVERABLE_STATE', reason: 'x' });
    await aguardar();

    expect(notificador.confirmar).not.toHaveBeenCalled();
    expect(recarregar).not.toHaveBeenCalled();
  });
});
