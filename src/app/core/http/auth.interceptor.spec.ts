import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SessionService } from '../auth/session.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controle: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpClient);
    controle = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controle.verify();
    sessionStorage.clear();
  });

  const logar = () =>
    TestBed.inject(SessionService).iniciar('TK', { id: 1, nome: 'Ana', email: 'a@x.com', perfil: 'ALUNO' });

  it('anexa o Bearer nas chamadas à API', () => {
    logar();
    http.get(`${environment.apiUrl}/alunos/me`).subscribe();

    expect(controle.expectOne(`${environment.apiUrl}/alunos/me`).request.headers.get('Authorization')).toBe('Bearer TK');
  });

  it('não anexa sem token', () => {
    http.get(`${environment.apiUrl}/alunos/me`).subscribe();

    expect(controle.expectOne(`${environment.apiUrl}/alunos/me`).request.headers.has('Authorization')).toBeFalse();
  });

  it('não anexa em URL externa', () => {
    logar();
    http.get('https://outra.com/recurso').subscribe();

    expect(controle.expectOne('https://outra.com/recurso').request.headers.has('Authorization')).toBeFalse();
  });
});
