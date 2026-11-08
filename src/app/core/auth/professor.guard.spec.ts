import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { professorGuard } from './professor.guard';
import { SessionService } from './session.service';
import { Perfil } from './usuario';

describe('professorGuard', () => {
  const executar = () =>
    TestBed.runInInjectionContext(() => professorGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

  const logarComo = (perfil: Perfil) =>
    TestBed.inject(SessionService).iniciar('TK', { id: 1, nome: 'Ana', email: 'a@x.com', perfil });

  const destino = (resultado: ReturnType<typeof executar>) =>
    TestBed.inject(Router).serializeUrl(resultado as UrlTree);

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => sessionStorage.clear());

  it('libera o dono', () => {
    logarComo('DONO');

    expect(executar()).toBeTrue();
  });

  it('libera o professor', () => {
    logarComo('PROFESSOR');

    expect(executar()).toBeTrue();
  });

  it('manda o aluno para o início', () => {
    logarComo('ALUNO');

    expect(destino(executar())).toBe('/app/inicio');
  });

  it('sem sessão manda para o início', () => {
    expect(destino(executar())).toBe('/app/inicio');
  });
});
