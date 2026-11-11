import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AlunosService } from './alunos.service';

describe('AlunosService', () => {
  let http: HttpTestingController;
  let service: AlunosService;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AlunosService);
  });

  afterEach(() => http.verify());

  it('busca o painel com GET em /alunos/painel', () => {
    let resposta: unknown;
    service.painel().subscribe((v) => (resposta = v));
    const req = http.expectOne(`${api}/alunos/painel`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
    expect(resposta).toEqual([]);
  });

  it('lista as pessoas com GET em /alunos', () => {
    let resposta: unknown;
    service.listar().subscribe((v) => (resposta = v));
    const req = http.expectOne(`${api}/alunos`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 2, nome: 'Bia', email: 'bia@x.com', perfil: 'ALUNO' }]);
    expect(resposta).toEqual([{ id: 2, nome: 'Bia', email: 'bia@x.com', perfil: 'ALUNO' }]);
  });

  it('altera o cargo com PUT em /alunos/{id}/perfil', () => {
    service.alterarPerfil(2, 'PROFESSOR').subscribe();
    const req = http.expectOne(`${api}/alunos/2/perfil`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ perfil: 'PROFESSOR' });
    req.flush(null);
  });
});
