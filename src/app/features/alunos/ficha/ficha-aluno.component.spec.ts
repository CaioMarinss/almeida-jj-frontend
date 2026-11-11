import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ContadoresDonoService } from '../../../core/dono/contadores-dono.service';
import { AlunoPainel } from '../../../shared/alunos/alunos.model';
import { AlunosService } from '../../../shared/alunos/alunos.service';
import { Exame, Faixa } from '../../../shared/graduacao/graduacao.model';
import { GraduacaoService } from '../../../shared/graduacao/graduacao.service';
import { MinhasPresencas } from '../../../shared/presenca/presenca.model';
import { criarNotificador } from '../../auth/testes-auth';
import { provedoresApp } from '../../testes-app';
import { FichaAlunoComponent } from './ficha-aluno.component';

const api = environment.apiUrl;

const AZUL: Faixa = {
  id: 1,
  codigo: 'AZ',
  descricao: 'Azul',
  categoria: 'ADULTO',
  corPrincipal: '#00f',
  corSecundaria: null,
  grauMin: 0,
  grauMax: 4
};
const ROXA: Faixa = { ...AZUL, id: 2, codigo: 'RX', descricao: 'Roxa' };

function aluno(id: number, nome: string, extra: Partial<AlunoPainel> = {}): AlunoPainel {
  return {
    id,
    nome,
    email: `${nome.toLowerCase()}@x.com`,
    perfil: 'ALUNO',
    atual: { faixa: AZUL, grau: 1 },
    ultimaPresenca: '2026-11-11',
    diasSemTreinar: 0,
    sumido: false,
    ...extra
  };
}

const exame = (id: number, data: string, aprovado: boolean, nota: number, observacao: string | null): Exame => ({
  id,
  evento: { id: 90 + id, data },
  aprovado,
  nota,
  observacao
});

const presencas: MinhasPresencas = {
  ciclo: { trilha: 'GRAU', desde: '2026-08-01', ate: '2026-12-01', minimo: 30, contadas: 12 },
  presencas: []
};

describe('FichaAlunoComponent', () => {
  let fixture: ComponentFixture<FichaAlunoComponent>;
  let http: HttpTestingController;
  let notificador: ReturnType<typeof criarNotificador>;
  let contadores: jasmine.SpyObj<ContadoresDonoService>;

  const el = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => el().textContent ?? '';

  async function estabilizar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function configurar(id: string): void {
    TestBed.configureTestingModule({
      imports: [FichaAlunoComponent],
      providers: [
        ...provedoresApp(notificador),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
        { provide: ContadoresDonoService, useValue: contadores }
      ]
    });
    http = TestBed.inject(HttpTestingController);
  }

  async function abrir(
    lista: AlunoPainel[],
    exames: Exame[] = [],
    ciclo: MinhasPresencas = presencas
  ): Promise<void> {
    fixture = TestBed.createComponent(FichaAlunoComponent);
    fixture.detectChanges();
    http.expectOne(`${api}/alunos/painel`).flush(lista);
    await estabilizar();
    http.expectOne(`${api}/alunos/2/exames`).flush(exames);
    http.expectOne(`${api}/graduacoes/alunos/2/presencas`).flush(ciclo);
    await estabilizar();
  }

  const numeros = (): string[] =>
    Array.from(el().querySelectorAll('.numero')).map((n) => `${n.children[0].textContent} ${n.children[1].textContent}`);

  const botaoSegmento = (rotulo: string): void => {
    const valor = { Presenças: 'presencas', Graduações: 'graduacoes', Exames: 'exames' }[rotulo];
    fixture.componentInstance.aoMudarSegmento(valor);
  };

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-11-11T15:00:00Z'));
    notificador = criarNotificador();
    contadores = jasmine.createSpyObj<ContadoresDonoService>('ContadoresDonoService', ['atualizar']);
    contadores.atualizar.and.resolveTo();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    http.verify();
  });

  it('mostraTresNumeros: presenças no ciclo, último treino e último exame', async () => {
    configurar('2');
    await abrir([aluno(2, 'Bia')], [exame(1, '2026-10-20', true, 8.5, null), exame(2, '2026-04-02', false, 4, null)]);

    const lidos = numeros();
    expect(lidos).toEqual(['Presenças no ciclo 12/30', 'Último treino hoje', 'Último exame 8,5']);
    expect(texto()).toContain('Bia');
    expect(texto()).toContain('Azul · 1 grau');
  });

  it('último treino: ontem, DD/MM e traço', async () => {
    configurar('2');
    await abrir([aluno(2, 'Bia', { diasSemTreinar: 1, ultimaPresenca: '2026-11-10' })]);
    expect(el().querySelectorAll('.numero')[1].textContent).toContain('ontem');
  });

  it('último treino com data antiga mostra DD/MM e sem presença mostra traço', async () => {
    configurar('2');
    await abrir([aluno(2, 'Bia', { diasSemTreinar: 12, ultimaPresenca: '2026-10-30' })]);
    expect(el().querySelectorAll('.numero')[1].textContent).toContain('30/10');
  });

  it('sem exame nem presença mostra traços', async () => {
    configurar('2');
    await abrir([aluno(2, 'Bia', { diasSemTreinar: null, ultimaPresenca: null })], [], { ciclo: null, presencas: [] });

    const lidos = numeros();
    expect(lidos).toEqual(['Presenças no ciclo 0', 'Último treino —', 'Último exame —']);
  });

  it('abasTrocamConteudo: Presenças, Graduações e Exames', async () => {
    configurar('2');
    await abrir([aluno(2, 'Bia')]);

    const rotulos = Array.from(el().querySelectorAll('ion-segment-button')).map((b) => b.textContent?.trim());
    expect(rotulos).toEqual(['Presenças', 'Graduações', 'Exames']);
    expect(el().querySelector('app-presencas-aluno')).not.toBeNull();
    expect(el().querySelector('app-registro-graduacao')).toBeNull();

    botaoSegmento('Graduações');
    await estabilizar();
    http.expectOne(`${api}/graduacoes/faixas`).flush([AZUL, ROXA]);
    http.expectOne(`${api}/alunos/2/graduacoes`).flush([]);
    await estabilizar();
    expect(el().querySelector('app-registro-graduacao')).not.toBeNull();
    expect(el().querySelector('app-presencas-aluno')).toBeNull();

    botaoSegmento('Exames');
    await estabilizar();
    expect(el().querySelector('app-exames-aluno')).not.toBeNull();
    expect(el().querySelector('app-registro-graduacao')).toBeNull();
  });

  it('examesListaHistorico: data do evento, resultado, nota e observação', async () => {
    configurar('2');
    await abrir([aluno(2, 'Bia')], [exame(1, '2026-10-20', true, 8.5, 'Boa guarda'), exame(2, '2026-04-02', false, 4, null)]);

    botaoSegmento('Exames');
    await estabilizar();

    const itens = Array.from(el().querySelectorAll('app-exames-aluno li')).map((l) =>
      l.textContent?.replace(/\s+/g, ' ').trim()
    );
    expect(itens).toEqual(['20/10/2026 Aprovado · nota 8,5 Boa guarda', '02/04/2026 Reprovado · nota 4,0']);
  });

  it('examesListaHistorico: vazio mostra Nenhum exame registrado.', async () => {
    configurar('2');
    await abrir([aluno(2, 'Bia')]);

    botaoSegmento('Exames');
    await estabilizar();

    expect(el().querySelector('app-exames-aluno')?.textContent).toContain('Nenhum exame registrado.');
  });

  it('alterarCargoConfirmaEAtualiza: promove, atualiza o cache e os contadores', async () => {
    configurar('2');
    await abrir([aluno(2, 'Bia')]);

    expect(el().querySelector('.cargo')?.textContent).toContain('Aluno');
    el().querySelector<HTMLElement>('.cargo-acao ion-button')!.click();
    await estabilizar();

    expect(notificador.confirmar).toHaveBeenCalledWith('Tornar professor', 'Tornar Bia professor?', 'Tornar professor');
    const put = http.expectOne(`${api}/alunos/2/perfil`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ perfil: 'PROFESSOR' });
    put.flush(null);
    await estabilizar();
    http.expectOne(`${api}/alunos/painel`).flush([aluno(2, 'Bia', { perfil: 'PROFESSOR' })]);
    await estabilizar();
    await estabilizar();

    expect(contadores.atualizar).toHaveBeenCalled();
    expect(notificador.sucesso).toHaveBeenCalledWith('Bia agora é professor.');
    expect(el().querySelector('.cargo')?.textContent).toContain('Professor');
    expect(el().querySelector('.cargo-acao')?.textContent).toContain('Voltar a aluno');
  });

  it('alterarCargoConfirmaEAtualiza: sem confirmação não chama a API', async () => {
    configurar('2');
    notificador.confirmar.and.resolveTo(false);
    await abrir([aluno(2, 'Bia', { perfil: 'PROFESSOR' })]);

    expect(el().querySelector('.cargo-acao')?.textContent).toContain('Voltar a aluno');
    el().querySelector<HTMLElement>('.cargo-acao ion-button')!.click();
    await estabilizar();

    expect(notificador.confirmar).toHaveBeenCalledWith(
      'Remover professor',
      'Remover o cargo de professor de Bia?',
      'Remover'
    );
    http.expectNone(`${api}/alunos/2/perfil`);
  });

  it('o dono não tem botão de cargo', async () => {
    configurar('2');
    await abrir([aluno(2, 'Dora', { perfil: 'DONO' })]);

    expect(el().querySelector('.cargo')?.textContent).toContain('Dono');
    expect(el().querySelector('.cargo-acao')).toBeNull();
  });

  it('idInexistenteMostraVazio com link para voltar', async () => {
    configurar('99');
    fixture = TestBed.createComponent(FichaAlunoComponent);
    fixture.detectChanges();
    http.expectOne(`${api}/alunos/painel`).flush([aluno(2, 'Bia')]);
    await estabilizar();

    expect(texto()).toContain('Aluno não encontrado');
    expect(el().querySelector('a[href="/app/alunos"]')).not.toBeNull();
    expect(el().querySelector('ion-segment')).toBeNull();
  });

  it('usa o painel em cache sem nova requisição', async () => {
    configurar('2');
    TestBed.inject(AlunosService).painel().subscribe();
    http.expectOne(`${api}/alunos/painel`).flush([aluno(2, 'Bia')]);

    fixture = TestBed.createComponent(FichaAlunoComponent);
    await estabilizar();
    expect(texto()).toContain('Bia');
    http.expectOne(`${api}/alunos/2/exames`).flush([]);
    http.expectOne(`${api}/graduacoes/alunos/2/presencas`).flush(presencas);
    http.expectOne(`${api}/alunos/painel`).flush([aluno(2, 'Bia', { diasSemTreinar: 1, ultimaPresenca: '2026-11-10' })]);
    await estabilizar();

    expect(el().querySelectorAll('.numero')[1].textContent).toContain('ontem');
  });

  it('erro ao carregar exames não mostra dados falsos e permite tentar de novo', async () => {
    configurar('2');
    fixture = TestBed.createComponent(FichaAlunoComponent);
    fixture.detectChanges();
    http.expectOne(`${api}/alunos/painel`).flush([aluno(2, 'Bia')]);
    await estabilizar();
    http.expectOne(`${api}/alunos/2/exames`).flush(null, { status: 500, statusText: 'Erro' });
    http.expectOne(`${api}/graduacoes/alunos/2/presencas`).flush(presencas);
    await estabilizar();

    expect(numeros()[2]).toBe('Último exame —');
    botaoSegmento('Exames');
    await estabilizar();
    expect(texto()).toContain('Não foi possível carregar os exames');
    expect(texto()).not.toContain('Nenhum exame registrado.');

    el().querySelector<HTMLElement>('.erro ion-button')!.click();
    http.expectOne(`${api}/alunos/2/exames`).flush([exame(1, '2026-10-20', true, 7, null)]);
    await estabilizar();

    expect(numeros()[2]).toBe('Último exame 7,0');
    expect(texto()).toContain('Aprovado · nota 7,0');
  });

  it('atualiza a faixa do cabeçalho quando uma graduação é registrada', async () => {
    configurar('2');
    await abrir([aluno(2, 'Bia')]);

    TestBed.inject(GraduacaoService).registrar(2, { idGraduacao: 2, grau: 0 }).subscribe();
    http.expectOne(`${api}/alunos/2/graduacoes`).flush({
      id: 5,
      faixa: ROXA,
      grau: 0,
      data: '2026-11-11',
      atual: { faixa: ROXA, grau: 0 }
    });
    await estabilizar();

    expect(el().querySelector('.cabeca')?.textContent).toContain('Roxa · sem graus');
  });
});
