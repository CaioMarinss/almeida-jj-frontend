import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ContadoresDonoService } from '../../../core/dono/contadores-dono.service';
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

const APROVADO = { aprovado: true, nota: 8, observacao: null };

function apto(id: number, nome: string, extra: Partial<Apto> = {}): Apto {
  return {
    id,
    nome,
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

function lista(extra: Partial<ListaAptos> = {}): ListaAptos {
  return {
    evento: { data: '2026-12-14', minimoGrau: 30, minimoFaixa: 60 },
    grau: [
      apto(3, 'Zeca', { contadas: 20, apto: false }),
      apto(2, 'Bia', { exame: APROVADO }),
      apto(10, 'Ana'),
      apto(4, 'Caio', { contadas: 5, minimo: null, apto: false })
    ],
    faixa: [apto(5, 'Duda', { atual: { faixa: AZUL, grau: 4 }, contadas: 61, minimo: 60, sugestao: { faixa: ROXA, grau: 0 }, exame: APROVADO })],
    ...extra
  };
}

describe('AptosComponent', () => {
  let service: jasmine.SpyObj<GraduacaoService>;
  let contadores: jasmine.SpyObj<ContadoresDonoService>;
  let notificador: ReturnType<typeof criarNotificador>;
  let fixture: ComponentFixture<AptosComponent>;

  const el = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => el().textContent ?? '';
  const linhas = (): HTMLElement[] => Array.from(el().querySelectorAll<HTMLElement>('li.linha'));
  const nomes = (): string[] => linhas().map((l) => l.querySelector('strong')?.textContent?.trim() ?? '');
  const linhaDe = (nome: string): HTMLElement => linhas().find((l) => l.querySelector('strong')?.textContent?.trim() === nome)!;
  const trilha = (valor: 'grau' | 'faixa'): void => {
    fixture.componentInstance.trocarTrilha(valor);
    fixture.detectChanges();
  };
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
    contadores = jasmine.createSpyObj<ContadoresDonoService>('ContadoresDonoService', ['atualizar']);
    contadores.atualizar.and.resolveTo();
    service.aptos.and.returnValue(of(lista()));
    service.faixas.and.returnValue(of(FAIXAS));
    TestBed.configureTestingModule({
      imports: [AptosComponent],
      providers: [...provedoresApp(notificador), { provide: GraduacaoService, useValue: service },
        { provide: ContadoresDonoService, useValue: contadores }
      ]
    });
  });

  afterEach(() => jasmine.clock().uninstall());

  it('resumoContaAptosExamesEGraduados', () => {
    service.aptos.and.returnValue(
      of(
        lista({
          grau: [
            apto(2, 'Bia'),
            apto(3, 'Zeca', { apto: false, contadas: 2 }),
            apto(6, 'Gabi', { exame: { aprovado: true, nota: 9, observacao: null } }),
            apto(8, 'Lia', { apto: false, graduado: true, exame: { aprovado: true, nota: 8, observacao: null } })
          ],
          faixa: [apto(5, 'Duda', { exame: { aprovado: false, nota: 4, observacao: null } })]
        })
      )
    );
    criar();

    expect(texto()).toContain('3 aptos · 3 exames feitos · 1 graduado');
  });

  it('segmentos mostram a contagem de cada trilha e a data do evento fica no painel', () => {
    criar();

    const rotulos = Array.from(el().querySelectorAll('ion-segment-button')).map((b) => b.textContent?.trim());
    expect(rotulos).toEqual(['Troca de grau · 4', 'Troca de faixa · 1']);
  });

  it('aptos vêm primeiro, com contagem 34/30 e Exame; depois "Ainda não aptos" com faltam N', () => {
    criar();

    expect(nomes()).toEqual(['Ana', 'Bia', 'Caio', 'Zeca']);
    expect(linhaDe('Ana').textContent).toContain('34/30 · apto');
    expect(botaoEm(linhaDe('Ana'), 'Exame')).toBeDefined();
    expect(botaoEm(linhaDe('Ana'), 'Graduou')).toBeUndefined();
    expect(el().querySelector('#grupo-ainda-nao')?.textContent).toContain('Ainda não aptos');
    expect(linhaDe('Zeca').textContent).toContain('faltam 10');
    expect(el().querySelector('#grupo-principal')).toBeNull();
    expect(el().querySelectorAll('section.grupo').length).toBe(2);
  });

  it('trocar o segmento mostra a outra trilha', () => {
    criar();
    trilha('faixa');

    expect(nomes()).toEqual(['Duda']);
  });

  it('mínimo nulo mostra "mínimo não definido"', () => {
    criar();

    expect(linhaDe('Caio').textContent).toContain('mínimo não definido');
    expect(linhaDe('Caio').textContent).not.toContain('faltam');
    expect(botaoEm(linhaDe('Caio'), 'Graduou')).toBeUndefined();
  });

  it('trilha sem ninguém mostra aviso', () => {
    service.aptos.and.returnValue(of(lista({ faixa: [] })));
    criar();
    trilha('faixa');

    expect(texto()).toContain('Ninguém nesta troca');
  });

  it('linhaGraduadoSemBotao', () => {
    service.aptos.and.returnValue(
      of(lista({ grau: [apto(8, 'Lia', { apto: false, graduado: true, exame: { aprovado: true, nota: 8, observacao: null } })] }))
    );
    criar();

    const lia = linhaDe('Lia');
    expect(lia.textContent).toContain('Graduado');
    expect(lia.querySelector('ajj-botao')).toBeNull();
    expect(el().querySelector('#grupo-ainda-nao')).toBeNull();
  });

  it('exame aprovado mostra "Aprovado · nota 9,5" e Graduou; reprovado mostra "Reprovado · nota 4,0" e Ver', () => {
    service.aptos.and.returnValue(
      of(
        lista({
          grau: [
            apto(2, 'Bia', { exame: { aprovado: true, nota: 9.5, observacao: null } }),
            apto(6, 'Gabi', { exame: { aprovado: false, nota: 4, observacao: null } })
          ]
        })
      )
    );
    criar();

    expect(linhaDe('Bia').textContent).toContain('Aprovado · nota 9,5');
    expect(botaoEm(linhaDe('Bia'), 'Graduou')).toBeDefined();
    expect(botaoEm(linhaDe('Bia'), 'Exame')).toBeUndefined();
    expect(linhaDe('Gabi').textContent).toContain('Reprovado · nota 4,0');
    expect(botaoEm(linhaDe('Gabi'), 'Ver')).toBeDefined();
    expect(botaoEm(linhaDe('Gabi'), 'Graduou')).toBeUndefined();
  });

  it('graduouSoComAprovado', () => {
    service.aptos.and.returnValue(
      of(
        lista({
          grau: [
            apto(2, 'Bia'),
            apto(6, 'Gabi', { exame: { aprovado: false, nota: 4, observacao: null } }),
            apto(9, 'Nino', { exame: { aprovado: true, nota: 7, observacao: null } })
          ]
        })
      )
    );
    criar();

    expect(botaoEm(linhaDe('Bia'), 'Graduou')).toBeUndefined();
    expect(botaoEm(linhaDe('Gabi'), 'Graduou')).toBeUndefined();
    expect(botaoEm(linhaDe('Nino'), 'Graduou')).toBeDefined();
  });

  it('exameDeAlunoNaoApto aparece em "Ainda não aptos" sem Graduou e com Ver', () => {
    service.aptos.and.returnValue(
      of(lista({ grau: [apto(3, 'Zeca', { apto: false, contadas: 20, exame: { aprovado: true, nota: 7, observacao: null } })] }))
    );
    criar();

    expect(el().querySelector('#grupo-ainda-nao')).not.toBeNull();
    expect(linhaDe('Zeca').textContent).toContain('Aprovado · nota 7,0');
    expect(botaoEm(linhaDe('Zeca'), 'Graduou')).toBeUndefined();
    expect(botaoEm(linhaDe('Zeca'), 'Ver')).toBeDefined();
  });

  it('Exame abre a folha com o aluno escolhido e Fechar a dispensa', () => {
    criar();
    botaoEm(linhaDe('Ana'), 'Exame')!.querySelector('ion-button')!.click();

    expect(fixture.componentInstance.exameDe()?.id).toBe(10);
    fixture.componentInstance.fecharExame();
    expect(fixture.componentInstance.exameDe()).toBeNull();
  });

  it('salvarAtualizaLinhaEContadores', () => {
    criar();
    fixture.componentInstance.abrirExame(fixture.componentInstance.dados()!.grau[1]);
    service.aptos.and.returnValue(
      of(lista({ grau: [apto(10, 'Ana', { exame: { aprovado: true, nota: 8.5, observacao: null } })] }))
    );

    fixture.componentInstance.aoSalvarExame({
      exame: { id: 1, evento: { id: 1, data: '2026-12-14' }, aprovado: true, nota: 8.5, observacao: null },
      graduacao: null
    });
    fixture.detectChanges();

    expect(service.aptos).toHaveBeenCalledTimes(2);
    expect(contadores.atualizar).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.exameDe()).toBeNull();
    expect(linhaDe('Ana').textContent).toContain('Aprovado · nota 8,5');
  });

  it('remover exame recarrega a lista e os contadores', () => {
    criar();
    fixture.componentInstance.abrirExame(fixture.componentInstance.dados()!.grau[1]);

    fixture.componentInstance.aoRemoverExame();

    expect(service.aptos).toHaveBeenCalledTimes(2);
    expect(contadores.atualizar).toHaveBeenCalledTimes(1);
    expect(notificador.sucesso).toHaveBeenCalled();
  });

  it('Graduou fica desabilitado antes da data do evento, com dica', () => {
    jasmine.clock().mockDate(new Date('2026-12-13T15:00:00Z'));
        criar();

    const bia = linhaDe('Bia');
    const ion = botaoEm(bia, 'Graduou')!.querySelector<HTMLElement & { disabled: boolean }>('ion-button')!;
    expect(ion.disabled).toBeTrue();
    expect(bia.textContent).toContain('Disponível em 14/12');
  });

  it('Graduou fica habilitado na data do evento e sem dica', () => {
        criar();

    const bia = linhaDe('Bia');
    const ion = botaoEm(bia, 'Graduou')!.querySelector<HTMLElement & { disabled: boolean }>('ion-button')!;
    expect(ion.disabled).toBeFalse();
    expect(bia.textContent).not.toContain('Disponível em');
  });

  it('graduar de linha com exame aprovado recarrega a lista e os contadores', () => {
    service.graduou.and.returnValue(of(criado()));
    criar();
    clicarEm(linhaDe('Bia'), 'Graduou');
    enviar();

    expect(contadores.atualizar).toHaveBeenCalledTimes(1);
  });

  it('Graduou abre a confirmação preenchida com a sugestão, editável', () => {
    criar();
    trilha('faixa');
    clicarEm(linhaDe('Duda'), 'Graduou');

    expect(texto()).toContain('Duda');
    expect(select('graduou-faixa').value).toBe('3');
    expect(select('graduou-grau').value).toBe('0');
    expect(el().querySelector('label[for="graduou-faixa"]')?.textContent).toContain('Faixa');
    expect(el().querySelector('label[for="graduou-grau"]')?.textContent).toContain('Grau');
  });

  it('confirmar sem editar a sugestão chama graduou sem escolha, avisa e recarrega', () => {
    service.graduou.and.returnValue(of(criado()));
    criar();
    clicarEm(linhaDe('Bia'), 'Graduou');
    service.aptos.and.returnValue(of(lista({ grau: [apto(3, 'Zeca', { contadas: 20, apto: false })] })));

    enviar();

    expect(service.graduou).toHaveBeenCalledOnceWith(2, undefined);
    expect(notificador.sucesso).toHaveBeenCalled();
    expect(service.aptos).toHaveBeenCalledTimes(2);
    expect(nomes()).toEqual(['Zeca']);
    expect(el().querySelector('#graduou-faixa')).toBeNull();
  });

  it('editar faixa e grau envia a escolha', () => {
    service.graduou.and.returnValue(of(criado()));
    criar();
    trilha('faixa');
    clicarEm(linhaDe('Duda'), 'Graduou');
    escolherOpcao('graduou-faixa', '2');
    escolherOpcao('graduou-grau', '1');

    enviar();

    expect(service.graduou).toHaveBeenCalledOnceWith(5, { idGraduacao: 2, grau: 1 });
  });

  it('sem sugestão o dono precisa escolher a faixa antes de confirmar', () => {
    service.aptos.and.returnValue(
      of(lista({ faixa: [apto(5, 'Duda', { atual: { faixa: ROXA, grau: 4 }, sugestao: null, exame: APROVADO })] }))
    );
    service.graduou.and.returnValue(of(criado()));
    criar();
    trilha('faixa');
    clicarEm(linhaDe('Duda'), 'Graduou');

    expect(select('graduou-faixa').value).toBe('');
    const ion = botaoEm(el(), 'Confirmar')!.querySelector<HTMLElement & { disabled: boolean }>('ion-button')!;
    expect(ion.disabled).toBeTrue();

    escolherOpcao('graduou-faixa', '2');
    enviar();

    expect(service.graduou).toHaveBeenCalledOnceWith(5, { idGraduacao: 2, grau: 0 });
  });

  it('Voltar fecha a confirmação sem chamar a API', () => {
    criar();
    clicarEm(linhaDe('Bia'), 'Graduou');
    clicarEm(el(), 'Voltar');

    expect(el().querySelector('#graduou-faixa')).toBeNull();
    expect(service.graduou).not.toHaveBeenCalled();
  });

  it('bloqueia o duplo envio enquanto a requisição está em andamento', () => {
    const resposta = new Subject<RegistroCriado>();
    service.graduou.and.returnValue(resposta);
    criar();
    clicarEm(linhaDe('Bia'), 'Graduou');

    enviar();
    enviar();

    expect(service.graduou).toHaveBeenCalledTimes(1);
  });

  it('erro ao graduar usa erroDaApi e mantém a confirmação aberta', () => {
    const erro = new HttpErrorResponse({ status: 422, error: { codigo: 'ERR034' } });
    service.graduou.and.returnValue(throwError(() => erro));
    criar();
    clicarEm(linhaDe('Bia'), 'Graduou');

    enviar();

    expect(notificador.erroDaApi).toHaveBeenCalledWith(erro, jasmine.any(String));
    expect(select('graduou-faixa')).not.toBeNull();
    expect(service.aptos).toHaveBeenCalledTimes(1);
  });

  it('ERR032 recarrega a lista', () => {
    const erro = new HttpErrorResponse({ status: 422, error: { codigo: 'ERR032' } });
    service.graduou.and.returnValue(throwError(() => erro));
    criar();
    clicarEm(linhaDe('Bia'), 'Graduou');

    enviar();

    expect(service.aptos).toHaveBeenCalledTimes(2);
    expect(el().querySelector('#graduou-faixa')).toBeNull();
  });

  it('recarregar as faixas depois não sobrescreve a faixa já escolhida', () => {
    service.faixas.and.returnValue(throwError(() => new Error('x')));
    service.aptos.and.returnValue(
      of(lista({ faixa: [apto(5, 'Duda', { atual: { faixa: ROXA, grau: 4 }, sugestao: null, exame: APROVADO })] }))
    );
    criar();
    service.faixas.and.returnValue(of(FAIXAS));
    trilha('faixa');
    clicarEm(linhaDe('Duda'), 'Graduou');
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
    expect(botaoEm(el(), 'Alterar')).toBeDefined();
    expect(notificador.erroDaApi).not.toHaveBeenCalled();
    expect(el().querySelector('section.grupo')).toBeNull();
  });

  it('outro erro de carga mostra Tentar de novo e avisa via erroDaApi', () => {
    const erro = new HttpErrorResponse({ status: 500 });
    service.aptos.and.returnValue(throwError(() => erro));
    criar();

    expect(notificador.erroDaApi).toHaveBeenCalledWith(erro, jasmine.any(String));
    service.aptos.and.returnValue(of(lista()));
    clicarEm(el(), 'Tentar de novo');

    expect(nomes().length).toBe(4);
  });

  it('desenha a faixa de quem já tem graduação e avisa quem não tem', () => {
    service.aptos.and.returnValue(of(lista({ grau: [apto(2, 'Bia', { atual: null })] })));
    criar();

    expect(linhaDe('Bia').querySelector('ajj-barra-faixa')).toBeNull();
    expect(linhaDe('Bia').textContent).toContain('Sem graduação');
    trilha('faixa');
    expect(linhaDe('Duda').querySelector('ajj-barra-faixa')).not.toBeNull();
  });
});
