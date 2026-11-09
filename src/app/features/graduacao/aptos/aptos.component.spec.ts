import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { Apto, Faixa, ListaAptos } from '../../../shared/graduacao/graduacao.model';
import { GraduacaoService, RegistroCriado } from '../../../shared/graduacao/graduacao.service';
import { criarNotificador } from '../../auth/testes-auth';
import { provedoresApp } from '../../testes-app';
import { AptosComponent } from './aptos.component';

function faixa(id: number, descricao: string, grauMax = 4): Faixa {
  return { id, codigo: `F${id}`, descricao, categoria: 'ADULTO', corPrincipal: '#fff', corSecundaria: null, grauMin: 0, grauMax };
}

const BRANCA = faixa(1, 'Branca');
const AZUL = faixa(2, 'Azul');
const ROXA = faixa(3, 'Roxa');
const FAIXAS = [BRANCA, AZUL, ROXA];

function apto(id: number, nome: string, extra: Partial<Apto> = {}): Apto {
  return {
    id,
    nome,
    atual: { faixa: BRANCA, grau: 2 },
    contadas: 34,
    minimo: 30,
    apto: true,
    sugestao: { faixa: BRANCA, grau: 3 },
    ...extra
  };
}

function lista(extra: Partial<ListaAptos> = {}): ListaAptos {
  return {
    evento: { data: '2026-12-14', minimoGrau: 30, minimoFaixa: 60 },
    grau: [
      apto(3, 'Zeca', { contadas: 20, apto: false }),
      apto(2, 'Bia'),
      apto(4, 'Caio', { contadas: 5, minimo: null, apto: false })
    ],
    faixa: [apto(5, 'Duda', { atual: { faixa: AZUL, grau: 4 }, contadas: 61, minimo: 60, sugestao: { faixa: ROXA, grau: 0 } })],
    ...extra
  };
}

describe('AptosComponent', () => {
  let service: jasmine.SpyObj<GraduacaoService>;
  let notificador: ReturnType<typeof criarNotificador>;
  let fixture: ComponentFixture<AptosComponent>;

  const el = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => el().textContent ?? '';
  const secao = (titulo: string): HTMLElement =>
    Array.from(el().querySelectorAll<HTMLElement>('section.trilha')).find((s) => s.querySelector('h3')?.textContent?.trim() === titulo)!;
  const linhas = (titulo: string): HTMLElement[] => Array.from(secao(titulo).querySelectorAll<HTMLElement>('li'));
  const nomes = (titulo: string): string[] => linhas(titulo).map((l) => l.querySelector('strong')?.textContent?.trim() ?? '');
  const botaoEm = (raiz: ParentNode, rotulo: string): HTMLElement | undefined =>
    Array.from(raiz.querySelectorAll<HTMLElement>('ajj-botao')).find((b) => b.textContent?.trim() === rotulo);
  const clicarEm = (raiz: ParentNode, rotulo: string): void => {
    botaoEm(raiz, rotulo)!.querySelector('ion-button')!.click();
    fixture.detectChanges();
  };
  const select = (id: string): HTMLSelectElement => el().querySelector<HTMLSelectElement>(`#${id}`)!;

  function escolherOpcao(id: string, valor: string): void {
    select(id).value = valor;
    select(id).dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function enviar(): void {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function criar(): void {
    fixture = TestBed.createComponent(AptosComponent);
    fixture.detectChanges();
  }

  function criado(): RegistroCriado {
    return { id: 1, faixa: AZUL, grau: 0, data: '2026-12-14', atual: { faixa: AZUL, grau: 0 } };
  }

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-12-14T15:00:00Z'));
    notificador = criarNotificador();
    service = jasmine.createSpyObj<GraduacaoService>('GraduacaoService', ['aptos', 'faixas', 'graduou']);
    service.aptos.and.returnValue(of(lista()));
    service.faixas.and.returnValue(of(FAIXAS));
    TestBed.configureTestingModule({
      imports: [AptosComponent],
      providers: [...provedoresApp(notificador), { provide: GraduacaoService, useValue: service }]
    });
  });

  afterEach(() => jasmine.clock().uninstall());

  it('mostra as seções Troca de grau e Troca de faixa e a data do evento', () => {
    criar();

    expect(secao('Troca de grau')).toBeDefined();
    expect(secao('Troca de faixa')).toBeDefined();
    expect(texto()).toContain('14/12');
  });

  it('aptos vêm primeiro, com contagem 34/30 e Graduou; depois os não aptos com faltam N', () => {
    criar();

    expect(nomes('Troca de grau')).toEqual(['Bia', 'Caio', 'Zeca']);
    const [bia, , zeca] = linhas('Troca de grau');
    expect(bia.textContent).toContain('34/30');
    expect(botaoEm(bia, 'Graduou')).toBeDefined();
    expect(zeca.textContent).toContain('faltam 10');
    expect(botaoEm(zeca, 'Graduou')).toBeUndefined();
  });

  it('mínimo nulo mostra "mínimo não definido" e não é apto', () => {
    criar();

    const caio = linhas('Troca de grau')[1];
    expect(caio.textContent).toContain('mínimo não definido');
    expect(caio.textContent).not.toContain('faltam');
    expect(botaoEm(caio, 'Graduou')).toBeUndefined();
  });

  it('seção sem ninguém mostra aviso', () => {
    service.aptos.and.returnValue(of(lista({ faixa: [] })));
    criar();

    expect(secao('Troca de faixa').textContent).toContain('Ninguém nesta troca');
  });

  it('Graduou fica desabilitado antes da data do evento, com dica', () => {
    jasmine.clock().mockDate(new Date('2026-12-13T15:00:00Z'));
    criar();

    const bia = linhas('Troca de grau')[0];
    const ion = botaoEm(bia, 'Graduou')!.querySelector<HTMLElement & { disabled: boolean }>('ion-button')!;
    expect(ion.disabled).toBeTrue();
    expect(bia.textContent).toContain('Disponível em 14/12');
  });

  it('Graduou fica habilitado na data do evento e sem dica', () => {
    criar();

    const bia = linhas('Troca de grau')[0];
    const ion = botaoEm(bia, 'Graduou')!.querySelector<HTMLElement & { disabled: boolean }>('ion-button')!;
    expect(ion.disabled).toBeFalse();
    expect(bia.textContent).not.toContain('Disponível em');
  });

  it('Graduou abre a confirmação preenchida com a sugestão, editável', () => {
    criar();
    clicarEm(linhas('Troca de faixa')[0], 'Graduou');

    expect(texto()).toContain('Duda');
    expect(select('graduou-faixa').value).toBe('3');
    expect(select('graduou-grau').value).toBe('0');
    expect(el().querySelector('label[for="graduou-faixa"]')?.textContent).toContain('Faixa');
    expect(el().querySelector('label[for="graduou-grau"]')?.textContent).toContain('Grau');
  });

  it('confirmar sem editar a sugestão chama graduou sem escolha, avisa e recarrega', () => {
    service.graduou.and.returnValue(of(criado()));
    criar();
    clicarEm(linhas('Troca de grau')[0], 'Graduou');
    service.aptos.and.returnValue(of(lista({ grau: [apto(3, 'Zeca', { contadas: 20, apto: false })] })));

    enviar();

    expect(service.graduou).toHaveBeenCalledOnceWith(2, undefined);
    expect(notificador.sucesso).toHaveBeenCalled();
    expect(service.aptos).toHaveBeenCalledTimes(2);
    expect(nomes('Troca de grau')).toEqual(['Zeca']);
    expect(el().querySelector('#graduou-faixa')).toBeNull();
  });

  it('editar faixa e grau envia a escolha', () => {
    service.graduou.and.returnValue(of(criado()));
    criar();
    clicarEm(linhas('Troca de faixa')[0], 'Graduou');
    escolherOpcao('graduou-faixa', '2');
    escolherOpcao('graduou-grau', '1');

    enviar();

    expect(service.graduou).toHaveBeenCalledOnceWith(5, { idGraduacao: 2, grau: 1 });
  });

  it('sem sugestão o dono precisa escolher a faixa antes de confirmar', () => {
    service.aptos.and.returnValue(
      of(lista({ faixa: [apto(5, 'Duda', { atual: { faixa: ROXA, grau: 4 }, sugestao: null })] }))
    );
    service.graduou.and.returnValue(of(criado()));
    criar();
    clicarEm(linhas('Troca de faixa')[0], 'Graduou');

    expect(select('graduou-faixa').value).toBe('');
    const ion = botaoEm(el(), 'Confirmar')!.querySelector<HTMLElement & { disabled: boolean }>('ion-button')!;
    expect(ion.disabled).toBeTrue();

    escolherOpcao('graduou-faixa', '2');
    enviar();

    expect(service.graduou).toHaveBeenCalledOnceWith(5, { idGraduacao: 2, grau: 0 });
  });

  it('Voltar fecha a confirmação sem chamar a API', () => {
    criar();
    clicarEm(linhas('Troca de grau')[0], 'Graduou');
    clicarEm(el(), 'Voltar');

    expect(el().querySelector('#graduou-faixa')).toBeNull();
    expect(service.graduou).not.toHaveBeenCalled();
  });

  it('bloqueia o duplo envio enquanto a requisição está em andamento', () => {
    const resposta = new Subject<RegistroCriado>();
    service.graduou.and.returnValue(resposta);
    criar();
    clicarEm(linhas('Troca de grau')[0], 'Graduou');

    enviar();
    enviar();

    expect(service.graduou).toHaveBeenCalledTimes(1);
  });

  it('erro ao graduar usa erroDaApi e mantém a confirmação aberta', () => {
    const erro = new HttpErrorResponse({ status: 422, error: { codigo: 'ERR034' } });
    service.graduou.and.returnValue(throwError(() => erro));
    criar();
    clicarEm(linhas('Troca de grau')[0], 'Graduou');

    enviar();

    expect(notificador.erroDaApi).toHaveBeenCalledWith(erro, jasmine.any(String));
    expect(select('graduou-faixa')).not.toBeNull();
    expect(service.aptos).toHaveBeenCalledTimes(1);
  });

  it('ERR032 recarrega a lista', () => {
    const erro = new HttpErrorResponse({ status: 422, error: { codigo: 'ERR032' } });
    service.graduou.and.returnValue(throwError(() => erro));
    criar();
    clicarEm(linhas('Troca de grau')[0], 'Graduou');

    enviar();

    expect(service.aptos).toHaveBeenCalledTimes(2);
    expect(el().querySelector('#graduou-faixa')).toBeNull();
  });

  it('recarregar as faixas depois não sobrescreve a faixa já escolhida', () => {
    service.faixas.and.returnValue(throwError(() => new Error('x')));
    service.aptos.and.returnValue(
      of(lista({ faixa: [apto(5, 'Duda', { atual: { faixa: ROXA, grau: 4 }, sugestao: null })] }))
    );
    criar();
    service.faixas.and.returnValue(of(FAIXAS));
    clicarEm(linhas('Troca de faixa')[0], 'Graduou');
    clicarEm(el(), 'Tentar de novo');
    escolherOpcao('graduou-faixa', '2');
    fixture.componentInstance.carregarFaixas();
    fixture.detectChanges();

    expect(select('graduou-faixa').value).toBe('2');
  });

  it('sem evento corrente (ERR033) mostra estado vazio, sem toast de erro', () => {
    service.aptos.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { codigo: 'ERR033' } })));
    criar();

    expect(texto()).toContain('Nenhuma graduação agendada');
    expect(notificador.erroDaApi).not.toHaveBeenCalled();
    expect(el().querySelector('section.trilha')).toBeNull();
  });

  it('outro erro de carga mostra Tentar de novo e avisa via erroDaApi', () => {
    const erro = new HttpErrorResponse({ status: 500 });
    service.aptos.and.returnValue(throwError(() => erro));
    criar();

    expect(notificador.erroDaApi).toHaveBeenCalledWith(erro, jasmine.any(String));
    service.aptos.and.returnValue(of(lista()));
    clicarEm(el(), 'Tentar de novo');

    expect(nomes('Troca de grau').length).toBe(3);
  });

  it('desenha a faixa de quem já tem graduação e avisa quem não tem', () => {
    service.aptos.and.returnValue(of(lista({ grau: [apto(2, 'Bia', { atual: null })] })));
    criar();

    expect(linhas('Troca de faixa')[0].querySelector('ajj-barra-faixa')).not.toBeNull();
    expect(linhas('Troca de grau')[0].textContent).toContain('Sem graduação');
  });
});
