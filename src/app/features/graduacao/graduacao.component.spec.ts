import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { AlunoGraduacao, Categoria, Faixa, PaginaAlunos } from '../../shared/graduacao/graduacao.model';
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

function pagina(itens: AlunoGraduacao[], numero: number, total: number): PaginaAlunos {
  return { itens, pagina: numero, tamanho: 20, total };
}

describe('GraduacaoComponent', () => {
  let service: jasmine.SpyObj<GraduacaoService>;
  let notificador: ReturnType<typeof criarNotificador>;
  let fixture: ComponentFixture<GraduacaoComponent>;

  const cmp = (): GraduacaoComponent => fixture.componentInstance;
  const el = (): HTMLElement => fixture.nativeElement;
  const linhas = (): NodeListOf<HTMLElement> => el().querySelectorAll('li.aluno');
  const ultimaChamada = (): Parameters<GraduacaoService['buscarAlunos']>[0] =>
    service.buscarAlunos.calls.mostRecent().args[0];

  function digitar(valor: string): void {
    const campo = el().querySelector<HTMLInputElement>('input[type="search"]')!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  }

  function filtrar(valor: string): void {
    const select = el().querySelector<HTMLSelectElement>('select')!;
    select.value = valor;
    select.dispatchEvent(new Event('change'));
  }

  function criar(): void {
    fixture = TestBed.createComponent(GraduacaoComponent);
    fixture.detectChanges();
    fixture.detectChanges();
  }

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate();
    notificador = criarNotificador();
    service = jasmine.createSpyObj<GraduacaoService>('GraduacaoService', ['buscarAlunos', 'faixas', 'proxima']);
    service.proxima.and.returnValue(of(null));
    service.faixas.and.returnValue(of(FAIXAS));
    service.buscarAlunos.and.returnValue(of(pagina([aluno(1, 'Ana'), aluno(2, 'Bia')], 0, 2)));
    TestBed.configureTestingModule({
      imports: [GraduacaoComponent],
      providers: [...provedoresApp(notificador), { provide: GraduacaoService, useValue: service }]
    });
  });

  afterEach(() => jasmine.clock().uninstall());

  it('carrega a primeira página com 20 por página', () => {
    criar();

    expect(service.buscarAlunos).toHaveBeenCalledWith({ pagina: 0, tamanho: 20 });
    expect(linhas().length).toBe(2);
    expect(cmp().total()).toBe(2);
  });

  it('mostra cargo, barra e texto da faixa, ou Sem graduação', () => {
    service.buscarAlunos.and.returnValue(
      of(pagina([aluno(1, 'Ana', { faixa: FAIXAS[12], grau: 2 }), aluno(2, 'Bia')], 0, 2))
    );
    criar();

    const [ana, bia] = Array.from(linhas());
    expect(ana.getAttribute('data-email')).toBe('a1@x.com');
    expect(ana.textContent).toContain('Ana');
    expect(ana.querySelector('.ajj-chip')?.textContent).toContain('Professor');
    expect(ana.querySelector('ajj-barra-faixa')).not.toBeNull();
    expect(ana.textContent).toContain('Adulto 1 · 2 graus');
    expect(bia.querySelector('ajj-barra-faixa')).toBeNull();
    expect(bia.textContent).toContain('Sem graduação');
  });

  it('filtro tem Todas, Sem graduação e as 20 faixas agrupadas', () => {
    criar();

    const select = el().querySelector('select')!;
    expect(select.getAttribute('id')).toBeTruthy();
    expect(el().querySelector(`label[for="${select.id}"]`)).not.toBeNull();
    const opcoes = Array.from(select.querySelectorAll('option')).map(o => o.textContent?.trim());
    expect(opcoes.slice(0, 2)).toEqual(['Todas', 'Sem graduação']);
    expect(select.querySelectorAll('optgroup').length).toBe(3);
    expect(Array.from(select.querySelectorAll('optgroup')).map(g => g.label)).toEqual(['Infantil', 'Adulto', 'Mestres']);
    expect(select.querySelectorAll('optgroup option').length).toBe(20);
  });

  it('digitar só busca 300 ms depois de parar', () => {
    criar();
    service.buscarAlunos.calls.reset();

    digitar('jo');
    jasmine.clock().tick(200);
    digitar('joa');
    jasmine.clock().tick(299);
    expect(service.buscarAlunos).not.toHaveBeenCalled();
    jasmine.clock().tick(1);

    expect(service.buscarAlunos).toHaveBeenCalledTimes(1);
    expect(ultimaChamada()).toEqual({ nome: 'joa', pagina: 0, tamanho: 20 });
  });

  it('mudar o filtro volta para a página 0 e substitui a lista', () => {
    const cheia = Array.from({ length: 20 }, (_, i) => aluno(i + 10, `P${i}`));
    service.buscarAlunos.and.returnValue(of(pagina(cheia, 0, 40)));
    criar();
    el().querySelector<HTMLButtonElement>('.mais ion-button')!.click();
    expect(ultimaChamada().pagina).toBe(1);

    service.buscarAlunos.and.returnValue(of(pagina([aluno(2, 'Bia')], 0, 1)));
    filtrar('sem');
    fixture.detectChanges();

    expect(ultimaChamada()).toEqual({ faixa: 'sem', pagina: 0, tamanho: 20 });
    expect(linhas().length).toBe(1);
    filtrar('13');
    expect(ultimaChamada()).toEqual({ faixa: 13, pagina: 0, tamanho: 20 });
    filtrar('todas');
    expect(ultimaChamada()).toEqual({ pagina: 0, tamanho: 20 });
  });

  it('Carregar mais acrescenta a página seguinte e some quando chega ao total', () => {
    const p0 = Array.from({ length: 20 }, (_, i) => aluno(i + 10, `P${i}`));
    const p1 = Array.from({ length: 5 }, (_, i) => aluno(i + 100, `Q${i}`));
    service.buscarAlunos.and.callFake(f => of(f.pagina === 0 ? pagina(p0, 0, 25) : pagina(p1, 1, 25)));
    criar();

    expect(linhas().length).toBe(20);
    const mais = el().querySelector<HTMLElement>('.mais')!;
    expect(mais.textContent).toContain('Carregar mais');
    mais.querySelector('ion-button')!.click();
    fixture.detectChanges();

    expect(ultimaChamada()).toEqual({ pagina: 1, tamanho: 20 });
    expect(linhas().length).toBe(25);
    expect(el().querySelector('.mais')).toBeNull();
  });

  it('descarta resposta antiga que chega depois da nova', () => {
    const antiga = new Subject<PaginaAlunos>();
    const nova = new Subject<PaginaAlunos>();
    service.buscarAlunos.and.returnValues(antiga, nova);
    criar();

    filtrar('sem');
    nova.next(pagina([aluno(2, 'Nova')], 0, 1));
    antiga.next(pagina([aluno(3, 'Antiga')], 0, 1));
    fixture.detectChanges();

    expect(Array.from(linhas()).map(l => l.getAttribute('data-email'))).toEqual(['a2@x.com']);
    expect(cmp().carregando()).toBeFalse();
  });

  it('mostra erro com Tentar de novo e recarrega', () => {
    service.buscarAlunos.and.returnValues(throwError(() => new Error('x')), of(pagina([aluno(2, 'Bia')], 0, 1)));
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
    service.buscarAlunos.and.returnValue(of(pagina([], 0, 0)));
    criar();

    expect(linhas().length).toBe(0);
    expect(el().textContent).toContain('Nenhum aluno encontrado');
  });

  it('abrir seleciona o aluno e a linha abre ao clicar', () => {
    criar();

    linhas()[1].querySelector('button')!.click();

    expect(cmp().selecionado()?.id).toBe(2);
  });

  it('registro com data de hoje atualiza a linha; data passada não', () => {
    jasmine.clock().mockDate(new Date(2026, 10, 6, 23, 30));
    criar();
    const bia = cmp().alunos()[1];

    cmp().aoRegistrar(bia, { id: 1, faixa: FAIXAS[13], grau: 1, data: '2026-10-01' });
    fixture.detectChanges();
    expect(linhas()[1].textContent).toContain('Sem graduação');

    cmp().aoRegistrar(bia, { id: 2, faixa: FAIXAS[13], grau: 1, data: '2026-11-06' });
    fixture.detectChanges();
    expect(linhas()[1].textContent).toContain('Adulto 2 · 1 grau');
  });

  it('fechar limpa o aluno selecionado', () => {
    criar();
    cmp().abrir(cmp().alunos()[0]);

    cmp().fechar();

    expect(cmp().selecionado()).toBeNull();
  });

  it('atualizarLinha troca a graduação só daquela linha', () => {
    criar();

    cmp().atualizarLinha(2, { faixa: FAIXAS[13], grau: 1 });
    fixture.detectChanges();

    expect(linhas()[1].textContent).toContain('Adulto 2 · 1 grau');
    expect(linhas()[0].textContent).toContain('Sem graduação');
  });

  it('não perde a lista ao falhar o Carregar mais', () => {
    const p0 = Array.from({ length: 20 }, (_, i) => aluno(i + 10, `P${i}`));
    const respostas: Observable<PaginaAlunos>[] = [of(pagina(p0, 0, 40)), throwError(() => new Error('x'))];
    service.buscarAlunos.and.returnValues(...respostas);
    criar();

    el().querySelector<HTMLElement>('.mais ion-button')!.click();
    fixture.detectChanges();

    expect(linhas().length).toBe(20);
    expect(cmp().erroCarga()).toBeFalse();
    expect(el().querySelector('.mais')).not.toBeNull();
  });
});
