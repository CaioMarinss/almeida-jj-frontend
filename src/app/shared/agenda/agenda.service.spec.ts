import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AgendaService } from './agenda.service';

describe('AgendaService', () => {
  let service: AgendaService;
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AgendaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('busca a agenda do período', () => {
    service.agenda('2026-11-09', '2026-11-15').subscribe();
    const req = http.expectOne((r) => r.url === `${api}/agenda`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('inicio')).toBe('2026-11-09');
    expect(req.request.params.get('fim')).toBe('2026-11-15');
    req.flush([]);
  });

  it('lista a grade', () => {
    service.grade().subscribe();
    const req = http.expectOne(`${api}/aulas/grade`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('cria aula na grade', () => {
    const corpo = { diaSemana: 1, inicio: '19:00', fim: '20:00', modalidade: 'GI' as const };
    let criada: unknown;
    service.criarAula(corpo).subscribe((v) => (criada = v));
    const req = http.expectOne(`${api}/aulas/grade`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(corpo);
    req.flush({ id: 5, ...corpo }, { status: 201, statusText: 'Created' });
    expect(criada).toEqual({ id: 5, ...corpo });
  });

  it('edita aula da grade', () => {
    const corpo = { inicio: '19:00', fim: '20:30', modalidade: 'NO_GI' as const };
    service.editarAula(5, corpo).subscribe();
    const req = http.expectOne(`${api}/aulas/grade/5`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(corpo);
    req.flush({ id: 6, diaSemana: 1, ...corpo });
  });

  it('tira aula da grade', () => {
    service.tirarDaGrade(5).subscribe();
    const req = http.expectOne(`${api}/aulas/grade/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('lista exceções', () => {
    service.excecoes().subscribe();
    const req = http.expectOne(`${api}/agenda/excecoes`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('cancela e devolve vazio', () => {
    const corpo = { data: '2026-11-10', idAula: 3, motivo: 'Feriado' };
    let resposta: unknown = 'pendente';
    service.cancelar(corpo).subscribe((v) => (resposta = v));
    const req = http.expectOne(`${api}/agenda/cancelamentos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(corpo);
    req.flush({ id: 9 }, { status: 201, statusText: 'Created' });
    expect(resposta).toBeUndefined();
  });

  it('desfaz cancelamento', () => {
    service.desfazerCancelamento(9).subscribe();
    const req = http.expectOne(`${api}/agenda/cancelamentos/9`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('cria aula avulsa', () => {
    const corpo = { data: '2026-11-12', inicio: '10:00', fim: '11:00', modalidade: 'KIDS' as const };
    service.criarAvulsa(corpo).subscribe();
    const req = http.expectOne(`${api}/agenda/avulsas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(corpo);
    req.flush({}, { status: 201, statusText: 'Created' });
  });

  it('remove aula avulsa', () => {
    service.removerAvulsa(4).subscribe();
    const req = http.expectOne(`${api}/agenda/avulsas/4`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
