import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { AlunoGraduacao, Categoria, Faixa, RegistroGraduacao } from '../../../shared/graduacao/graduacao.model';
import { GraduacaoService } from '../../../shared/graduacao/graduacao.service';
import { criarNotificador } from '../../auth/testes-auth';
import { provedoresApp } from '../../testes-app';
import { RegistroGraduacaoComponent } from './registro-graduacao.component';

function faixa(id: number, categoria: Categoria, descricao: string, grauMin: number, grauMax: number): Faixa {
  return { id, codigo: `F${id}`, descricao, categoria, corPrincipal: '#fff', corSecundaria: null, grauMin, grauMax };
}

const AZUL = faixa(1, 'ADULTO', 'Azul', 0, 4);
const FAIXAS: Faixa[] = [
  faixa(10, 'INFANTIL', 'Cinza', 0, 10),
  AZUL,
  faixa(2, 'ADULTO', 'Preta', 0, 6),
  faixa(3, 'MESTRE', 'Coral vermelha e preta', 7, 7),
  faixa(4, 'MESTRE', 'Vermelha', 9, 10)
];

const ALUNO: AlunoGraduacao = { id: 7, nome: 'Ana', email: 'a@x.com', perfil: 'ALUNO', atual: null };

describe('RegistroGraduacaoComponent', () => {
  let service: jasmine.SpyObj<GraduacaoService>;
  let notificador: ReturnType<typeof criarNotificador>;
  let fixture: ComponentFixture<RegistroGraduacaoComponent>;

  const el = (): HTMLElement => fixture.nativeElement;
  const faixaSelect = (): HTMLSelectElement => el().querySelector<HTMLSelectElement>('#registro-faixa')!;
  const grauSelect = (): HTMLSelectElement => el().querySelector<HTMLSelectElement>('#registro-grau')!;
  const dataInput = (): HTMLInputElement => el().querySelector<HTMLInputElement>('#registro-data')!;
  const graus = (): string[] => Array.from(grauSelect().options).map((o) => o.value);
  const salvar = (): void => {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  function escolher(select: HTMLSelectElement, valor: string): void {
    select.value = valor;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function digitarData(valor: string): void {
    dataInput().value = valor;
    dataInput().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function criar(aluno: AlunoGraduacao = ALUNO): void {
    fixture = TestBed.createComponent(RegistroGraduacaoComponent);
    fixture.componentRef.setInput('aluno', aluno);
    fixture.detectChanges();
  }

  const registro = (data: string): RegistroGraduacao => ({ id: 1, faixa: AZUL, grau: 2, data });

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-11-06T15:00:00Z'));
    notificador = criarNotificador();
    service = jasmine.createSpyObj<GraduacaoService>('GraduacaoService', ['faixas', 'historicoDe', 'registrar']);
    service.faixas.and.returnValue(of(FAIXAS));
    service.historicoDe.and.returnValue(of([]));
    TestBed.configureTestingModule({
      imports: [RegistroGraduacaoComponent],
      providers: [...provedoresApp(notificador), { provide: GraduacaoService, useValue: service }]
    });
  });

  afterEach(() => jasmine.clock().uninstall());

  it('agrupa as faixas em Infantil, Adulto e Mestres com rótulos', () => {
    criar();

    const select = faixaSelect();
    expect(el().querySelector(`label[for="${select.id}"]`)).not.toBeNull();
    expect(Array.from(select.querySelectorAll('optgroup')).map((g) => g.label)).toEqual(['Infantil', 'Adulto', 'Mestres']);
    expect(select.querySelectorAll('optgroup option').length).toBe(5);
    expect(el().querySelector(`label[for="${grauSelect().id}"]`)).not.toBeNull();
    expect(el().querySelector(`label[for="${dataInput().id}"]`)).not.toBeNull();
  });

  it('trocar a faixa limita os graus e reajusta o escolhido', () => {
    criar();
    escolher(faixaSelect(), '2');
    expect(graus()).toEqual(['0', '1', '2', '3', '4', '5', '6']);
    escolher(grauSelect(), '5');

    escolher(faixaSelect(), '4');
    expect(graus()).toEqual(['9', '10']);
    expect(grauSelect().value).toBe('9');

    escolher(faixaSelect(), '3');
    expect(graus()).toEqual(['7']);
    expect(grauSelect().value).toBe('7');

    escolher(faixaSelect(), '10');
    expect(graus().length).toBe(11);
  });

  it('começa pela graduação atual do aluno', () => {
    criar({ ...ALUNO, atual: { faixa: AZUL, grau: 3 } });

    expect(faixaSelect().value).toBe('1');
    expect(grauSelect().value).toBe('3');
  });

  it('às 01:00 UTC ainda é o dia anterior em São Paulo', () => {
    jasmine.clock().mockDate(new Date('2026-11-07T01:00:00Z'));
    criar();

    expect(dataInput().value).toBe('2026-11-06');
    expect(dataInput().max).toBe('2026-11-06');
  });

  it('data padrão é hoje e não aceita futuras', () => {
    criar();

    expect(dataInput().value).toBe('2026-11-06');
    expect(dataInput().max).toBe('2026-11-06');
    expect(el().textContent).not.toContain('Data anterior a hoje');
  });

  it('data passada avisa que entra só no histórico', () => {
    criar();

    digitarData('2026-10-01');

    expect(el().textContent).toContain('Data anterior a hoje: entra só no histórico, a faixa atual não muda.');
  });

  it('data futura ou vazia bloqueia salvar', () => {
    criar();

    digitarData('2026-11-07');
    salvar();
    digitarData('');
    salvar();

    expect(service.registrar).not.toHaveBeenCalled();
  });

  it('duplo clique em salvar registra uma vez só e mostra carregando', () => {
    const resposta = new Subject<RegistroGraduacao>();
    service.registrar.and.returnValue(resposta);
    criar();

    salvar();
    salvar();

    expect(service.registrar).toHaveBeenCalledOnceWith(7, { idGraduacao: 10, grau: 0, data: '2026-11-06' });
    const botao = el().querySelector('ajj-botao ion-button')!;
    expect(botao.hasAttribute('disabled') || (botao as HTMLButtonElement).disabled).toBeTrue();
    expect(el().querySelector('ajj-botao')!.querySelector('ion-spinner')).not.toBeNull();
  });

  it('sucesso emite registrado, avisa e recarrega o histórico', () => {
    const salvo = registro('2026-11-06');
    service.registrar.and.returnValue(of(salvo));
    criar();
    const emitidos: RegistroGraduacao[] = [];
    fixture.componentInstance.registrado.subscribe((r) => emitidos.push(r));
    service.historicoDe.calls.reset();
    service.historicoDe.and.returnValue(of([salvo]));

    salvar();

    expect(emitidos).toEqual([salvo]);
    expect(notificador.sucesso).toHaveBeenCalled();
    expect(service.historicoDe).toHaveBeenCalledOnceWith(7);
    expect(el().querySelectorAll('.historico li').length).toBe(1);
  });

  it('404 mostra o erro da API, mantém o formulário e libera salvar', () => {
    const erro = new HttpErrorResponse({ status: 404 });
    service.registrar.and.returnValue(throwError(() => erro));
    criar();
    escolher(faixaSelect(), '2');

    salvar();

    expect(notificador.erroDaApi).toHaveBeenCalledWith(erro, jasmine.any(String));
    expect(faixaSelect().value).toBe('2');
    const botao = el().querySelector('ajj-botao ion-button') as HTMLButtonElement;
    expect(botao.hasAttribute('disabled') || botao.disabled).toBeFalse();
  });

  it('falha no histórico mostra erro e Tentar de novo recarrega', () => {
    service.historicoDe.and.returnValue(throwError(() => new Error('falha')));
    criar();

    expect(el().textContent).toContain('Não foi possível carregar o histórico.');
    expect(el().textContent).not.toContain('Nenhuma graduação registrada.');

    service.historicoDe.and.returnValue(of([registro('2026-05-10')]));
    const tentar = Array.from(el().querySelectorAll('ajj-botao')).find((b) => b.textContent?.trim() === 'Tentar de novo')!;
    tentar.querySelector('ion-button')!.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(el().querySelectorAll('.historico li').length).toBe(1);
    expect(el().textContent).not.toContain('Não foi possível carregar o histórico.');
  });

  it('falha nas faixas desabilita Salvar, mostra erro e Tentar de novo recarrega', () => {
    service.faixas.and.returnValue(throwError(() => new Error('falha')));
    criar();

    expect(el().textContent).toContain('Não foi possível carregar as faixas.');
    const salvarBotao = el().querySelector('form ajj-botao ion-button') as HTMLButtonElement;
    expect(salvarBotao.hasAttribute('disabled') || salvarBotao.disabled).toBeTrue();
    salvar();
    expect(service.registrar).not.toHaveBeenCalled();

    service.faixas.and.returnValue(of(FAIXAS));
    const tentar = Array.from(el().querySelectorAll('ajj-botao')).find((b) => b.textContent?.trim() === 'Tentar de novo')!;
    tentar.querySelector('ion-button')!.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(el().textContent).not.toContain('Não foi possível carregar as faixas.');
    expect(faixaSelect().options.length).toBe(FAIXAS.length);
  });

  it('mostra o histórico do aluno abaixo do formulário', () => {
    service.historicoDe.and.returnValue(of([registro('2026-05-10'), { ...registro('2025-01-02'), faixa: FAIXAS[0], grau: 0 }]));
    criar();

    const itens = Array.from(el().querySelectorAll('.historico li')).map((li) => li.textContent);
    expect(itens.length).toBe(2);
    expect(itens[0]).toContain('Azul · 2 graus');
    expect(itens[0]).toContain('05/2026');
    expect(service.historicoDe).toHaveBeenCalledWith(7);
  });

  it('sem registros mostra o aviso', () => {
    criar();

    expect(el().textContent).toContain('Nenhuma graduação registrada');
  });
});
