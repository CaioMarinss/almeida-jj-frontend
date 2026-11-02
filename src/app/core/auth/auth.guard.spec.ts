import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { SessionService } from './session.service';

describe('authGuard', () => {
  const executar = () =>
    TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => sessionStorage.clear());

  it('sem sessão redireciona para o login', () => {
    const resultado = executar();

    expect(resultado instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/login');
  });

  it('com token expirado limpa a sessão e redireciona para o login', () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 }));
    TestBed.inject(SessionService).iniciar(`h.${payload}.s`, { id: 1, nome: 'Ana', email: 'a@x.com', perfil: 'ALUNO' });

    const resultado = executar();

    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/login');
    expect(TestBed.inject(SessionService).autenticado()).toBeFalse();
  });

  it('com sessão libera', () => {
    TestBed.inject(SessionService).iniciar('TK', { id: 1, nome: 'Ana', email: 'a@x.com', perfil: 'ALUNO' });

    expect(executar()).toBeTrue();
  });
});
