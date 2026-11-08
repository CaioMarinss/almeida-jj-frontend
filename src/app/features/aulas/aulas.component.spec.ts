import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AulaDoDia, DiaAgenda } from '../../shared/agenda/agenda.model';
import { AgendaService } from '../../shared/agenda/agenda.service';
import { PresencaService } from '../../shared/presenca/presenca.service';
import { Notificador } from '../../core/notificacao/notificador';
import { criarNotificador } from '../auth/testes-auth';
import { provedoresApp } from '../testes-app';
import { AulasComponent } from './aulas.component';

function aula(extra: Partial<AulaDoDia> = {}): AulaDoDia {
  return { id: 1, inicio: '07:10', fim: '08:10', modalidade: 'GI', avulsa: false, motivo: null, cancelada: false, motivoCancelamento: null, vao: 0, euVou: false, janelaFechada: false, podeMarcar: false, ...extra };
}

function semana(inicio: string, porData: Record<string, Partial<DiaAgenda>> = {}): DiaAgenda[] {
  return Array.from({ length: 7 }, (_, i) => {
    const data = new Date(Date.UTC(2026, 10, Number(inicio.slice(8)) + i)).toISOString().slice(0, 10);
    return { data, diaCancelado: null, aulas: [], ...porData[data] };
  });
}

describe('AulasComponent', () => {
  let service: jasmine.SpyObj<AgendaService>;
  let presenca: jasmine.SpyObj<PresencaService>;
  let notificador: jasmine.SpyObj<Notificador>;
  let fixture: ComponentFixture<AulasComponent>;

  const el = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => el().textContent ?? '';
  const botoesDia = (): HTMLButtonElement[] => Array.from(el().querySelectorAll<HTMLButtonElement>('.dia'));
  const seta = (rotulo: string): HTMLButtonElement => el().querySelector<HTMLButtonElement>(`button[aria-label="${rotulo}"]`)!;

  async function montar(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [AulasComponent],
      providers: [...provedoresApp(notificador), { provide: AgendaService, useValue: service }, { provide: PresencaService, useValue: presenca }]
    });
    fixture = TestBed.createComponent(AulasComponent);
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function clicar(botao: HTMLElement): Promise<void> {
    botao.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-11-07T15:00:00Z'));
    service = jasmine.createSpyObj<AgendaService>('AgendaService', ['agenda']);
    service.agenda.and.callFake(inicio => of(semana(inicio)));
    presenca = jasmine.createSpyObj<PresencaService>('PresencaService', ['marcar', 'desmarcar']);
    notificador = criarNotificador();
  });

  afterEach(() => jasmine.clock().uninstall());

  it('abre na semana de hoje com o dia de hoje selecionado', async () => {
    await montar();
    expect(service.agenda).toHaveBeenCalledOnceWith('2026-11-02', '2026-11-08');
    expect(botoesDia().length).toBe(7);
    const marcados = botoesDia().filter(b => b.getAttribute('aria-pressed') === 'true');
    expect(marcados.length).toBe(1);
    expect(marcados[0].getAttribute('aria-label')).toBe('Sábado, 07/11');
    expect(botoesDia()[0].getAttribute('aria-label')).toBe('Segunda, 02/11');
  });

  it('limita a navegação entre semanas e chama a API uma vez por semana', async () => {
    await montar();
    expect(seta('Semana anterior').disabled).toBeTrue();
    await clicar(seta('Próxima semana'));
    expect(service.agenda).toHaveBeenCalledWith('2026-11-09', '2026-11-15');
    expect(seta('Semana anterior').disabled).toBeFalse();
    expect(botoesDia().find(b => b.getAttribute('aria-pressed') === 'true')!.getAttribute('aria-label')).toBe('Sábado, 14/11');
    for (let i = 0; i < 3; i++) {
      await clicar(seta('Próxima semana'));
    }
    expect(service.agenda).toHaveBeenCalledTimes(5);
    expect(service.agenda).toHaveBeenCalledWith('2026-11-30', '2026-12-06');
    expect(seta('Próxima semana').disabled).toBeTrue();
  });

  it('mostra horário, fim e modalidade da aula', async () => {
    service.agenda.and.callFake(inicio => of(semana(inicio, { '2026-11-07': { aulas: [aula()] } })));
    await montar();
    expect(texto()).toContain('07:10');
    expect(texto()).toContain('até 08:10');
    expect(el().querySelector('.chip')?.textContent?.trim()).toBe('Gi');
  });

  it('mostra aula cancelada e avulsa', async () => {
    service.agenda.and.callFake(inicio =>
      of(semana(inicio, {
        '2026-11-07': {
          aulas: [
            aula({ cancelada: true, motivoCancelamento: 'Professor viajando' }),
            aula({ id: 2, inicio: '10:00', avulsa: true, motivo: 'Aulão de sábado' })
          ]
        }
      }))
    );
    await montar();
    expect(el().querySelector('.cancelada')).toBeTruthy();
    expect(texto()).toContain('Cancelada · Professor viajando');
    expect(texto()).toContain('Avulsa');
    expect(texto()).toContain('Aulão de sábado');
  });

  it('mostra aviso de dia inteiro cancelado', async () => {
    service.agenda.and.callFake(inicio =>
      of(semana(inicio, { '2026-11-07': { diaCancelado: { motivo: 'Feriado' }, aulas: [aula({ cancelada: true })] } }))
    );
    await montar();
    expect(el().querySelector('.aviso')?.textContent).toContain('Feriado');
    expect(el().querySelector('.cancelada')).toBeTruthy();
  });

  it('mostra estado vazio em dia sem aulas', async () => {
    await montar();
    expect(texto()).toContain('Sem aulas neste dia');
  });

  it('troca o dia selecionado ao tocar na tira', async () => {
    service.agenda.and.callFake(inicio => of(semana(inicio, { '2026-11-03': { aulas: [aula({ inicio: '18:00', fim: '19:00' })] } })));
    await montar();
    await clicar(botoesDia()[1]);
    expect(botoesDia()[1].getAttribute('aria-pressed')).toBe('true');
    expect(texto()).toContain('18:00');
  });

  it('mostra erro e refaz a chamada ao tentar de novo', async () => {
    service.agenda.and.returnValues(throwError(() => new Error('x')), of(semana('2026-11-02')));
    await montar();
    expect(texto()).toContain('Não foi possível carregar as aulas');
    const botao = el().querySelector<HTMLElement>('.erro-carga ajj-botao ion-button')!;
    await clicar(botao);
    expect(service.agenda).toHaveBeenCalledTimes(2);
    expect(texto()).toContain('Sem aulas neste dia');
  });

  it('recarrega a agenda ao reentrar na aba', async () => {
    await montar();
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(service.agenda).toHaveBeenCalledTimes(2);
  });

  it('volta para hoje ao reentrar depois da virada do dia', async () => {
    await montar();
    await clicar(botoesDia()[0]);
    jasmine.clock().mockDate(new Date('2026-11-09T15:00:00Z'));
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(service.agenda).toHaveBeenCalledWith('2026-11-09', '2026-11-15');
    expect(seta('Semana anterior').disabled).toBeTrue();
    const marcados = botoesDia().filter(b => b.getAttribute('aria-pressed') === 'true');
    expect(marcados.length).toBe(1);
    expect(marcados[0].getAttribute('aria-label')).toBe('Segunda, 09/11');
  });

  it('mantém o dia escolhido ao reentrar quando ele não ficou no passado', async () => {
    await montar();
    await clicar(seta('Próxima semana'));
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const marcado = botoesDia().find(b => b.getAttribute('aria-pressed') === 'true')!;
    expect(marcado.getAttribute('aria-label')).toBe('Sábado, 14/11');
  });

  describe('presença', () => {
    const botaoVou = (): HTMLButtonElement => el().querySelector<HTMLButtonElement>('button.vou')!;
    const contador = (): string => el().querySelector('.contador')?.textContent?.trim() ?? '';

    function abertas(): void {
      service.agenda.and.callFake(inicio =>
        of(semana(inicio, { '2026-11-07': { aulas: [aula({ inicio: '18:00', vao: 2, podeMarcar: true }), aula({ id: 2, inicio: '19:00', vao: 5, podeMarcar: true })] } }))
      );
    }

    it('marca, atualiza o card sem recarregar a semana', async () => {
      abertas();
      presenca.marcar.and.returnValue(of(undefined));
      await montar();
      await clicar(botaoVou());
      expect(presenca.marcar).toHaveBeenCalledOnceWith('2026-11-07', 1);
      expect(service.agenda).toHaveBeenCalledTimes(1);
      expect(botaoVou().textContent?.trim()).toBe('✓ Vou');
      expect(contador()).toBe('3 vão');
      expect(el().querySelectorAll('.contador')[1].textContent?.trim()).toBe('5 vão');
    });

    it('desmarca quando já marcado', async () => {
      service.agenda.and.callFake(inicio =>
        of(semana(inicio, { '2026-11-07': { aulas: [aula({ vao: 4, euVou: true, podeMarcar: true })] } }))
      );
      presenca.desmarcar.and.returnValue(of(undefined));
      await montar();
      await clicar(botaoVou());
      expect(presenca.desmarcar).toHaveBeenCalledOnceWith('2026-11-07', 1);
      expect(presenca.marcar).not.toHaveBeenCalled();
      expect(botaoVou().textContent?.trim()).toBe('Vou');
      expect(contador()).toBe('3 vão');
    });

    it('protege contra duplo toque enquanto salva', async () => {
      abertas();
      const resposta = new Subject<void>();
      presenca.marcar.and.returnValue(resposta);
      await montar();
      await clicar(botaoVou());
      await clicar(botaoVou());
      expect(presenca.marcar).toHaveBeenCalledTimes(1);
      expect(botaoVou().disabled).toBeTrue();
      resposta.next();
      resposta.complete();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(botaoVou().disabled).toBeFalse();
      expect(contador()).toBe('3 vão');
    });

    it('em erro avisa e mantém o estado', async () => {
      abertas();
      const falha = new Error('x');
      presenca.marcar.and.returnValue(throwError(() => falha));
      await montar();
      await clicar(botaoVou());
      expect(notificador.erroDaApi).toHaveBeenCalledWith(falha);
      expect(botaoVou().textContent?.trim()).toBe('Vou');
      expect(botaoVou().disabled).toBeFalse();
      expect(contador()).toBe('2 vão');
    });
  });
});
