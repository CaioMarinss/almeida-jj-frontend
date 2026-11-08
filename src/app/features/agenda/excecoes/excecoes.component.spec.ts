import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Notificador } from '../../../core/notificacao/notificador';
import { Excecao } from '../../../shared/agenda/agenda.model';
import { AgendaService } from '../../../shared/agenda/agenda.service';
import { criarNotificador } from '../../auth/testes-auth';
import { provedoresApp } from '../../testes-app';
import { ExcecoesComponent } from './excecoes.component';

function excecao(extra: Partial<Excecao> = {}): Excecao {
  return { tipo: 'DIA', id: 1, data: '2026-11-20', aula: null, motivo: null, passada: false, ...extra };
}

describe('ExcecoesComponent', () => {
  let service: jasmine.SpyObj<AgendaService>;
  let notificador: jasmine.SpyObj<Notificador>;
  let fixture: ComponentFixture<ExcecoesComponent>;

  const el = (): HTMLElement => fixture.nativeElement;
  const textos = (sel: string): string[] =>
    Array.from(el().querySelectorAll(sel)).map(e => e.textContent!.replace(/\s+/g, ' ').trim());

  async function atualizar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    notificador = criarNotificador();
    service = jasmine.createSpyObj<AgendaService>('AgendaService', [
      'excecoes',
      'cancelar',
      'desfazerCancelamento',
      'criarAvulsa',
      'removerAvulsa',
      'agenda'
    ]);
    service.excecoes.and.returnValue(
      of([
        excecao({
          tipo: 'AULA',
          id: 5,
          data: '2026-11-10',
          aula: { inicio: '20:30', fim: '21:30', modalidade: 'GI' },
          motivo: 'Professor viajando'
        }),
        excecao({
          tipo: 'AVULSA',
          id: 6,
          data: '2026-11-14',
          aula: { inicio: '10:00', fim: '12:00', modalidade: 'GI' }
        }),
        excecao({ id: 7, motivo: 'Consciência Negra' }),
        excecao({ id: 8, data: '2026-11-02', passada: true, motivo: 'Finados' })
      ])
    );
    service.cancelar.and.returnValue(of(undefined));
    service.desfazerCancelamento.and.returnValue(of(undefined));
    service.criarAvulsa.and.returnValue(of({
        id: 9,
        inicio: '10:00',
        fim: '12:00',
        modalidade: 'GI',
        avulsa: true,
        motivo: null,
        cancelada: false,
        motivoCancelamento: null,
        vao: 0,
        euVou: false,
        janelaFechada: false,
        podeMarcar: false
      }));
    service.removerAvulsa.and.returnValue(of(undefined));
    TestBed.configureTestingModule({
      imports: [ExcecoesComponent],
      providers: [...provedoresApp(notificador), { provide: AgendaService, useValue: service }]
    });
    fixture = TestBed.createComponent(ExcecoesComponent);
    await atualizar();
  });

  it('separa Próximas (com lixeira) de Passadas (somente leitura)', () => {
    expect(textos('.secao h2')).toEqual(['Próximas', 'Passadas']);
    expect(el().querySelectorAll('.proximas .excecao').length).toBe(3);
    expect(el().querySelectorAll('.proximas .lixeira').length).toBe(3);
    expect(el().querySelectorAll('.passadas .excecao').length).toBe(1);
    expect(el().querySelectorAll('.passadas .lixeira').length).toBe(0);
  });

  it('descreve cada tipo de exceção e o motivo', () => {
    const linhas = textos('.excecao .descricao');
    expect(linhas).toEqual([
      'Ter 10/11 · 20:30 Gi',
      'Sáb 14/11 · 10:00–12:00 Gi',
      'Sex 20/11 · dia inteiro',
      'Seg 02/11 · dia inteiro'
    ]);
    const detalhes = textos('.excecao .detalhe');
    expect(detalhes).toEqual([
      'Aula cancelada · Professor viajando',
      'Aula avulsa',
      'Dia cancelado · Consciência Negra',
      'Dia cancelado · Finados'
    ]);
  });

  it('a lixeira tem rótulo acessível com a data', () => {
    const rotulos = Array.from(el().querySelectorAll('.lixeira')).map(b => b.getAttribute('aria-label'));
    expect(rotulos).toEqual(['Desfazer exceção de 10/11', 'Desfazer exceção de 14/11', 'Desfazer exceção de 20/11']);
  });

  it('lista as Passadas da mais recente para a mais antiga e mantém as Próximas em ordem crescente', async () => {
    service.excecoes.and.returnValue(
      of([
        excecao({ id: 1, data: '2026-10-05', passada: true }),
        excecao({ id: 2, data: '2026-11-02', passada: true }),
        excecao({ id: 3, data: '2026-10-20', passada: true }),
        excecao({ id: 4, data: '2026-11-12' }),
        excecao({ id: 5, data: '2026-11-30' })
      ])
    );
    fixture = TestBed.createComponent(ExcecoesComponent);
    await atualizar();

    expect(Array.from(el().querySelectorAll('.passadas .excecao .descricao')).map(n => n.textContent?.trim())).toEqual([
      'Seg 02/11 · dia inteiro',
      'Ter 20/10 · dia inteiro',
      'Seg 05/10 · dia inteiro'
    ]);
    expect(Array.from(el().querySelectorAll('.proximas .excecao .descricao')).map(n => n.textContent?.trim())).toEqual([
      'Qui 12/11 · dia inteiro',
      'Seg 30/11 · dia inteiro'
    ]);
  });

  it('sem exceções próximas mostra a mensagem', async () => {
    service.excecoes.and.returnValue(of([]));
    fixture = TestBed.createComponent(ExcecoesComponent);
    await atualizar();

    expect(el().textContent).toContain('Nenhuma exceção marcada.');
    expect(el().querySelector('.passadas')).toBeNull();
  });

  it('desfazer cancelamento (DIA/AULA) confirma e chama desfazerCancelamento, recarregando', async () => {
    await fixture.componentInstance.desfazer(excecao({ id: 7 }));
    await atualizar();

    expect(notificador.confirmar.calls.mostRecent().args[0]).toBe('Desfazer esta exceção?');
    expect(service.desfazerCancelamento).toHaveBeenCalledWith(7);
    expect(service.removerAvulsa).not.toHaveBeenCalled();
    expect(notificador.sucesso).toHaveBeenCalledWith('Exceção desfeita.');
    expect(service.excecoes).toHaveBeenCalledTimes(2);
  });

  it('desfazer aula avulsa chama removerAvulsa', async () => {
    el().querySelectorAll<HTMLButtonElement>('.lixeira')[1].click();
    await atualizar();

    expect(service.removerAvulsa).toHaveBeenCalledWith(6);
    expect(service.desfazerCancelamento).not.toHaveBeenCalled();
  });

  it('sem confirmação não chama a API', async () => {
    notificador.confirmar.and.resolveTo(false);
    el().querySelectorAll<HTMLButtonElement>('.lixeira')[0].click();
    await atualizar();

    expect(service.desfazerCancelamento).not.toHaveBeenCalled();
    expect(service.removerAvulsa).not.toHaveBeenCalled();
  });

  it('erro ao desfazer vai para o Notificador', async () => {
    const erro = new HttpErrorResponse({ status: 404 });
    service.desfazerCancelamento.and.returnValue(throwError(() => erro));
    el().querySelectorAll<HTMLButtonElement>('.lixeira')[0].click();
    await atualizar();

    expect(notificador.erroDaApi).toHaveBeenCalledWith(erro, jasmine.any(String));
    expect(notificador.sucesso).not.toHaveBeenCalled();
  });

  it('+ Nova exceção abre o painel com a escolha do tipo', async () => {
    expect(el().querySelector('.nova')?.textContent).toContain('+ Nova exceção');
    fixture.componentInstance.abrirNova();
    await atualizar();

    expect(fixture.componentInstance.painel()).toBeTrue();
  });

  it('salvar dia inteiro chama cancelar, avisa, recarrega e fecha', async () => {
    fixture.componentInstance.abrirNova();
    await fixture.componentInstance.salvar({ tipo: 'DIA', data: '2026-12-25', motivo: 'Natal' });
    await atualizar();

    expect(service.cancelar).toHaveBeenCalledWith({ data: '2026-12-25', motivo: 'Natal' });
    expect(notificador.sucesso).toHaveBeenCalledWith('Exceção criada.');
    expect(service.excecoes).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.painel()).toBeFalse();
  });

  it('salvar uma aula chama cancelar com idAula', async () => {
    await fixture.componentInstance.salvar({ tipo: 'AULA', data: '2026-11-10', idAula: 2 });

    expect(service.cancelar).toHaveBeenCalledWith({ data: '2026-11-10', idAula: 2 });
  });

  it('salvar avulsa chama criarAvulsa', async () => {
    await fixture.componentInstance.salvar({
      tipo: 'AVULSA',
      data: '2026-11-14',
      inicio: '10:00',
      fim: '12:00',
      modalidade: 'GI',
      motivo: 'Aulão'
    });

    expect(service.criarAvulsa).toHaveBeenCalledWith({
      data: '2026-11-14',
      inicio: '10:00',
      fim: '12:00',
      modalidade: 'GI',
      motivo: 'Aulão'
    });
    expect(service.cancelar).not.toHaveBeenCalled();
  });

  it('erro ao salvar mantém o painel aberto e não recarrega', async () => {
    const erro = new HttpErrorResponse({ status: 409 });
    service.cancelar.and.returnValue(throwError(() => erro));
    fixture.componentInstance.abrirNova();
    await fixture.componentInstance.salvar({ tipo: 'DIA', data: '2026-12-25' });

    expect(notificador.erroDaApi).toHaveBeenCalledWith(erro, jasmine.any(String));
    expect(fixture.componentInstance.painel()).toBeTrue();
    expect(service.excecoes).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.salvando()).toBeFalse();
  });

  it('segundo salvar durante um em andamento é ignorado', async () => {
    const primeira = fixture.componentInstance.salvar({ tipo: 'DIA', data: '2026-12-25' });
    const segunda = fixture.componentInstance.salvar({ tipo: 'DIA', data: '2026-12-25' });
    await Promise.all([primeira, segunda]);

    expect(service.cancelar).toHaveBeenCalledTimes(1);
  });

  it('falha ao carregar mostra o erro com tentar de novo', async () => {
    service.excecoes.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    fixture = TestBed.createComponent(ExcecoesComponent);
    await atualizar();

    expect(el().querySelector('.erro-carga')).not.toBeNull();
    expect(notificador.erroDaApi).toHaveBeenCalled();
  });
});
