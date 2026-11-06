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

  it('envia só os parâmetros de busca definidos', () => {
    service.buscarAlunos({ pagina: 0, tamanho: 20 }).subscribe();
    const req = http.expectOne((r) => r.url === `${api}/graduacoes/alunos`);
    expect(req.request.params.keys().sort()).toEqual(['pagina', 'tamanho']);
    req.flush({ itens: [], pagina: 0, tamanho: 20, total: 0 });
  });

  it('envia nome e faixa quando informados', () => {
    service.buscarAlunos({ nome: 'joao', faixa: 'sem', pagina: 1, tamanho: 20 }).subscribe();
    const req = http.expectOne((r) => r.url === `${api}/graduacoes/alunos`);
    expect(req.request.params.get('nome')).toBe('joao');
    expect(req.request.params.get('faixa')).toBe('sem');
    expect(req.request.params.get('pagina')).toBe('1');
    req.flush({ itens: [], pagina: 1, tamanho: 20, total: 0 });
  });

  it('envia o id da faixa no filtro', () => {
    service.buscarAlunos({ faixa: 3, pagina: 0, tamanho: 20 }).subscribe();
    const req = http.expectOne((r) => r.url === `${api}/graduacoes/alunos`);
    expect(req.request.params.get('faixa')).toBe('3');
    expect(req.request.params.has('nome')).toBeFalse();
    req.flush({ itens: [], pagina: 0, tamanho: 20, total: 0 });
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
