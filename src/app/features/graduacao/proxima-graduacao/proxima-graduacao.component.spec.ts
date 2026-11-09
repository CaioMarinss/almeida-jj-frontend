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

  const campoMinimo = (id: string): HTMLInputElement => el().querySelector<HTMLInputElement>(`#${id}`)!;

  function escolher(valor: string): void {
    campo().value = valor;
    campo().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function minimos(grau: string, faixa: string): void {
    for (const [id, valor] of [['minimo-grau', grau], ['minimo-faixa', faixa]]) {
      campoMinimo(id).value = valor;
      campoMinimo(id).dispatchEvent(new Event('input'));
    }
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

  it('sem data agendada mostra o aviso e Alterar, em uma linha compacta', () => {
    criar();

    expect(textos()).toContain('Sem data definida para a próxima graduação');
    expect(botao('Alterar')).toBeDefined();
    expect(el().querySelector('section')?.getAttribute('aria-label')).toBe('Próxima graduação');
    expect(el().querySelector('h2')).toBeNull();
  });

  it('falha ao carregar mostra erro, esconde as ações e Tentar de novo recarrega', () => {
    service.proxima.and.returnValue(throwError(() => new Error('falha')));
    criar();

    expect(textos()).toContain('Não foi possível carregar a data.');
    expect(textos()).not.toContain('Sem data definida');
    expect(botao('Alterar')).toBeUndefined();

    service.proxima.and.returnValue(of({ data: '2026-12-14', minimoGrau: null, minimoFaixa: null }));
    clicar('Tentar de novo');

    expect(service.proxima).toHaveBeenCalledTimes(2);
    expect(textos()).toContain('14/12');
    expect(textos()).not.toContain('Não foi possível carregar a data.');
    expect(botao('Alterar')).toBeDefined();
  });

  it('próxima graduação mostra a data e o botão Alterar', () => {
    service.proxima.and.returnValue(of({ data: '2026-12-14', minimoGrau: null, minimoFaixa: null }));
    criar();

    expect(textos()).toContain('Próxima graduação');
    expect(textos()).toContain('14/12');
    expect(textos()).not.toContain('Sem data definida');
    expect(botao('Alterar')).toBeDefined();
    expect(botao('Trocar')).toBeUndefined();
    expect(botao('Cancelar data')).toBeUndefined();
  });

  it('Alterar com data abre o formulário com Salvar, Cancelar data e Voltar', () => {
    service.proxima.and.returnValue(of({ data: '2026-12-14', minimoGrau: null, minimoFaixa: null }));
    criar();
    clicar('Alterar');

    expect(campo().value).toBe('2026-12-14');
    expect(botao('Salvar')).toBeDefined();
    expect(botao('Cancelar data')).toBeDefined();
    clicar('Voltar');
    expect(botao('Alterar')).toBeDefined();
  });

  it('Alterar sem data abre o formulário sem Cancelar data', () => {
    criar();
    clicar('Alterar');

    expect(campo().value).toBe('');
    expect(botao('Cancelar data')).toBeUndefined();
  });

  it('o seletor de data tem rótulo e mínimo igual a hoje em São Paulo', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-11-06T01:30:00Z'));
    try {
      criar();
      clicar('Alterar');

      expect(campo().min).toBe('2026-11-05');
      expect(el().querySelector('label[for="data-proxima"]')?.textContent).toContain('Data da graduação');
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('agendar chama a API, atualiza o bloco e mostra o toast', () => {
    service.agendar.and.returnValue(of({ data: '2026-12-14', minimoGrau: null, minimoFaixa: null }));
    criar();
    clicar('Alterar');
    escolher('2026-12-14');
    minimos('30', '60');

    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(service.agendar).toHaveBeenCalledWith('2026-12-14', 30, 60);
    expect(textos()).toContain('14/12');
    expect(botao('Alterar')).toBeDefined();
    expect(notificador.sucesso).toHaveBeenCalled();
  });

  it('a linha mostra os mínimos ou "mínimo não definido"', () => {
    service.proxima.and.returnValue(of({ data: '2026-12-14', minimoGrau: 30, minimoFaixa: 60 }));
    criar();

    expect(textos()).toContain('Mínimo: 30 grau · 60 faixa');
    expect(textos()).not.toContain('mínimo não definido');
  });

  it('sem mínimos a linha avisa "mínimo não definido"', () => {
    service.proxima.and.returnValue(of({ data: '2026-12-14', minimoGrau: null, minimoFaixa: null }));
    criar();

    expect(textos()).toContain('mínimo não definido');
  });

  it('o formulário tem os campos de mínimo, rotulados e preenchidos com os valores atuais', () => {
    service.proxima.and.returnValue(of({ data: '2026-12-14', minimoGrau: 30, minimoFaixa: 60 }));
    criar();
    clicar('Alterar');

    expect(el().querySelector('label[for="minimo-grau"]')?.textContent).toContain('Mínimo para grau');
    expect(el().querySelector('label[for="minimo-faixa"]')?.textContent).toContain('Mínimo para faixa');
    expect(campoMinimo('minimo-grau').value).toBe('30');
    expect(campoMinimo('minimo-faixa').value).toBe('60');
  });

  it('não agenda sem os dois mínimos, nem com valor negativo ou decimal', () => {
    criar();
    clicar('Alterar');
    escolher('2026-12-14');

    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    minimos('30', '');
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    minimos('-1', '60');
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    minimos('3.5', '60');
    el().querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(service.agendar).not.toHaveBeenCalled();
  });

  it('aceita mínimo zero', () => {
    service.agendar.and.returnValue(of({ data: '2026-12-14', minimoGrau: 0, minimoFaixa: 0 }));
    criar();
    clicar('Alterar');
    escolher('2026-12-14');
    minimos('0', '0');

    el().querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(service.agendar).toHaveBeenCalledWith('2026-12-14', 0, 0);
  });

  it('Salvar fica desabilitado sem data', () => {
    criar();
    clicar('Alterar');

    el().querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(service.agendar).not.toHaveBeenCalled();
  });

  it('erro ao agendar usa erroDaApi e mantém o formulário', () => {
    const erro = new Error('ERR014');
    service.agendar.and.returnValue(throwError(() => erro));
    criar();
    clicar('Alterar');
    escolher('2020-01-01');
    minimos('30', '60');

    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(notificador.erroDaApi).toHaveBeenCalledWith(erro, jasmine.any(String));
    expect(campo()).not.toBeNull();
  });

  it('cancelar só chama a API se confirmado', async () => {
    service.proxima.and.returnValue(of({ data: '2026-12-14', minimoGrau: null, minimoFaixa: null }));
    service.cancelar.and.returnValue(of(undefined));
    notificador.confirmar.and.resolveTo(false);
    criar();
    clicar('Alterar');

    await fixture.componentInstance.cancelar();
    expect(service.cancelar).not.toHaveBeenCalled();
    expect(campo()).not.toBeNull();

    notificador.confirmar.and.resolveTo(true);
    await fixture.componentInstance.cancelar();
    fixture.detectChanges();

    expect(service.cancelar).toHaveBeenCalledTimes(1);
    expect(textos()).toContain('Sem data definida para a próxima graduação');
    expect(campo()).toBeNull();
    expect(notificador.sucesso).toHaveBeenCalled();
  });

  it('erro ao cancelar usa erroDaApi e mantém a data', async () => {
    const erro = new Error('x');
    service.proxima.and.returnValue(of({ data: '2026-12-14', minimoGrau: null, minimoFaixa: null }));
    service.cancelar.and.returnValue(throwError(() => erro));
    criar();
    clicar('Alterar');

    await fixture.componentInstance.cancelar();
    fixture.detectChanges();

    expect(notificador.erroDaApi).toHaveBeenCalledWith(erro, jasmine.any(String));
    expect(campo().value).toBe('2026-12-14');
  });
});
