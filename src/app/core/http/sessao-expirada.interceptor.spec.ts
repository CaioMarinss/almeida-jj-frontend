import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { SessionService } from '../auth/session.service';
import { sessaoExpiradaInterceptor } from './sessao-expirada.interceptor';

describe('sessaoExpiradaInterceptor', () => {
  let http: HttpClient;
  let controle: HttpTestingController;
  let sessao: SessionService;
  let navegar: jasmine.Spy;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([sessaoExpiradaInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    controle = TestBed.inject(HttpTestingController);
    sessao = TestBed.inject(SessionService);
    sessao.iniciar('TK', { id: 1, nome: 'Ana', email: 'a@x.com', perfil: 'ALUNO' });
    navegar = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
  });

  afterEach(() => {
    controle.verify();
    sessionStorage.clear();
  });

  function responder(url: string, status: number): void {
    http.get(url).subscribe({ error: () => undefined });
    controle.expectOne(url).flush({ detail: 'x' }, { status, statusText: 'x' });
  }

  it('401 em rota autenticada encerra a sessão e redireciona', () => {
    responder(`${environment.apiUrl}/alunos/me`, 401);

    expect(sessao.autenticado()).toBeFalse();
    expect(navegar).toHaveBeenCalledWith('/login');
  });

  it('401 no login não encerra a sessão', () => {
    responder(`${environment.apiUrl}/auth/login`, 401);

    expect(sessao.autenticado()).toBeTrue();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('403 não encerra a sessão', () => {
    responder(`${environment.apiUrl}/alunos`, 403);

    expect(sessao.autenticado()).toBeTrue();
    expect(navegar).not.toHaveBeenCalled();
  });
});
