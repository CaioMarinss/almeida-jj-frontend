import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AulaDoDia, DiaAgenda } from '../../shared/agenda/agenda.model';
import { AgendaService } from '../../shared/agenda/agenda.service';
import { PresencaService } from '../../shared/presenca/presenca.service';
import { SessionService } from '../../core/auth/session.service';
import { GraduacaoService } from '../../shared/graduacao/graduacao.service';
import { logar, provedoresApp } from '../testes-app';
import { InicioComponent } from './inicio.component';

function aula(extra: Partial<AulaDoDia> = {}): AulaDoDia {
  return { id: 1, inicio: '07:10', fim: '08:10', modalidade: 'GI', avulsa: false, motivo: null, cancelada: false, motivoCancelamento: null, vao: 0, euVou: false, janelaFechada: false, podeMarcar: false, ...extra };
}

function dia(data: string, aulas: AulaDoDia[] = []): DiaAgenda {
  return { data, diaCancelado: null, aulas };
}

describe('InicioComponent', () => {
  let agenda: jasmine.Spy<AgendaService['agenda']>;
  let presenca: jasmine.SpyObj<PresencaService>;

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-11-04T15:00:00Z'));
    agenda = jasmine.createSpy('agenda').and.returnValue(of([]));
    presenca = jasmine.createSpyObj<PresencaService>('PresencaService', ['marcar', 'desmarcar']);
  });

  async function renderizar(nome: string, perfil?: 'DONO' | 'PROFESSOR' | 'ALUNO') {
    sessionStorage.clear();
    TestBed.configureTestingModule({ imports: [InicioComponent], providers: [
        ...provedoresApp(),
        { provide: AgendaService, useValue: { agenda } },
        { provide: PresencaService, useValue: presenca },
        { provide: GraduacaoService, useValue: { minha: () => of({ atual: null, historico: [], proxima: null, presencas: null }) } }
      ]
    });
    logar(TestBed.inject(SessionService), nome, perfil);
    const fixture = TestBed.createComponent(InicioComponent);
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    ultimo = fixture;
    return fixture.nativeElement as HTMLElement;
  }

  let ultimo: ComponentFixture<InicioComponent>;

  async function clicar(botao: HTMLElement): Promise<void> {
    botao.click();
    ultimo.detectChanges();
    await ultimo.whenStable();
    ultimo.detectChanges();
  }

  afterEach(() => {
    jasmine.clock().uninstall();
    sessionStorage.clear();
  });

  it('saúda com o primeiro nome em maiúsculas', async () => {
    const tela = await renderizar('ana souza');

    expect(tela.querySelector('.saudacao-nome')?.textContent?.trim()).toBe('ANA');
    expect(tela.querySelector('.saudacao-nome')?.classList).toContain('ajj-truncar');
  });

  it('não mostra números fictícios', async () => {
    const tela = await renderizar('Ana');

    expect(/\d/.test(tela.querySelector('ion-content')?.textContent ?? '')).toBeFalse();
  });

  it('não mostra o card Próxima aula quando não há aula com janela aberta', async () => {
    agenda.and.returnValue(of([dia('2026-11-04', [aula({ janelaFechada: true })]), dia('2026-11-05', [aula({ podeMarcar: true, cancelada: true })])]));
    const tela = await renderizar('Ana');

    expect(tela.querySelector('.proxima-aula')).toBeNull();
    expect(tela.textContent).not.toContain('Check-in');
  });

  it('busca a agenda de hoje até domingo', async () => {
    await renderizar('Ana');

    expect(agenda).toHaveBeenCalledOnceWith('2026-11-04', '2026-11-08');
  });

  it('mostra a próxima aula com janela aberta e não cancelada', async () => {
    agenda.and.returnValue(
      of([
        dia('2026-11-04', [aula({ inicio: '07:10', janelaFechada: true }), aula({ id: 2, inicio: '12:00', podeMarcar: true, cancelada: true })]),
        dia('2026-11-05', [aula({ id: 3, inicio: '18:00', fim: '19:00', podeMarcar: true, modalidade: 'NO_GI', vao: 4 })])
      ])
    );
    const tela = await renderizar('Ana');

    const card = tela.querySelector('.proxima-aula')!;
    expect(card.textContent).toContain('Próxima aula');
    expect(card.textContent).toContain('Quinta, 05/11');
    expect(card.textContent).toContain('18:00');
    expect(card.textContent).toContain('No-Gi');
    expect(card.querySelector('button.vou')?.textContent?.trim()).toBe('Vou');
  });

  it('marca presença na próxima aula e vira ✓ Vou', async () => {
    agenda.and.returnValue(of([dia('2026-11-04', [aula({ inicio: '18:00', podeMarcar: true })])]));
    presenca.marcar.and.returnValue(of(undefined));
    const tela = await renderizar('Ana');

    await clicar(tela.querySelector<HTMLButtonElement>('.proxima-aula button.vou')!);

    expect(presenca.marcar).toHaveBeenCalledOnceWith('2026-11-04', 1);
    expect(tela.querySelector('.proxima-aula button.vou')?.textContent?.trim()).toBe('✓ Vou');
  });

  it('em erro ao marcar mantém o estado', async () => {
    agenda.and.returnValue(of([dia('2026-11-04', [aula({ podeMarcar: true })])]));
    presenca.marcar.and.returnValue(throwError(() => new Error('x')));
    const tela = await renderizar('Ana');

    await clicar(tela.querySelector<HTMLButtonElement>('.proxima-aula button.vou')!);

    expect(tela.querySelector('.proxima-aula button.vou')?.textContent?.trim()).toBe('Vou');
  });

  it('falha ao carregar a agenda esconde o card', async () => {
    agenda.and.returnValue(throwError(() => new Error('x')));
    const tela = await renderizar('Ana');

    expect(tela.querySelector('.proxima-aula')).toBeNull();
  });

  it('professor e dono veem o atalho Chamada, aluno não', async () => {
    expect((await renderizar('Pedro', 'PROFESSOR')).querySelector('ajj-botao.chamada')?.textContent?.trim()).toBe('Chamada');
    TestBed.resetTestingModule();
    expect((await renderizar('Carla', 'DONO')).querySelector('ajj-botao.chamada')?.textContent?.trim()).toBe('Chamada');
    TestBed.resetTestingModule();
    expect((await renderizar('Ana', 'ALUNO')).querySelector('ajj-botao.chamada')).toBeNull();
  });

  it('dono vê o card Área do dono logo após a saudação', async () => {
    const tela = await renderizar('Carla', 'DONO');

    expect(tela.querySelector('header.saudacao + app-area-dono')).not.toBeNull();
  });

  it('aluno e professor não veem o card', async () => {
    expect((await renderizar('Ana', 'ALUNO')).querySelector('app-area-dono')).toBeNull();
    TestBed.resetTestingModule();
    expect((await renderizar('Pedro', 'PROFESSOR')).querySelector('app-area-dono')).toBeNull();
  });

  it('ERR027 ao marcar assume que já está marcado', async () => {
    agenda.and.returnValue(of([dia('2026-11-04', [aula({ podeMarcar: true })])]));
    presenca.marcar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { codigo: 'ERR027' } })));
    const tela = await renderizar('Ana');

    await clicar(tela.querySelector<HTMLButtonElement>('.proxima-aula button.vou')!);

    expect(tela.querySelector('.proxima-aula button.vou')?.textContent?.trim()).toBe('✓ Vou');
  });

  it('ERR028 ao desmarcar assume que não está marcado', async () => {
    agenda.and.returnValue(of([dia('2026-11-04', [aula({ podeMarcar: true, euVou: true })])]));
    presenca.desmarcar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { codigo: 'ERR028' } })));
    const tela = await renderizar('Ana');

    await clicar(tela.querySelector<HTMLButtonElement>('.proxima-aula button.vou')!);

    expect(tela.querySelector('.proxima-aula button.vou')?.textContent?.trim()).toBe('Vou');
  });

  it('ERR026 recarrega a agenda', async () => {
    agenda.and.returnValue(of([dia('2026-11-04', [aula({ podeMarcar: true })])]));
    presenca.marcar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 422, error: { codigo: 'ERR026' } })));
    const tela = await renderizar('Ana');
    agenda.calls.reset();

    await clicar(tela.querySelector<HTMLButtonElement>('.proxima-aula button.vou')!);

    expect(agenda).toHaveBeenCalledTimes(1);
  });
});
