import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { GraduacaoService } from '../graduacao/graduacao.service';
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

  it('guarda o painel em cache ao buscar', () => {
    expect(service.painelEmCache()).toBeNull();
    service.painel().subscribe();
    http.expectOne(`${api}/alunos/painel`).flush([{ id: 2, nome: 'Bia', perfil: 'ALUNO', atual: null }]);
    expect(service.painelEmCache()?.length).toBe(1);
  });

  it('altera uma linha do cache', () => {
    service.painel().subscribe();
    http.expectOne(`${api}/alunos/painel`).flush([{ id: 2, nome: 'Bia', perfil: 'ALUNO', atual: null }]);
    service.alterarEmCache(2, { perfil: 'PROFESSOR' });
    expect(service.painelEmCache()?.[0].perfil).toBe('PROFESSOR');
  });

  it('atualiza a faixa no cache quando uma graduação é registrada', () => {
    service.painel().subscribe();
    http.expectOne(`${api}/alunos/painel`).flush([{ id: 2, nome: 'Bia', perfil: 'ALUNO', atual: null }]);
    const atual = { faixa: { id: 1 }, grau: 2 };
    TestBed.inject(GraduacaoService).registrar(2, { idGraduacao: 1, grau: 2 }).subscribe();
    http.expectOne(`${api}/alunos/2/graduacoes`).flush({ id: 9, atual });
    expect(service.painelEmCache()?.[0].atual).toEqual(atual as never);
  });
});
