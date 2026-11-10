import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PresencaService } from './presenca.service';

describe('PresencaService', () => {
  let service: PresencaService;
  let http: HttpTestingController;
  const api = environment.apiUrl;
  const aula = `${api}/agenda/2026-11-10/aulas/5`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PresencaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('marca a própria presença', () => {
    let concluiu = false;
    service.marcar('2026-11-10', 5).subscribe(() => (concluiu = true));
    const req = http.expectOne(`${aula}/presenca`);
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 201, statusText: 'Created' });
    expect(concluiu).toBeTrue();
  });

  it('desmarca a própria presença', () => {
    service.desmarcar('2026-11-10', 5).subscribe();
    const req = http.expectOne(`${aula}/presenca`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('busca as próprias presenças', () => {
    let valor: unknown;
    service.minhas().subscribe((v) => (valor = v));
    const req = http.expectOne(`${api}/alunos/me/presencas`);
    expect(req.request.method).toBe('GET');
    req.flush({ ciclo: null, presencas: [] });
    expect(valor).toEqual({ ciclo: null, presencas: [] });
  });

  it('busca as presenças de um aluno para o dono', () => {
    const req = (service.doAluno(7).subscribe(), http.expectOne(`${api}/graduacoes/alunos/7/presencas`));
    expect(req.request.method).toBe('GET');
    req.flush({ ciclo: null, presencas: [] });
  });

  it('busca os alunos sumidos', () => {
    const req = (service.sumidos().subscribe(), http.expectOne(`${api}/presencas/sumidos`));
    expect(req.request.method).toBe('GET');
    req.flush({ dias: 14, alunos: [] });
  });

  it('busca o prazo da chamada', () => {
    const req = (service.prazo().subscribe(), http.expectOne(`${environment.apiUrl}/presencas/prazo`));
    expect(req.request.method).toBe('GET');
    req.flush({ ajustaDesde: null });
  });

  it('busca a chamada da aula', () => {
    const req = (service.chamada('2026-11-10', 5).subscribe(), http.expectOne(`${aula}/presencas`));
    expect(req.request.method).toBe('GET');
    req.flush({ presencas: [], podeAjustar: true, ajustaAte: '2026-11-11' });
  });

  it('inclui um aluno na chamada', () => {
    service.incluir('2026-11-10', 5, 9).subscribe();
    const req = http.expectOne(`${aula}/presencas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ idAluno: 9 });
    req.flush(null, { status: 201, statusText: 'Created' });
  });

  it('tira um aluno da chamada', () => {
    service.tirar('2026-11-10', 5, 9).subscribe();
    const req = http.expectOne(`${aula}/presencas/9`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
