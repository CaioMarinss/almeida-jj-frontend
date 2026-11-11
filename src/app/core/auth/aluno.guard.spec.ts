import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { alunoGuard } from './aluno.guard';
import { SessionService } from './session.service';
import { Perfil } from './usuario';

describe('alunoGuard', () => {
  const executar = () =>
    TestBed.runInInjectionContext(() => alunoGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

  const logarComo = (perfil: Perfil) =>
    TestBed.inject(SessionService).iniciar('TK', { id: 1, nome: 'Ana', email: 'a@x.com', perfil });

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => sessionStorage.clear());

  it('libera aluno e professor', () => {
    logarComo('ALUNO');
    expect(executar()).toBeTrue();
    logarComo('PROFESSOR');
    expect(executar()).toBeTrue();
  });

  it('manda o dono para a chamada', () => {
    logarComo('DONO');

    expect(TestBed.inject(Router).serializeUrl(executar() as UrlTree)).toBe('/app/chamada');
  });
});
