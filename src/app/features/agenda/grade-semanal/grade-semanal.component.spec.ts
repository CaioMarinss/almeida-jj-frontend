import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AulaGrade } from '../../../shared/agenda/agenda.model';
import { AgendaService } from '../../../shared/agenda/agenda.service';
import { Notificador } from '../../../core/notificacao/notificador';
import { criarNotificador } from '../../auth/testes-auth';
import { provedoresApp } from '../../testes-app';
import { GradeSemanalComponent } from './grade-semanal.component';

function aula(extra: Partial<AulaGrade> = {}): AulaGrade {
  return { id: 1, diaSemana: 1, inicio: '07:10', fim: '08:10', modalidade: 'GI', ...extra };
}

describe('GradeSemanalComponent', () => {
  let service: jasmine.SpyObj<AgendaService>;
  let notificador: jasmine.SpyObj<Notificador>;
  let fixture: ComponentFixture<GradeSemanalComponent>;

  const el = (): HTMLElement => fixture.nativeElement;
  const dias = (): HTMLButtonElement[] => Array.from(el().querySelectorAll<HTMLButtonElement>('.dia'));
  const horas = (): string[] => Array.from(el().querySelectorAll('.aula .hora strong')).map(h => h.textContent!.trim());

  async function atualizar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    notificador = criarNotificador();
    service = jasmine.createSpyObj<AgendaService>('AgendaService', ['grade', 'criarAula', 'editarAula', 'tirarDaGrade']);
    service.grade.and.returnValue(
      of([
        aula({ id: 3, inicio: '18:00', fim: '19:00' }),
        aula({ id: 1 }),
        aula({ id: 2, diaSemana: 2, inicio: '19:30', fim: '20:30', modalidade: 'KIDS' }),
        aula({ id: 4, diaSemana: 7, inicio: '10:00', fim: '11:00' })
      ])
    );
    service.criarAula.and.callFake(n => of({ id: 9, ...n }));
    service.editarAula.and.callFake((_, e) => of({ id: 10, diaSemana: 1, ...e }));
    service.tirarDaGrade.and.returnValue(of(undefined));
    TestBed.configureTestingModule({
      imports: [GradeSemanalComponent],
      providers: [...provedoresApp(notificador), { provide: AgendaService, useValue: service }]
    });
    fixture = TestBed.createComponent(GradeSemanalComponent);
    await atualizar();
  });

  it('mostra os 7 dias e, por padrão, as aulas de segunda em ordem de horário', () => {
    expect(dias().map(d => d.textContent!.trim())).toEqual(['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']);
    expect(dias()[0].getAttribute('aria-pressed')).toBe('true');
    expect(horas()).toEqual(['07:10', '18:00']);
    expect(el().querySelector('.aula .chip')?.textContent).toContain('Gi');
  });

  it('trocar o dia filtra a lista e ajusta o botão de adicionar', async () => {
    dias()[1].click();
    await atualizar();
    expect(horas()).toEqual(['19:30']);
    expect(el().querySelector('.adicionar')?.textContent).toContain('+ Aula na terça');

    dias()[5].click();
    await atualizar();
    expect(el().querySelector('.adicionar')?.textContent).toContain('+ Aula no sábado');

    dias()[6].click();
    await atualizar();
    expect(horas()).toEqual(['10:00']);
    expect(el().querySelector('.adicionar')?.textContent).toContain('+ Aula no domingo');
  });

  it('dia sem aulas mostra estado vazio', async () => {
    dias()[2].click();
    await atualizar();

    expect(horas()).toEqual([]);
    expect(el().querySelector('ajj-estado-vazio')).not.toBeNull();
  });

  it('criar usa o dia escolhido, soma à lista e avisa', async () => {
    dias()[2].click();
    await atualizar();
    fixture.componentInstance.abrirNova();

    await fixture.componentInstance.salvar({ inicio: '06:00', fim: '07:00', modalidade: 'GI' });
    await atualizar();

    expect(service.criarAula).toHaveBeenCalledWith({ diaSemana: 3, inicio: '06:00', fim: '07:00', modalidade: 'GI' });
    expect(notificador.sucesso).toHaveBeenCalledWith('Aula adicionada.');
    expect(horas()).toEqual(['06:00']);
    expect(fixture.componentInstance.painel()).toBeNull();
  });

  it('editar troca a aula pela nova versão (novo id) e avisa', async () => {
    fixture.componentInstance.abrirEdicao(aula());

    await fixture.componentInstance.salvar({ inicio: '07:30', fim: '08:30', modalidade: 'NO_GI' });
    await atualizar();

    expect(service.editarAula).toHaveBeenCalledWith(1, { inicio: '07:30', fim: '08:30', modalidade: 'NO_GI' });
    expect(service.criarAula).not.toHaveBeenCalled();
    expect(notificador.sucesso).toHaveBeenCalledWith('Aula alterada.');
    expect(horas()).toEqual(['07:30', '18:00']);
  });

  it('tirar da grade pede confirmação e só chama a API se confirmado', async () => {
    fixture.componentInstance.abrirEdicao(aula());
    notificador.confirmar.and.resolveTo(false);
    await fixture.componentInstance.tirar();
    expect(service.tirarDaGrade).not.toHaveBeenCalled();
    expect(notificador.confirmar.calls.mostRecent().args[1]).toBe('A aula sai da grade a partir de amanhã. Continuar?');

    notificador.confirmar.and.resolveTo(true);
    await fixture.componentInstance.tirar();
    await atualizar();

    expect(service.tirarDaGrade).toHaveBeenCalledWith(1);
    expect(notificador.sucesso).toHaveBeenCalledWith('Aula tirada da grade.');
    expect(horas()).toEqual(['18:00']);
  });

  it('erro da API ao salvar vai para o Notificador e mantém o painel aberto', async () => {
    const erro = new HttpErrorResponse({ status: 409, error: { code: 'ERR020' } });
    service.criarAula.and.returnValue(throwError(() => erro));
    fixture.componentInstance.abrirNova();

    await fixture.componentInstance.salvar({ inicio: '07:10', fim: '08:10', modalidade: 'GI' });

    expect(notificador.erroDaApi).toHaveBeenCalledWith(erro, jasmine.any(String));
    expect(notificador.sucesso).not.toHaveBeenCalled();
    expect(fixture.componentInstance.painel()).not.toBeNull();
  });

  it('falha ao carregar mostra o erro e permite tentar de novo', async () => {
    service.grade.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    fixture = TestBed.createComponent(GradeSemanalComponent);
    await atualizar();

    expect(el().querySelector('.erro-carga')).not.toBeNull();
    expect(notificador.erroDaApi).toHaveBeenCalled();
  });
});
