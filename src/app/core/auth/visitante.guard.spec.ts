import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { SessionService } from './session.service';
import { visitanteGuard } from './visitante.guard';

describe('visitanteGuard', () => {
  const executar = () =>
    TestBed.runInInjectionContext(() => visitanteGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => sessionStorage.clear());

  it('sem sessão libera o login', () => {
    expect(executar()).toBeTrue();
  });

  it('com sessão leva para o início', () => {
    TestBed.inject(SessionService).iniciar('TK', { id: 1, nome: 'Ana', email: 'a@x.com', perfil: 'ALUNO' });

    const resultado = executar();

    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/app/inicio');
  });

  it('com sessão do dono leva para a chamada', () => {
    TestBed.inject(SessionService).iniciar('TK', { id: 1, nome: 'Ana', email: 'a@x.com', perfil: 'DONO' });

    const resultado = executar();

    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/app/chamada');
  });
});
