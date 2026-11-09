import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Notificador } from '../../../core/notificacao/notificador';
import { AulaDoDia, DiaAgenda } from '../../../shared/agenda/agenda.model';
import { AgendaService } from '../../../shared/agenda/agenda.service';
import { hojeEmSaoPaulo } from '../../../shared/graduacao/descrever';
import { criarNotificador } from '../../auth/testes-auth';
import { provedoresApp } from '../../testes-app';
import { NovaExcecao, NovaExcecaoComponent } from './nova-excecao.component';

function aula(extra: Partial<AulaDoDia> = {}): AulaDoDia {
  return {
    id: 1,
    inicio: '18:00',
    fim: '19:00',
    modalidade: 'GI',
    avulsa: false,
    motivo: null,
    cancelada: false,
    motivoCancelamento: null,
    vao: 0,
    euVou: false,
    janelaFechada: false,
    podeMarcar: false,
    ...extra
  };
}

function dia(aulas: AulaDoDia[]): DiaAgenda {
  return { data: '2026-11-10', diaCancelado: null, aulas };
}

describe('NovaExcecaoComponent', () => {
  let service: jasmine.SpyObj<AgendaService>;
  let notificador: jasmine.SpyObj<Notificador>;
  let fixture: ComponentFixture<NovaExcecaoComponent>;
  let salvas: NovaExcecao[];
  let cancelou: number;

  const el = (): HTMLElement => fixture.nativeElement;
  const q = <T extends HTMLElement>(sel: string): T | null => el().querySelector<T>(sel);
  const opcoesTipo = (): string[] => Array.from(el().querySelectorAll('.tipo-titulo')).map(b => b.textContent!.trim());

  async function atualizar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function escrever(sel: string, valor: string): Promise<void> {
    const campo = q<HTMLInputElement>(sel)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    await atualizar();
  }

  async function escolherTipo(rotulo: string): Promise<void> {
    Array.from(el().querySelectorAll<HTMLButtonElement>('.tipo'))
      .find(b => b.textContent!.includes(rotulo))!
      .click();
    await atualizar();
  }

  beforeEach(async () => {
    notificador = criarNotificador();
    salvas = [];
    cancelou = 0;
    service = jasmine.createSpyObj<AgendaService>('AgendaService', ['agenda']);
    service.agenda.and.returnValue(
      of([
        dia([
          aula({ id: 1 }),
          aula({ id: 2, inicio: '19:30', fim: '20:30', modalidade: 'KIDS' }),
          aula({ id: 3, inicio: '20:30', fim: '21:30', cancelada: true }),
          aula({ id: 4, inicio: '10:00', fim: '12:00', avulsa: true })
        ])
      ])
    );
    TestBed.configureTestingModule({
      imports: [NovaExcecaoComponent],
      providers: [...provedoresApp(notificador), { provide: AgendaService, useValue: service }]
    });
    fixture = TestBed.createComponent(NovaExcecaoComponent);
    fixture.componentInstance.salvar.subscribe(v => salvas.push(v));
    fixture.componentInstance.cancelar.subscribe(() => cancelou++);
    await atualizar();
  });

  it('começa pela escolha do tipo', () => {
    expect(opcoesTipo()).toEqual(['Cancelar o dia inteiro', 'Cancelar uma aula', 'Aula avulsa']);
    expect(q('input[type=date]')).toBeNull();
  });

  it('a data não aceita dias passados (min = hoje)', async () => {
    await escolherTipo('Cancelar o dia inteiro');

    expect(q<HTMLInputElement>('#excecao-data')!.min).toBe(hojeEmSaoPaulo());
  });

  it('dia inteiro emite data e motivo; o motivo é opcional e limitado a 80', async () => {
    await escolherTipo('Cancelar o dia inteiro');
    expect(q<HTMLInputElement>('#excecao-motivo')!.maxLength).toBe(80);

    await escrever('#excecao-data', '2026-11-20');
    await escrever('#excecao-motivo', 'Consciência Negra');
    q<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await atualizar();

    expect(salvas).toEqual([{ tipo: 'DIA', data: '2026-11-20', motivo: 'Consciência Negra' }]);
  });

  it('sem motivo, não envia o campo', async () => {
    await escolherTipo('Cancelar o dia inteiro');
    await escrever('#excecao-data', '2026-11-20');
    q<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));

    expect(salvas).toEqual([{ tipo: 'DIA', data: '2026-11-20' }]);
  });

  it('sem data não emite e mostra o erro', async () => {
    await escolherTipo('Cancelar o dia inteiro');
    q<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await atualizar();

    expect(salvas).toEqual([]);
    expect(q('.erro')?.textContent).toContain('Informe a data.');
  });

  it('cancelar uma aula busca a agenda da data e lista só aulas normais e não canceladas', async () => {
    await escolherTipo('Cancelar uma aula');
    await escrever('#excecao-data', '2026-11-10');

    expect(service.agenda).toHaveBeenCalledWith('2026-11-10', '2026-11-10');
    const itens = Array.from(el().querySelectorAll('.aula-opcao')).map(i => i.textContent!.replace(/\s+/g, ' ').trim());
    expect(itens.length).toBe(2);
    expect(itens[0]).toContain('18:00');
    expect(itens[1]).toContain('19:30');
  });

  it('data sem aulas para cancelar mostra o aviso', async () => {
    service.agenda.and.returnValue(of([dia([aula({ cancelada: true }), aula({ id: 2, avulsa: true })])]));
    await escolherTipo('Cancelar uma aula');
    await escrever('#excecao-data', '2026-11-10');

    expect(q('.sem-aulas')?.textContent).toContain('Nenhuma aula para cancelar nesta data.');
    expect(el().querySelectorAll('.aula-opcao').length).toBe(0);
  });

  it('escolher a aula e salvar emite o idAula; sem escolher não emite', async () => {
    await escolherTipo('Cancelar uma aula');
    await escrever('#excecao-data', '2026-11-10');
    q<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await atualizar();
    expect(salvas).toEqual([]);
    expect(q('.erro')?.textContent).toContain('Escolha a aula.');

    el().querySelectorAll<HTMLButtonElement>('.aula-opcao')[1].click();
    await atualizar();
    expect(el().querySelectorAll('.aula-opcao')[1].getAttribute('aria-pressed')).toBe('true');
    q<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));

    expect(salvas).toEqual([{ tipo: 'AULA', data: '2026-11-10', idAula: 2 }]);
  });

  it('trocar a data limpa a aula escolhida', async () => {
    await escolherTipo('Cancelar uma aula');
    await escrever('#excecao-data', '2026-11-10');
    el().querySelectorAll<HTMLButtonElement>('.aula-opcao')[0].click();
    await atualizar();

    await escrever('#excecao-data', '2026-11-11');
    q<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));

    expect(salvas).toEqual([]);
  });

  it('erro ao buscar as aulas vai para o Notificador', async () => {
    const erro = new HttpErrorResponse({ status: 500 });
    service.agenda.and.returnValue(throwError(() => erro));
    await escolherTipo('Cancelar uma aula');
    await escrever('#excecao-data', '2026-11-10');

    expect(notificador.erroDaApi).toHaveBeenCalledWith(erro, jasmine.any(String));
  });

  it('aula avulsa pede início, fim e modalidade e emite HH:mm', async () => {
    await escolherTipo('Aula avulsa');
    await escrever('#excecao-data', '2026-11-14');
    await escrever('#excecao-inicio', '10:00');
    await escrever('#excecao-fim', '12:00');
    el().querySelector<HTMLButtonElement>('[data-modalidade="KIDS"]')!.click();
    await atualizar();
    q<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));

    expect(salvas).toEqual([
      { tipo: 'AVULSA', data: '2026-11-14', inicio: '10:00', fim: '12:00', modalidade: 'KIDS' }
    ]);
  });

  it('aula avulsa com fim antes do início não emite', async () => {
    await escolherTipo('Aula avulsa');
    await escrever('#excecao-data', '2026-11-14');
    await escrever('#excecao-inicio', '12:00');
    await escrever('#excecao-fim', '10:00');
    q<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await atualizar();

    expect(salvas).toEqual([]);
    expect(q('.erro')?.textContent).toContain('O fim deve ser depois do início.');
  });

  it('Voltar retorna à escolha do tipo e Cancelar emite cancelar', async () => {
    await escolherTipo('Aula avulsa');
    q<HTMLElement>('.voltar ion-button')!.click();
    await atualizar();
    expect(opcoesTipo().length).toBe(3);

    q<HTMLElement>('.cancelar ion-button')!.click();
    expect(cancelou).toBe(1);
  });
});
