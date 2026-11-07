import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { GraduacaoService } from './graduacao.service';

describe('GraduacaoService', () => {
  let service: GraduacaoService;
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(GraduacaoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista as faixas', () => {
    service.faixas().subscribe();
    const req = http.expectOne(`${api}/graduacoes/faixas`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('busca a própria graduação', () => {
    service.minha().subscribe();
    http.expectOne(`${api}/alunos/me/graduacao`).flush({ atual: null, historico: [], proxima: null });
  });

  it('busca todos os alunos sem parâmetros', () => {
    let lista: unknown;
    service.alunos().subscribe((v) => (lista = v));
    const req = http.expectOne(`${api}/graduacoes/alunos`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([{ id: 1, nome: 'Ana', email: 'a@x.com', perfil: 'ALUNO', atual: null }]);
    expect(lista).toEqual([{ id: 1, nome: 'Ana', email: 'a@x.com', perfil: 'ALUNO', atual: null }]);
  });

  it('consulta e registra graduações de um aluno', () => {
    service.historicoDe(7).subscribe();
    http.expectOne(`${api}/alunos/7/graduacoes`).flush([]);

    service.registrar(7, { idGraduacao: 2, grau: 1, data: '2026-11-01' }).subscribe();
    const req = http.expectOne(`${api}/alunos/7/graduacoes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ idGraduacao: 2, grau: 1, data: '2026-11-01' });
    req.flush({});
  });

  it('remove um registro e devolve a graduação atual', () => {
    let atual: unknown;
    service.remover(7, 3).subscribe((v) => (atual = v));
    const req = http.expectOne(`${api}/alunos/7/graduacoes/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ atual: null });
    expect(atual).toBeNull();
  });

  it('devolve a data da próxima graduação', () => {
    let valor: string | null | undefined;
    service.proxima().subscribe((v) => (valor = v));
    http.expectOne(`${api}/graduacoes/proxima`).flush({ data: '2026-12-14' });
    expect(valor).toBe('2026-12-14');
  });

  it('transforma 204 em null', () => {
    let valor: string | null | undefined;
    service.proxima().subscribe((v) => (valor = v));
    http.expectOne(`${api}/graduacoes/proxima`).flush(null, { status: 204, statusText: 'No Content' });
    expect(valor).toBeNull();
  });

  it('agenda e cancela a próxima graduação', () => {
    let valor: string | undefined;
    service.agendar('2026-12-14').subscribe((v) => (valor = v));
    const put = http.expectOne(`${api}/graduacoes/proxima`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ data: '2026-12-14' });
    put.flush({ data: '2026-12-14' });
    expect(valor).toBe('2026-12-14');

    service.cancelar().subscribe();
    const del = http.expectOne(`${api}/graduacoes/proxima`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
  });
});
