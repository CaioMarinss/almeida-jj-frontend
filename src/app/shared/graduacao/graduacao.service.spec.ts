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

  it('anuncia a atual alterada ao registrar e ao remover', () => {
    const anuncios: unknown[] = [];
    service.atualAlterada$.subscribe((a) => anuncios.push(a));
    const faixa = { id: 1 };

    service.registrar(7, { idGraduacao: 1, grau: 0 }).subscribe();
    http.expectOne(`${api}/alunos/7/graduacoes`).flush({ id: 1, atual: { faixa, grau: 0 } });
    service.remover(7, 1).subscribe();
    http.expectOne(`${api}/alunos/7/graduacoes/1`).flush({ atual: null });

    expect(anuncios).toEqual([{ idAluno: 7, atual: { faixa, grau: 0 } }, { idAluno: 7, atual: null }]);
  });

  it('devolve a próxima graduação com os mínimos', () => {
    let valor: unknown;
    service.proxima().subscribe((v) => (valor = v));
    http.expectOne(`${api}/graduacoes/proxima`).flush({ data: '2026-12-14', minimoGrau: 20, minimoFaixa: null });
    expect(valor).toEqual({ data: '2026-12-14', minimoGrau: 20, minimoFaixa: null });
  });

  it('transforma 204 em null', () => {
    let valor: unknown;
    service.proxima().subscribe((v) => (valor = v));
    http.expectOne(`${api}/graduacoes/proxima`).flush(null, { status: 204, statusText: 'No Content' });
    expect(valor).toBeNull();
  });

  it('agenda e cancela a próxima graduação', () => {
    let valor: unknown;
    service.agendar('2026-12-14', 20, null).subscribe((v) => (valor = v));
    const put = http.expectOne(`${api}/graduacoes/proxima`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ data: '2026-12-14', minimoGrau: 20, minimoFaixa: null });
    put.flush({ data: '2026-12-14', minimoGrau: 20, minimoFaixa: null });
    expect(valor).toEqual({ data: '2026-12-14', minimoGrau: 20, minimoFaixa: null });

    service.cancelar().subscribe();
    const del = http.expectOne(`${api}/graduacoes/proxima`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('lista os aptos', () => {
    let lista: unknown;
    service.aptos().subscribe((v) => (lista = v));
    const req = http.expectOne(`${api}/graduacoes/aptos`);
    expect(req.request.method).toBe('GET');
    const corpo = { evento: { data: '2026-12-14', minimoGrau: 20, minimoFaixa: 40 }, grau: [], faixa: [] };
    req.flush(corpo);
    expect(lista).toEqual(corpo);
  });

  it('graduou sem escolha envia corpo vazio e anuncia a atual', () => {
    const anuncios: unknown[] = [];
    service.atualAlterada$.subscribe((a) => anuncios.push(a));
    service.graduou(7).subscribe();
    const req = http.expectOne(`${api}/graduacoes/aptos/7`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ id: 1, atual: { faixa: { id: 1 }, grau: 3 } });
    expect(anuncios).toEqual([{ idAluno: 7, atual: { faixa: { id: 1 }, grau: 3 } }]);
  });

  it('graduou com escolha envia faixa e grau', () => {
    service.graduou(7, { idGraduacao: 2, grau: 1 }).subscribe();
    const req = http.expectOne(`${api}/graduacoes/aptos/7`);
    expect(req.request.body).toEqual({ idGraduacao: 2, grau: 1 });
    req.flush({ id: 1, atual: null });
  });

  it('registra exame com PUT', () => {
    let resposta: unknown;
    service.registrarExame(7, { aprovado: true, nota: 8.5, observacao: null }).subscribe((v) => (resposta = v));
    const req = http.expectOne(`${api}/graduacoes/aptos/7/exame`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ aprovado: true, nota: 8.5, observacao: null });
    const corpo = { exame: { id: 1, evento: { id: 2, data: '2026-12-14' }, aprovado: true, nota: 8.5, observacao: null }, graduacao: null };
    req.flush(corpo);
    expect(resposta).toEqual(corpo);
  });

  it('remove exame com DELETE', () => {
    service.removerExame(7).subscribe();
    const req = http.expectOne(`${api}/graduacoes/aptos/7/exame`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('lista exames do aluno', () => {
    service.exames(7).subscribe();
    const req = http.expectOne(`${api}/alunos/7/exames`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('emite atualAlterada quando o exame já registra a graduação', () => {
    const emitidas: unknown[] = [];
    service.atualAlterada$.subscribe((v) => emitidas.push(v));
    service.registrarExame(7, { aprovado: true, nota: 9 }).subscribe();
    http.expectOne(`${api}/graduacoes/aptos/7/exame`).flush({ exame: {}, graduacao: { id: 1, atual: null } });
    expect(emitidas).toEqual([{ idAluno: 7, atual: null }]);
  });
});
