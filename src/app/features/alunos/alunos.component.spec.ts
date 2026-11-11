import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { AlunoPainel } from '../../shared/alunos/alunos.model';
import { AlunosService } from '../../shared/alunos/alunos.service';
import { Faixa } from '../../shared/graduacao/graduacao.model';
import { criarNotificador } from '../auth/testes-auth';
import { provedoresApp } from '../testes-app';
import { AlunosComponent } from './alunos.component';

const faixa = (id: number, categoria: Faixa['categoria'], descricao: string): Faixa => ({
  id,
  codigo: `F${id}`,
  descricao,
  categoria,
  corPrincipal: '#fff',
  corSecundaria: null,
  grauMin: 0,
  grauMax: 4
});

const AZUL = faixa(1, 'ADULTO', 'Azul');
const ROXA = faixa(2, 'ADULTO', 'Roxa');

function aluno(id: number, nome: string, extra: Partial<AlunoPainel> = {}): AlunoPainel {
  return {
    id,
    nome,
    email: `${nome.split(' ')[0].toLowerCase()}@x.com`,
    perfil: 'ALUNO',
    atual: null,
    ultimaPresenca: null,
    diasSemTreinar: null,
    sumido: false,
    ...extra
  };
}

describe('AlunosComponent', () => {
  let fixture: ComponentFixture<AlunosComponent>;
  let service: AlunosService;
  let http: HttpTestingController;
  const urlFaixas = `${environment.apiUrl}/graduacoes/faixas`;
  const urlPainel = `${environment.apiUrl}/alunos/painel`;

  const el = (): HTMLElement => fixture.nativeElement;
  const nomes = (): string[] =>
    Array.from(el().querySelectorAll('li.aluno strong')).map((e) => e.textContent?.trim() ?? '');
  const linha = (email: string): HTMLElement | null => el().querySelector(`li.aluno[data-email="${email}"]`);
  const chip = (inicio: string): HTMLButtonElement =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('button.filtro')).find((b) =>
      b.textContent?.trim().startsWith(inicio)
    )!;

  async function estabilizar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function criar(lista: AlunoPainel[]): Promise<void> {
    fixture = TestBed.createComponent(AlunosComponent);
    fixture.detectChanges();
    http.expectOne(urlFaixas).flush([AZUL, ROXA]);
    http.expectOne(urlPainel).flush(lista);
    await estabilizar();
  }

  async function digitar(valor: string): Promise<void> {
    const campo = el().querySelector<HTMLInputElement>('#busca-aluno')!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    await estabilizar();
  }

  async function filtrarFaixa(valor: string): Promise<void> {
    const select = el().querySelector<HTMLSelectElement>('#filtro-faixa')!;
    select.value = valor;
    select.dispatchEvent(new Event('change'));
    await estabilizar();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AlunosComponent],
      providers: [
        ...provedoresApp(criarNotificador()),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AlunosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const lista = (): AlunoPainel[] => [
    aluno(1, 'Ana Souza', { atual: { faixa: AZUL, grau: 1 }, ultimaPresenca: '2026-11-11', diasSemTreinar: 0 }),
    aluno(2, 'Bia Lima', { diasSemTreinar: 1, ultimaPresenca: '2026-11-10' }),
    aluno(3, 'Caio Reis', { perfil: 'PROFESSOR', atual: { faixa: ROXA, grau: 0 }, diasSemTreinar: 3 }),
    aluno(4, 'Davi Dias', { sumido: true, diasSemTreinar: 20, atual: { faixa: AZUL, grau: 0 } }),
    aluno(5, 'Érica Nunes', { email: 'erica@x.com', diasSemTreinar: 5 }),
    aluno(6, 'Dora Mestre', { perfil: 'DONO' })
  ];

  it('mostra o contador e a lista em ordem de nome', async () => {
    await criar(lista());

    expect(el().querySelector('.contador')?.textContent).toContain('6 alunos');
    expect(nomes()).toEqual(['Ana Souza', 'Bia Lima', 'Caio Reis', 'Davi Dias', 'Dora Mestre', 'Érica Nunes']);
  });

  it('textoDoUltimoTreino: hoje, ontem, há N dias, sumido e cargo', async () => {
    await criar(lista());

    const direita = (email: string): string => linha(email)!.querySelector('.situacao')?.textContent?.trim() ?? '';
    expect(direita('ana@x.com')).toBe('treinou hoje');
    expect(direita('bia@x.com')).toBe('treinou ontem');
    expect(direita('caio@x.com')).toBe('Professor');
    expect(direita('davi@x.com')).toBe('sumido · 20 dias');
    expect(direita('erica@x.com')).toBe('há 5 dias');
    expect(direita('dora@x.com')).toBe('Dono');
  });

  it('sem presença não mostra texto à direita', async () => {
    await criar([aluno(1, 'Ana Souza')]);

    expect(linha('ana@x.com')!.querySelector('.situacao')).toBeNull();
  });

  it('cada linha leva à ficha do aluno', async () => {
    await criar(lista());

    expect(linha('bia@x.com')!.querySelector('a')!.getAttribute('href')).toBe('/app/alunos/2');
  });

  it('filtraSumidos mostra só os sumidos e o chip traz a contagem', async () => {
    await criar(lista());

    expect(chip('Sumidos').textContent?.trim()).toBe('Sumidos · 1');
    chip('Sumidos').click();
    await estabilizar();

    expect(nomes()).toEqual(['Davi Dias']);
    expect(chip('Sumidos').getAttribute('aria-pressed')).toBe('true');
  });

  it('filtraProfessores mostra só o cargo de professor', async () => {
    await criar(lista());

    chip('Professores').click();
    await estabilizar();

    expect(nomes()).toEqual(['Caio Reis']);
  });

  it('filtraFaixa por faixa e por sem graduação', async () => {
    await criar(lista());

    await filtrarFaixa('1');
    expect(nomes()).toEqual(['Ana Souza', 'Davi Dias']);

    await filtrarFaixa('sem');
    expect(nomes()).toEqual(['Bia Lima', 'Dora Mestre', 'Érica Nunes']);

    await filtrarFaixa('todas');
    expect(nomes().length).toBe(6);
  });

  it('o select de faixa tem os grupos Infantil, Adulto e Mestres', async () => {
    await criar(lista());

    const grupos = Array.from(el().querySelectorAll('#filtro-faixa optgroup')).map((g) => g.getAttribute('label'));
    expect(grupos).toEqual(['Infantil', 'Adulto', 'Mestres']);
  });

  it('buscaSemAcento encontra Érica digitando erica', async () => {
    await criar(lista());

    await digitar('erica');

    expect(nomes()).toEqual(['Érica Nunes']);
    expect(el().querySelector('.contador')?.textContent).toContain('1 aluno');
  });

  it('os filtros se combinam com a busca', async () => {
    await criar(lista());

    await filtrarFaixa('1');
    await digitar('davi');

    expect(nomes()).toEqual(['Davi Dias']);
  });

  it('paginaDeSete mostra 7 por página e avança', async () => {
    const muitos = Array.from({ length: 9 }, (_, i) => aluno(10 + i, `Aluno ${String.fromCharCode(65 + i)}`));
    await criar(muitos);

    expect(nomes().length).toBe(7);
    el().querySelectorAll<HTMLElement>('ajj-paginacao ion-button')[1].click();
    await estabilizar();

    expect(nomes()).toEqual(['Aluno H', 'Aluno I']);
  });

  it('mostra estado vazio sem resultado', async () => {
    await criar(lista());

    await digitar('zzz');

    expect(el().textContent).toContain('Nenhum aluno encontrado');
  });

  it('erro na carga mostra tentar de novo', async () => {
    fixture = TestBed.createComponent(AlunosComponent);
    fixture.detectChanges();
    http.expectOne(urlFaixas).flush([AZUL, ROXA]);
    http.expectOne(urlPainel).flush(null, { status: 500, statusText: 'Erro' });
    await estabilizar();

    expect(el().textContent).toContain('Não foi possível carregar os alunos');
    el().querySelector<HTMLElement>('ajj-estado-vazio ion-button')!.click();
    http.expectOne(urlPainel).flush(lista());
    await estabilizar();

    expect(nomes().length).toBe(6);
  });

  it('atualiza a linha quando a graduação do aluno muda no cache', async () => {
    await criar(lista());

    service.alterarEmCache(2, { atual: { faixa: ROXA, grau: 2 } });
    await estabilizar();

    expect(linha('bia@x.com')!.textContent).toContain('Roxa');
  });
});
