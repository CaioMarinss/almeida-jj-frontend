import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { Apto } from '../../shared/graduacao/graduacao.model';
import { ContadoresDonoService } from './contadores-dono.service';

const api = environment.apiUrl;

function apto(id: number, extra: Partial<Apto> = {}): Apto {
  return { id, nome: `A${id}`, atual: null, contadas: 30, minimo: 30, apto: true, sugestao: null, exame: null, graduado: false, ...extra };
}

describe('ContadoresDonoService', () => {
  let http: HttpTestingController;
  let service: ContadoresDonoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ContadoresDonoService);
  });

  afterEach(() => http.verify());

  function responder(aptos: () => void, sumidos: () => void): void {
    aptos();
    sumidos();
  }

  const aptosOk = (corpo: object) => () => http.expectOne(`${api}/graduacoes/aptos`).flush(corpo);
  const sumidosOk = (n: number) => () =>
    http.expectOne(`${api}/presencas/sumidos`).flush({ dias: 14, alunos: Array.from({ length: n }, (_, i) => ({ id: i })) });

  it('contadoresIgnoramGraduadosENaoAptos', async () => {
    const p = service.atualizar();
    responder(
      aptosOk({
        evento: { data: '2026-12-14', minimoGrau: 30, minimoFaixa: 60 },
        grau: [apto(1), apto(2, { graduado: true }), apto(3, { apto: false })],
        faixa: [apto(4), apto(5, { exame: { aprovado: true, nota: 8, observacao: null } })]
      }),
      sumidosOk(3)
    );
    await p;
    expect(service.aptos()).toBe(3);
    expect(service.sumidos()).toBe(3);
  });

  it('semEventoAptosZero', async () => {
    const p = service.atualizar();
    responder(
      () => http.expectOne(`${api}/graduacoes/aptos`).flush({ codigo: 'ERR033', detail: 'x' }, { status: 404, statusText: 'Not Found' }),
      sumidosOk(0)
    );
    await p;
    expect(service.aptos()).toBe(0);
  });

  it('erroMantemUltimoValor', async () => {
    let p = service.atualizar();
    responder(aptosOk({ evento: {}, grau: [apto(1)], faixa: [] }), sumidosOk(2));
    await p;
    p = service.atualizar();
    responder(
      () => http.expectOne(`${api}/graduacoes/aptos`).flush({}, { status: 500, statusText: 'err' }),
      () => http.expectOne(`${api}/presencas/sumidos`).flush({}, { status: 500, statusText: 'err' })
    );
    await p;
    expect(service.aptos()).toBe(1);
    expect(service.sumidos()).toBe(2);
  });
});
