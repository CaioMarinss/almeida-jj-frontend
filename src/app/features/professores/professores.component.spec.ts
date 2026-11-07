import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { criarNotificador } from '../auth/testes-auth';
import { provedoresApp } from '../testes-app';
import { ProfessoresComponent } from './professores.component';
import { PessoaAcademia, ProfessoresService } from './professores.service';

describe('ProfessoresComponent', () => {
  const bia: PessoaAcademia = { id: 2, nome: 'Bia Souza', email: 'bia@x.com', perfil: 'ALUNO' };
  const caio: PessoaAcademia = { id: 3, nome: 'Caio Lima', email: 'caio@x.com', perfil: 'PROFESSOR' };
  const dora: PessoaAcademia = { id: 1, nome: 'Dora Reis', email: 'dora@x.com', perfil: 'DONO' };

  let notificador: ReturnType<typeof criarNotificador>;
  let service: jasmine.SpyObj<ProfessoresService>;
  let fixture: ComponentFixture<ProfessoresComponent>;

  async function criar(): Promise<void> {
    fixture = TestBed.createComponent(ProfessoresComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const linha = (email: string): HTMLElement | null =>
    fixture.nativeElement.querySelector(`li.pessoa[data-email="${email}"]`);

  beforeEach(() => {
    notificador = criarNotificador();
    notificador.confirmar.and.resolveTo(true);
    service = jasmine.createSpyObj<ProfessoresService>('ProfessoresService', ['listar', 'alterarPerfil']);
    service.listar.and.returnValue(of([dora, bia, caio]));
    service.alterarPerfil.and.returnValue(of(undefined));
    TestBed.configureTestingModule({
      imports: [ProfessoresComponent],
      providers: [...provedoresApp(notificador), { provide: ProfessoresService, useValue: service }]
    });
  });

  const nomes = (): string[] =>
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('li.pessoa strong')).map(e => e.textContent?.trim() ?? '');

  const pessoas9 = (): PessoaAcademia[] =>
    ['Iara', 'Hugo', 'Gabi', 'Fabio', 'Elisa', 'Davi', 'Cris', 'Beto', 'Ana'].map((nome, i) => ({
      id: 10 + i,
      nome,
      email: `${nome.toLowerCase()}@x.com`,
      perfil: 'ALUNO'
    }));

  const texto = (): string => fixture.nativeElement.textContent ?? '';

  const chip = (rotulo: string): HTMLButtonElement =>
    Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button.filtro')).find(
      b => b.textContent?.trim() === rotulo
    ) as HTMLButtonElement;

  async function digitar(valor: string): Promise<void> {
    const campo: HTMLInputElement = fixture.nativeElement.querySelector('#busca-pessoa');
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function tocarChip(rotulo: string): Promise<void> {
    chip(rotulo).click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('mostra uma linha por pessoa com nome, e-mail e cargo', async () => {
    await criar();

    expect(fixture.nativeElement.querySelectorAll('li.pessoa').length).toBe(3);
    expect(linha('bia@x.com')?.textContent).toContain('Bia Souza');
    expect(linha('bia@x.com')?.textContent).toContain('bia@x.com');
    expect(linha('bia@x.com')?.querySelector('.ajj-chip')?.textContent).toContain('Aluno');
    expect(linha('caio@x.com')?.querySelector('.ajj-chip')?.textContent).toContain('Professor');
    expect(linha('dora@x.com')?.querySelector('.ajj-chip')?.textContent).toContain('Dono');
    expect(linha('bia@x.com')?.querySelector('ajj-botao')).toBeNull();
  });

  it('ordena e mostra 7 por página com "Página 1 de 2"', async () => {
    service.listar.and.returnValue(of(pessoas9()));
    await criar();

    expect(nomes()).toEqual(['Ana', 'Beto', 'Cris', 'Davi', 'Elisa', 'Fabio', 'Gabi']);
    expect(texto()).toContain('Página 1 de 2');
  });

  it('busca "JOAO" mostra só João e volta para a página 1', async () => {
    const joao: PessoaAcademia = { id: 99, nome: 'João Alves', email: 'joao@x.com', perfil: 'ALUNO' };
    service.listar.and.returnValue(of([...pessoas9(), joao]));
    await criar();
    fixture.componentInstance.pagina.set(2);
    fixture.detectChanges();

    await digitar('JOAO');

    expect(nomes()).toEqual(['João Alves']);
    expect(fixture.componentInstance.pagina()).toBe(1);
  });

  it('chip Professores mostra só professores e esconde o dono', async () => {
    await criar();

    await tocarChip('Professores');

    expect(chip('Professores').getAttribute('aria-pressed')).toBe('true');
    expect(chip('Todos').getAttribute('aria-pressed')).toBe('false');
    expect(nomes()).toEqual(['Caio Lima']);
  });

  it('chip Alunos esconde o dono', async () => {
    await criar();

    await tocarChip('Alunos');

    expect(nomes()).toEqual(['Bia Souza']);
  });

  it('contador mostra "N pessoas" do filtro', async () => {
    await criar();
    expect(texto()).toContain('3 pessoas');

    await tocarChip('Alunos');
    expect(texto()).toContain('1 pessoa');
    expect(texto()).not.toContain('1 pessoas');
  });

  it('tocar na linha abre o painel com "Tornar professor"', async () => {
    await criar();

    linha('bia@x.com')?.querySelector<HTMLButtonElement>('button.linha')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const painel = (): HTMLElement | null => document.querySelector('ion-modal');
    for (let i = 0; i < 50 && !painel()?.textContent?.includes('Cancelar'); i++) {
      await new Promise(r => setTimeout(r, 20));
    }

    expect(fixture.componentInstance.selecionada()?.id).toBe(2);
    expect(painel()?.textContent).toContain('Bia Souza');
    expect(painel()?.textContent).toContain('Tornar professor');
    expect(painel()?.textContent).toContain('Cancelar');
  });

  it('tocar no dono não abre ação', async () => {
    await criar();

    linha('dora@x.com')?.querySelector<HTMLButtonElement>('button.linha')?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selecionada()).toBeNull();
  });

  it('depois de promover com filtro Alunos a linha continua visível com chip Professor até mudar a busca', async () => {
    await criar();
    await tocarChip('Alunos');

    await fixture.componentInstance.alternar(bia);
    fixture.detectChanges();

    expect(linha('bia@x.com')?.querySelector('.ajj-chip')?.textContent).toContain('Professor');

    await digitar('b');

    expect(linha('bia@x.com')).toBeNull();
  });

  it('promover a única linha da última página mantém paginador e contador até a próxima interação', async () => {
    service.listar.and.returnValue(of(pessoas9().slice(0, 8)));
    await criar();
    await tocarChip('Alunos');
    fixture.componentInstance.irParaPagina(2);
    fixture.detectChanges();
    expect(nomes()).toEqual(['Iara']);
    const iara = pessoas9()[0];

    await fixture.componentInstance.alternar(iara);
    fixture.detectChanges();

    expect(nomes()).toEqual(['Iara']);
    expect(texto()).toContain('Página 2 de 2');
    expect(texto()).toContain('8 pessoas');

    await tocarChip('Alunos');

    expect(texto()).toContain('7 pessoas');
    expect(texto()).not.toContain('Página');
    expect(nomes().length).toBe(7);
  });

  it('confirma, promove e atualiza a linha', async () => {
    await criar();

    await fixture.componentInstance.alternar(bia);
    fixture.detectChanges();

    expect(notificador.confirmar).toHaveBeenCalledWith('Tornar professor', 'Tornar Bia Souza professor?', 'Tornar professor');
    expect(service.alterarPerfil).toHaveBeenCalledWith(2, 'PROFESSOR');
    expect(notificador.sucesso).toHaveBeenCalledWith('Bia Souza agora é professor.');
    expect(linha('bia@x.com')?.querySelector('.ajj-chip')?.textContent).toContain('Professor');
  });

  it('confirma, rebaixa e atualiza a linha', async () => {
    await criar();

    await fixture.componentInstance.alternar(caio);
    fixture.detectChanges();

    expect(notificador.confirmar).toHaveBeenCalledWith(
      'Remover professor',
      'Remover o cargo de professor de Caio Lima?',
      'Remover'
    );
    expect(service.alterarPerfil).toHaveBeenCalledWith(3, 'ALUNO');
    expect(notificador.sucesso).toHaveBeenCalledWith('Caio Lima voltou a ser aluno.');
    expect(linha('caio@x.com')?.querySelector('.ajj-chip')?.textContent).toContain('Aluno');
  });

  it('cancelar a confirmação não altera nada', async () => {
    notificador.confirmar.and.resolveTo(false);
    await criar();

    await fixture.componentInstance.alternar(bia);

    expect(service.alterarPerfil).not.toHaveBeenCalled();
  });

  it('erro ao alterar mostra o erro da API e mantém o cargo', async () => {
    const erro = new Error('falhou');
    service.alterarPerfil.and.returnValue(throwError(() => erro));
    await criar();

    await fixture.componentInstance.alternar(bia);
    fixture.detectChanges();

    expect(notificador.erroDaApi).toHaveBeenCalledWith(erro, 'Não foi possível alterar o cargo.');
    expect(linha('bia@x.com')?.querySelector('.ajj-chip')?.textContent).toContain('Aluno');
  });

  it('dois cliques seguidos fazem uma única chamada', async () => {
    const resposta = new Subject<void>();
    service.alterarPerfil.and.returnValue(resposta);
    await criar();

    const primeira = fixture.componentInstance.alternar(bia);
    const segunda = fixture.componentInstance.alternar(bia);
    await fixture.whenStable();

    expect(service.alterarPerfil).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.alterando()).toBe(2);

    resposta.next();
    resposta.complete();
    await Promise.all([primeira, segunda]);
    expect(fixture.componentInstance.alterando()).toBeNull();
  });

  it('erro ao carregar avisa, mostra o estado de erro e permite tentar de novo', async () => {
    const erro = new Error('falhou');
    service.listar.and.returnValue(throwError(() => erro));
    await criar();

    expect(notificador.erroDaApi).toHaveBeenCalledWith(erro, 'Não foi possível carregar os alunos.');
    const estado: string = fixture.nativeElement.querySelector('ajj-estado-vazio.erro-carga')?.textContent ?? '';
    expect(estado).toContain('Não foi possível carregar os alunos');
    expect(estado).toContain('Tentar de novo');
    expect(estado).not.toContain('Nenhum aluno ativo');

    service.listar.and.returnValue(of([dora, bia]));
    await fixture.componentInstance.carregar();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.erro-carga')).toBeNull();
    expect(linha('bia@x.com')).not.toBeNull();
  });

  it('para de carregar antes de o alerta de erro ser fechado', async () => {
    service.listar.and.returnValue(throwError(() => new Error('falhou')));
    notificador.erroDaApi.and.returnValue(new Promise<void>(() => undefined));
    await criar();

    expect(fixture.componentInstance.carregando()).toBeFalse();
  });

  it('só com o dono na lista mostra o estado vazio abaixo dele', async () => {
    service.listar.and.returnValue(of([dora]));
    await criar();

    expect(linha('dora@x.com')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('ajj-estado-vazio')?.textContent).toContain('Nenhum aluno ativo');
  });

  it('lista vazia mostra o estado vazio com a explicação', async () => {
    service.listar.and.returnValue(of([]));
    await criar();

    const vazio: string = fixture.nativeElement.querySelector('ajj-estado-vazio')?.textContent ?? '';
    expect(vazio).toContain('Nenhum aluno ativo');
    expect(vazio).toContain('Quando alguém criar a conta e verificar o e-mail, aparece aqui.');
  });
});
