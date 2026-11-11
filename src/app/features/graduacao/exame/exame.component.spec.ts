import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Apto, Faixa } from '../../../shared/graduacao/graduacao.model';
import { ExameRegistrado, GraduacaoService } from '../../../shared/graduacao/graduacao.service';
import { criarNotificador } from '../../auth/testes-auth';
import { provedoresApp } from '../../testes-app';
import { ExameComponent, lerNota } from './exame.component';

const BRANCA: Faixa = { id: 1, codigo: 'B', descricao: 'Branca', categoria: 'ADULTO', corPrincipal: '#fff', corSecundaria: null, grauMin: 0, grauMax: 4 };

function apto(extra: Partial<Apto> = {}): Apto {
  return {
    id: 7,
    nome: 'Bia',
    atual: { faixa: BRANCA, grau: 2 },
    contadas: 34,
    minimo: 30,
    apto: true,
    sugestao: { faixa: BRANCA, grau: 3 },
    exame: null,
    graduado: false,
    ...extra
  };
}

const REGISTRADO: ExameRegistrado = { exame: { id: 1, evento: { id: 1, data: '2026-12-14' }, aprovado: true, nota: 8.5, observacao: null }, graduacao: null };

describe('ExameComponent', () => {
  let service: jasmine.SpyObj<GraduacaoService>;
  let notificador: ReturnType<typeof criarNotificador>;
  let fixture: ComponentFixture<ExameComponent>;

  const el = (): HTMLElement => fixture.nativeElement;
  const botao = (rotulo: string): HTMLElement | undefined =>
    Array.from(el().querySelectorAll<HTMLElement>('ajj-botao')).find((b) => b.textContent?.trim() === rotulo);
  const opcao = (rotulo: string): HTMLButtonElement =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('button.opcao')).find((b) => b.textContent?.trim() === rotulo)!;
  const caixa = (): HTMLInputElement | null => el().querySelector<HTMLInputElement>('input[type="checkbox"]');

  function criar(a: Apto = apto(), liberado = true): void {
    fixture = TestBed.createComponent(ExameComponent);
    fixture.componentRef.setInput('apto', a);
    fixture.componentRef.setInput('liberadoGraduar', liberado);
    fixture.detectChanges();
  }

  function digitar(valor: string): void {
    const campo = el().querySelector<HTMLInputElement>('#exame-nota')!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function escolher(rotulo: string): void {
    opcao(rotulo).click();
    fixture.detectChanges();
  }

  function enviar(): void {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    notificador = criarNotificador();
    service = jasmine.createSpyObj<GraduacaoService>('GraduacaoService', ['registrarExame', 'removerExame']);
    service.registrarExame.and.returnValue(of(REGISTRADO));
    TestBed.configureTestingModule({
      imports: [ExameComponent],
      providers: [...provedoresApp(notificador), { provide: GraduacaoService, useValue: service }]
    });
  });

  it('lerNota aceita vírgula e ponto e recusa fora de 0 a 10 ou mais de uma casa', () => {
    expect(lerNota('8,5')).toBe(8.5);
    expect(lerNota('8.5')).toBe(8.5);
    expect(lerNota('0')).toBe(0);
    expect(lerNota('10')).toBe(10);
    expect(lerNota('10,5')).toBeNull();
    expect(lerNota('8,55')).toBeNull();
    expect(lerNota('-1')).toBeNull();
    expect(lerNota('')).toBeNull();
    expect(lerNota('abc')).toBeNull();
  });

  it('notaComVirgulaEnviaNumero', () => {
    criar();
    escolher('Aprovado');
    digitar('8,5');
    enviar();

    expect(service.registrarExame).toHaveBeenCalledOnceWith(7, {
      aprovado: true,
      nota: 8.5,
      observacao: null,
      graduar: { idGraduacao: 1, grau: 3 }
    });
  });

  it('notaInvalidaBloqueiaSalvar', () => {
    criar();
    escolher('Aprovado');
    for (const ruim of ['', '11', '-1', '8,55', 'x']) {
      digitar(ruim);
      enviar();
    }

    expect(service.registrarExame).not.toHaveBeenCalled();
    digitar('11');
    expect(el().querySelector('#exame-nota')!.getAttribute('aria-invalid')).toBe('true');
    expect(botao('Salvar exame')!.querySelector<HTMLElement & { disabled: boolean }>('ion-button')!.disabled).toBeTrue();
  });

  it('exige escolher Aprovado ou Reprovado, com aria-pressed', () => {
    criar();
    digitar('7');
    enviar();

    expect(service.registrarExame).not.toHaveBeenCalled();
    escolher('Reprovado');
    expect(opcao('Reprovado').getAttribute('aria-pressed')).toBe('true');
    expect(opcao('Aprovado').getAttribute('aria-pressed')).toBe('false');
  });

  it('caixaGraduarSoQuandoLiberado', () => {
    criar(apto(), true);
    expect(caixa()).toBeNull();
    escolher('Aprovado');
    expect(caixa()!.checked).toBeTrue();
    expect(el().textContent).toContain('Já registrar a graduação (Branca · 3 graus)');
    escolher('Reprovado');
    expect(caixa()).toBeNull();

    criar(apto(), false);
    escolher('Aprovado');
    expect(caixa()).toBeNull();

    criar(apto({ apto: false }), true);
    escolher('Aprovado');
    expect(caixa()).toBeNull();
  });

  it('desmarcar a caixa salva só o exame', () => {
    criar();
    escolher('Aprovado');
    caixa()!.click();
    fixture.detectChanges();
    digitar('9');
    enviar();

    expect(service.registrarExame.calls.mostRecent().args[1].graduar).toBeNull();
  });

  it('exameDeAlunoNaoApto salva sem graduar', () => {
    criar(apto({ apto: false, contadas: 5, sugestao: null }), true);
    escolher('Aprovado');
    digitar('6');
    enviar();

    expect(service.registrarExame).toHaveBeenCalledOnceWith(7, { aprovado: true, nota: 6, observacao: null, graduar: null });
  });

  it('observação limitada a 200 e enviada aparada', () => {
    criar();
    escolher('Reprovado');
    digitar('4');
    const obs = el().querySelector<HTMLTextAreaElement>('#exame-observacao')!;
    expect(obs.maxLength).toBe(200);
    obs.value = '  precisa melhorar  ';
    obs.dispatchEvent(new Event('input'));
    enviar();

    expect(service.registrarExame.calls.mostRecent().args[1].observacao).toBe('precisa melhorar');
  });

  it('com exame existente preenche os campos e oferece Remover exame', async () => {
    service.removerExame.and.returnValue(of(undefined));
    criar(apto({ exame: { aprovado: false, nota: 4, observacao: 'x' } }));

    expect(el().querySelector<HTMLInputElement>('#exame-nota')!.value).toBe('4,0');
    expect(opcao('Reprovado').getAttribute('aria-pressed')).toBe('true');
    const removido = jasmine.createSpy('removido');
    fixture.componentInstance.removido.subscribe(removido);

    notificador.confirmar.and.resolveTo(false);
    await fixture.componentInstance.remover();
    expect(service.removerExame).not.toHaveBeenCalled();

    notificador.confirmar.and.resolveTo(true);
    await fixture.componentInstance.remover();
    expect(service.removerExame).toHaveBeenCalledOnceWith(7);
    expect(removido).toHaveBeenCalled();
  });

  it('cabeçalho mostra faixa atual, sugestão e contagem; o botão de sair é Cancelar', () => {
    criar();

    const cabeca = el().querySelector('.cabeca')!.textContent!.replace(/\s+/g, ' ');
    expect(cabeca).toContain('Branca · 2 graus → Branca · 3 graus');
    expect(cabeca).toContain('34/30');
    expect(botao('Cancelar')).toBeDefined();
    expect(botao('Fechar')).toBeUndefined();
  });

  it('remover não confirma enquanto salva', async () => {
    criar(apto({ exame: { aprovado: true, nota: 8, observacao: null } }));
    fixture.componentInstance.salvando.set(true);
    await fixture.componentInstance.remover();

    expect(notificador.confirmar).not.toHaveBeenCalled();
  });

  it('sem exame não mostra Remover exame', () => {
    criar();

    expect(botao('Remover exame')).toBeUndefined();
  });

  it('emite salvo e erro da API vai ao Notificador', () => {
    criar();
    const salvo = jasmine.createSpy('salvo');
    fixture.componentInstance.salvo.subscribe(salvo);
    escolher('Aprovado');
    digitar('8');
    enviar();
    expect(salvo).toHaveBeenCalledWith(REGISTRADO);

    const erro = new Error('ERR031');
    service.registrarExame.and.returnValue(throwError(() => erro));
    enviar();
    expect(notificador.erroDaApi).toHaveBeenCalledWith(erro, jasmine.any(String));
  });
});
