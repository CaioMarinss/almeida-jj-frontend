import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AlunoGraduacao, Categoria, Faixa } from '../../shared/graduacao/graduacao.model';
import { GraduacaoService } from '../../shared/graduacao/graduacao.service';
import { criarNotificador } from '../auth/testes-auth';
import { provedoresApp } from '../testes-app';
import { GraduacaoComponent } from './graduacao.component';

function faixa(id: number, categoria: Categoria, descricao: string): Faixa {
  return { id, codigo: `F${id}`, descricao, categoria, corPrincipal: '#fff', corSecundaria: null, grauMin: 0, grauMax: 4 };
}

const FAIXAS: Faixa[] = [
  ...Array.from({ length: 12 }, (_, i) => faixa(i + 1, 'INFANTIL', `Infantil ${i + 1}`)),
  ...Array.from({ length: 5 }, (_, i) => faixa(i + 13, 'ADULTO', `Adulto ${i + 1}`)),
  ...Array.from({ length: 3 }, (_, i) => faixa(i + 18, 'MESTRE', `Mestre ${i + 1}`))
];

function aluno(id: number, nome: string, atual: AlunoGraduacao['atual'] = null): AlunoGraduacao {
  return { id, nome, email: `a${id}@x.com`, perfil: id === 1 ? 'PROFESSOR' : 'ALUNO', atual };
}

const NOMES = ['Iara', 'Hugo', 'Gabi', 'Fabio', 'Elisa', 'Davi', 'Cris', 'Beto', 'Ana'];

function nove(): AlunoGraduacao[] {
  return NOMES.map((nome, i) => aluno(10 + i, nome));
}

describe('GraduacaoComponent', () => {
  let service: jasmine.SpyObj<GraduacaoService>;
  let notificador: ReturnType<typeof criarNotificador>;
  let fixture: ComponentFixture<GraduacaoComponent>;

  const cmp = (): GraduacaoComponent => fixture.componentInstance;
  const el = (): HTMLElement => fixture.nativeElement;
  const linhas = (): NodeListOf<HTMLElement> => el().querySelectorAll('li.aluno');
  const nomes = (): string[] => Array.from(linhas()).map(l => l.querySelector('strong')?.textContent?.trim() ?? '');
  const texto = (): string => el().textContent ?? '';

  function digitar(valor: string): void {
    const campo = el().querySelector<HTMLInputElement>('input[type="search"]')!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function filtrar(valor: string): void {
    const select = el().querySelector<HTMLSelectElement>('select')!;
    select.value = valor;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function pagina(rotulo: 'Anterior' | 'Próxima'): void {
    const botao = Array.from(el().querySelectorAll('ajj-paginacao ajj-botao')).find(b => b.textContent?.trim() === rotulo)!;
    botao.querySelector('ion-button')!.click();
    fixture.detectChanges();
  }

  function criar(): void {
    fixture = TestBed.createComponent(GraduacaoComponent);
    fixture.detectChanges();
    fixture.detectChanges();
  }

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-11-07T15:00:00Z'));
    notificador = criarNotificador();
    service = jasmine.createSpyObj<GraduacaoService>('GraduacaoService', ['alunos', 'faixas', 'proxima', 'historicoDe']);
    service.historicoDe.and.returnValue(of([]));
    service.proxima.and.returnValue(of(null));
    service.faixas.and.returnValue(of(FAIXAS));
    service.alunos.and.returnValue(of([aluno(2, 'Bia'), aluno(1, 'Ana')]));
    TestBed.configureTestingModule({
      imports: [GraduacaoComponent],
      providers: [...provedoresApp(notificador), { provide: GraduacaoService, useValue: service }]
    });
  });

  afterEach(() => jasmine.clock().uninstall());

  it('carrega a lista uma vez e pagina em 7 sem nova requisição', () => {
    service.alunos.and.returnValue(of(nove()));
    criar();

    expect(nomes()).toEqual(['Ana', 'Beto', 'Cris', 'Davi', 'Elisa', 'Fabio', 'Gabi']);
    expect(texto()).toContain('Página 1 de 2');
    expect(texto()).toContain('9 alunos');

    pagina('Próxima');

    expect(nomes()).toEqual(['Hugo', 'Iara']);
    expect(texto()).toContain('Página 2 de 2');
    pagina('Anterior');
    expect(nomes().length).toBe(7);
    expect(service.alunos).toHaveBeenCalledTimes(1);
  });

  it('pede os alunos ao servidor uma única vez, sem parâmetros', () => {
    criar();
    digitar('an');
    filtrar('sem');

    expect(service.alunos).toHaveBeenCalledTimes(1);
    expect(service.alunos.calls.mostRecent().args).toEqual([]);
  });

  it('ordena por nome', () => {
    criar();

    expect(nomes()).toEqual(['Ana', 'Bia']);
  });

  it('contador usa o singular', () => {
    service.alunos.and.returnValue(of([aluno(1, 'Ana')]));
    criar();

    expect(texto()).toContain('1 aluno');
    expect(texto()).not.toContain('1 alunos');
  });

  it('busca por trecho sem acento nem maiúscula, e volta à página 1', () => {
    service.alunos.and.returnValue(of([...nove(), aluno(30, 'Conceição')]));
    criar();
    pagina('Próxima');

    digitar('CONCEICAO');

    expect(nomes()).toEqual(['Conceição']);
    expect(texto()).toContain('1 aluno');
    digitar('');
    expect(texto()).toContain('Página 1 de 2');
  });

  it('filtro de faixa e Sem graduação funcionam na memória', () => {
    service.alunos.and.returnValue(
      of([aluno(1, 'Ana', { faixa: FAIXAS[12], grau: 2 }), aluno(2, 'Bia'), aluno(3, 'Caio', { faixa: FAIXAS[13], grau: 0 })])
    );
    criar();

    filtrar('sem');
    expect(nomes()).toEqual(['Bia']);
    filtrar('13');
    expect(nomes()).toEqual(['Ana']);
    filtrar('14');
    expect(nomes()).toEqual(['Caio']);
    filtrar('todas');
    expect(nomes()).toEqual(['Ana', 'Bia', 'Caio']);
    expect(service.alunos).toHaveBeenCalledTimes(1);
  });

  it('mudar o filtro volta para a página 1', () => {
    service.alunos.and.returnValue(of(nove()));
    criar();
    pagina('Próxima');

    filtrar('sem');

    expect(texto()).toContain('Página 1 de 2');
    expect(nomes().length).toBe(7);
  });

  it('linhas mostram barra e texto da faixa, ou Sem graduação, sem chip de cargo', () => {
    service.alunos.and.returnValue(of([aluno(1, 'Ana', { faixa: FAIXAS[12], grau: 2 }), aluno(2, 'Bia')]));
    criar();

    const [ana, bia] = Array.from(linhas());
    expect(ana.getAttribute('data-email')).toBe('a1@x.com');
    expect(ana.querySelector('ajj-barra-faixa')).not.toBeNull();
    expect(ana.textContent).toContain('Adulto 1 · 2 graus');
    expect(bia.querySelector('ajj-barra-faixa')).toBeNull();
    expect(bia.textContent).toContain('Sem graduação');
    expect(el().querySelector('li.aluno .ajj-chip')).toBeNull();
  });

  it('não existe mais Carregar mais', () => {
    service.alunos.and.returnValue(of(nove()));
    criar();

    expect(texto()).not.toContain('Carregar mais');
    expect(el().querySelector('.mais')).toBeNull();
  });

  it('filtro tem Todas, Sem graduação e as 20 faixas agrupadas', () => {
    criar();

    const select = el().querySelector('select')!;
    expect(el().querySelector(`label[for="${select.id}"]`)).not.toBeNull();
    const opcoes = Array.from(select.querySelectorAll('option')).map(o => o.textContent?.trim());
    expect(opcoes.slice(0, 2)).toEqual(['Todas', 'Sem graduação']);
    expect(Array.from(select.querySelectorAll('optgroup')).map(g => g.label)).toEqual(['Infantil', 'Adulto', 'Mestres']);
    expect(select.querySelectorAll('optgroup option').length).toBe(20);
  });

  it('mostra erro com Tentar de novo e recarrega', () => {
    service.alunos.and.returnValues(throwError(() => new Error('x')), of([aluno(2, 'Bia')]));
    criar();

    expect(cmp().erroCarga()).toBeTrue();
    expect(notificador.erroDaApi).toHaveBeenCalled();
    const tentar = Array.from(el().querySelectorAll('ajj-botao')).find(b => b.textContent?.includes('Tentar de novo'))!;
    tentar.querySelector('ion-button')!.click();
    fixture.detectChanges();

    expect(cmp().erroCarga()).toBeFalse();
    expect(linhas().length).toBe(1);
  });

  it('mostra estado vazio sem resultados', () => {
    service.alunos.and.returnValue(of([]));
    criar();

    expect(linhas().length).toBe(0);
    expect(texto()).toContain('Nenhum aluno encontrado');
  });

  it('abrir seleciona o aluno e a linha abre ao clicar', () => {
    criar();

    linhas()[1].querySelector('button')!.click();

    expect(cmp().selecionado()?.id).toBe(2);
  });

  it('registro com data de hoje atualiza a linha; data passada não', () => {
    criar();
    const bia = cmp().alunos()[0];

    cmp().aoRegistrar(bia, { id: 1, faixa: FAIXAS[13], grau: 1, data: '2026-10-01' });
    fixture.detectChanges();
    expect(linhas()[1].textContent).toContain('Sem graduação');

    cmp().aoRegistrar(bia, { id: 2, faixa: FAIXAS[13], grau: 1, data: '2026-11-07' });
    fixture.detectChanges();
    expect(linhas()[1].textContent).toContain('Adulto 2 · 1 grau');
  });

  it('registro de hoje atualiza também o aluno selecionado do modal', () => {
    criar();
    const bia = cmp().alunos()[0];
    cmp().abrir(bia);

    cmp().aoRegistrar(bia, { id: 2, faixa: FAIXAS[13], grau: 1, data: '2026-11-07' });

    expect(cmp().selecionado()?.atual).toEqual({ faixa: FAIXAS[13], grau: 1 });
  });

  it('o modal abre com o aluno selecionado e fecha ao ser dispensado', () => {
    criar();
    const modal = el().querySelector<HTMLElement & { isOpen: boolean }>('ion-modal')!;
    expect(modal.isOpen).toBeFalse();

    cmp().abrir(cmp().alunos()[0]);
    fixture.detectChanges();
    expect(modal.isOpen).toBeTrue();

    modal.dispatchEvent(new CustomEvent('didDismiss'));
    fixture.detectChanges();

    expect(cmp().selecionado()).toBeNull();
    expect(modal.isOpen).toBeFalse();
  });

  it('fechar limpa o aluno selecionado', () => {
    criar();
    cmp().abrir(cmp().alunos()[0]);

    cmp().fechar();

    expect(cmp().selecionado()).toBeNull();
  });

  it('atualizarLinha troca a graduação só daquela linha e a remove com null', () => {
    criar();

    cmp().atualizarLinha(2, { faixa: FAIXAS[13], grau: 1 });
    fixture.detectChanges();
    expect(linhas()[1].textContent).toContain('Adulto 2 · 1 grau');
    expect(linhas()[0].textContent).toContain('Sem graduação');

    cmp().atualizarLinha(2, null);
    fixture.detectChanges();
    expect(linhas()[1].textContent).toContain('Sem graduação');
  });

  it('após atualizar uma linha, ela continua visível e a página e o contador não mudam', () => {
    service.alunos.and.returnValue(of(nove()));
    criar();
    filtrar('sem');

    cmp().atualizarLinha(18, { faixa: FAIXAS[13], grau: 1 });
    fixture.detectChanges();

    expect(nomes()).toContain('Ana');
    expect(nomes().length).toBe(7);
    expect(texto()).toContain('9 alunos');
    expect(texto()).toContain('Página 1 de 2');

    digitar('');
    expect(nomes().length).toBe(7);
    expect(texto()).toContain('8 alunos');
    expect(texto()).toContain('Página 1 de 2');
  });
});
