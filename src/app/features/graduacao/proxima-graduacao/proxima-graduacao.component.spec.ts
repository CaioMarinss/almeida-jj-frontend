import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { GraduacaoService } from '../../../shared/graduacao/graduacao.service';
import { criarNotificador } from '../../auth/testes-auth';
import { provedoresApp } from '../../testes-app';
import { ProximaGraduacaoComponent } from './proxima-graduacao.component';

describe('ProximaGraduacaoComponent', () => {
  let service: jasmine.SpyObj<GraduacaoService>;
  let notificador: ReturnType<typeof criarNotificador>;
  let fixture: ComponentFixture<ProximaGraduacaoComponent>;

  const el = (): HTMLElement => fixture.nativeElement;
  const textos = (): string => el().textContent ?? '';
  const botao = (rotulo: string): HTMLElement | undefined =>
    Array.from(el().querySelectorAll<HTMLElement>('ajj-botao')).find((b) => b.textContent?.trim() === rotulo);
  const clicar = (rotulo: string): void => {
    botao(rotulo)!.querySelector('ion-button')!.click();
    fixture.detectChanges();
  };
  const campo = (): HTMLInputElement => el().querySelector<HTMLInputElement>('input[type="date"]')!;

  function criar(): void {
    fixture = TestBed.createComponent(ProximaGraduacaoComponent);
    fixture.detectChanges();
  }

  function escolher(valor: string): void {
    campo().value = valor;
    campo().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    notificador = criarNotificador();
    service = jasmine.createSpyObj<GraduacaoService>('GraduacaoService', ['proxima', 'agendar', 'cancelar']);
    service.proxima.and.returnValue(of(null));
    TestBed.configureTestingModule({
      imports: [ProximaGraduacaoComponent],
      providers: [...provedoresApp(notificador), { provide: GraduacaoService, useValue: service }]
    });
  });

  it('sem data agendada mostra o aviso e Agendar', () => {
    criar();

    expect(textos()).toContain('Nenhuma data agendada');
    expect(botao('Agendar')).toBeDefined();
    expect(botao('Trocar')).toBeUndefined();
    expect(el().querySelector('section')?.getAttribute('aria-labelledby')).toBe('proxima-titulo');
    expect(el().querySelector('#proxima-titulo')?.textContent).toContain('Próxima graduação');
  });

  it('falha ao carregar mostra erro, esconde as ações e Tentar de novo recarrega', () => {
    service.proxima.and.returnValue(throwError(() => new Error('falha')));
    criar();

    expect(textos()).toContain('Não foi possível carregar a data.');
    expect(textos()).not.toContain('Nenhuma data agendada');
    expect(botao('Agendar')).toBeUndefined();
    expect(botao('Trocar')).toBeUndefined();
    expect(botao('Cancelar')).toBeUndefined();

    service.proxima.and.returnValue(of('2026-12-14'));
    clicar('Tentar de novo');

    expect(service.proxima).toHaveBeenCalledTimes(2);
    expect(textos()).toContain('14/12');
    expect(textos()).not.toContain('Não foi possível carregar a data.');
    expect(botao('Trocar')).toBeDefined();
  });

  it('com data mostra o dia, Trocar e Cancelar', () => {
    service.proxima.and.returnValue(of('2026-12-14'));
    criar();

    expect(textos()).toContain('14/12');
    expect(botao('Trocar')).toBeDefined();
    expect(botao('Cancelar')).toBeDefined();
    expect(botao('Agendar')).toBeUndefined();
  });

  it('o seletor de data tem rótulo e mínimo igual a hoje em São Paulo', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-11-06T01:30:00Z'));
    try {
      criar();
      clicar('Agendar');

      expect(campo().min).toBe('2026-11-05');
      expect(el().querySelector('label[for="data-proxima"]')?.textContent).toContain('Data da graduação');
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('agendar chama a API, atualiza o bloco e mostra o toast', () => {
    service.agendar.and.returnValue(of('2026-12-14'));
    criar();
    clicar('Agendar');
    escolher('2026-12-14');

    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(service.agendar).toHaveBeenCalledWith('2026-12-14');
    expect(textos()).toContain('14/12');
    expect(botao('Trocar')).toBeDefined();
    expect(notificador.sucesso).toHaveBeenCalled();
  });

  it('trocar parte da data atual', () => {
    service.proxima.and.returnValue(of('2026-12-14'));
    criar();
    clicar('Trocar');

    expect(campo().value).toBe('2026-12-14');
  });

  it('Salvar fica desabilitado sem data', () => {
    criar();
    clicar('Agendar');

    el().querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(service.agendar).not.toHaveBeenCalled();
  });

  it('erro ao agendar usa erroDaApi e mantém o formulário', () => {
    const erro = new Error('ERR014');
    service.agendar.and.returnValue(throwError(() => erro));
    criar();
    clicar('Agendar');
    escolher('2020-01-01');

    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(notificador.erroDaApi).toHaveBeenCalledWith(erro, jasmine.any(String));
    expect(campo()).not.toBeNull();
  });

  it('cancelar só chama a API se confirmado', async () => {
    service.proxima.and.returnValue(of('2026-12-14'));
    service.cancelar.and.returnValue(of(undefined));
    notificador.confirmar.and.resolveTo(false);
    criar();

    await fixture.componentInstance.cancelar();
    expect(service.cancelar).not.toHaveBeenCalled();
    expect(textos()).toContain('14/12');

    notificador.confirmar.and.resolveTo(true);
    await fixture.componentInstance.cancelar();
    fixture.detectChanges();

    expect(service.cancelar).toHaveBeenCalledTimes(1);
    expect(textos()).toContain('Nenhuma data agendada');
    expect(notificador.sucesso).toHaveBeenCalled();
  });

  it('erro ao cancelar usa erroDaApi e mantém a data', async () => {
    const erro = new Error('x');
    service.proxima.and.returnValue(of('2026-12-14'));
    service.cancelar.and.returnValue(throwError(() => erro));
    criar();

    await fixture.componentInstance.cancelar();
    fixture.detectChanges();

    expect(notificador.erroDaApi).toHaveBeenCalledWith(erro, jasmine.any(String));
    expect(textos()).toContain('14/12');
  });
});
