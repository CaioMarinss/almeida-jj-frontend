import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

describe('AuthService', () => {
  const base = `${environment.apiUrl}/auth`;
  let service: AuthService;
  let http: HttpTestingController;
  let sessao: SessionService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    sessao = TestBed.inject(SessionService);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('login posta as credenciais e inicia a sessão', () => {
    let emitido: unknown;
    service.login('ana@example.com', 'Senha@1').subscribe(u => (emitido = u));

    const req = http.expectOne(`${base}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'ana@example.com', senha: 'Senha@1' });
    req.flush({ token: 'TK', id: 1, nome: 'Ana', email: 'ana@example.com', perfil: 'PROFESSOR' });

    expect(sessao.token()).toBe('TK');
    expect(sessao.usuario()?.perfil).toBe('PROFESSOR');
    expect(emitido).toEqual({ id: 1, nome: 'Ana', email: 'ana@example.com', perfil: 'PROFESSOR' });
  });

  it('cadastro não inicia sessão', () => {
    service.cadastrar({ nome: 'Ana', cpf: '12345678909', email: 'ana@example.com', senha: 'Senha@1' }).subscribe();

    const req = http.expectOne(`${base}/cadastro`);
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 201, statusText: 'Created' });

    expect(sessao.autenticado()).toBeFalse();
  });

  it('redefinir envia o token no corpo', () => {
    service.redefinirSenha('TK', 'Nova@12').subscribe();

    const req = http.expectOne(`${base}/senha/redefinir`);
    expect(req.request.body).toEqual({ token: 'TK', novaSenha: 'Nova@12' });
    req.flush(null);
  });

  it('verificar envia o token no corpo', () => {
    service.verificarEmail('TK').subscribe();

    const req = http.expectOne(`${base}/verificacao`);
    expect(req.request.body).toEqual({ token: 'TK' });
    req.flush(null);
  });

  it('reenvio e esqueci postam o e-mail', () => {
    service.reenviarVerificacao('ana@example.com').subscribe();
    service.esqueciSenha('ana@example.com').subscribe();

    expect(http.expectOne(`${base}/verificacao/reenvio`).request.body).toEqual({ email: 'ana@example.com' });
    expect(http.expectOne(`${base}/senha/esqueci`).request.body).toEqual({ email: 'ana@example.com' });
  });
});
