import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ProfessoresService } from './professores.service';

describe('ProfessoresService', () => {
  let http: HttpTestingController;
  let service: ProfessoresService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ProfessoresService);
  });

  afterEach(() => http.verify());

  it('lista as pessoas com GET em /alunos', () => {
    let resposta: unknown;
    service.listar().subscribe(lista => (resposta = lista));

    const req = http.expectOne(`${environment.apiUrl}/alunos`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 2, nome: 'Bia', email: 'bia@x.com', perfil: 'ALUNO' }]);
    expect(resposta).toEqual([{ id: 2, nome: 'Bia', email: 'bia@x.com', perfil: 'ALUNO' }]);
  });

  it('altera o cargo com PUT em /alunos/{id}/perfil', () => {
    service.alterarPerfil(2, 'PROFESSOR').subscribe();

    const req = http.expectOne(`${environment.apiUrl}/alunos/2/perfil`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ perfil: 'PROFESSOR' });
    req.flush(null);
  });
});
