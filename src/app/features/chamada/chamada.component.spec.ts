import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { SessionService } from '../../core/auth/session.service';
import { Perfil } from '../../core/auth/usuario';
import { AulaDoDia, DiaAgenda } from '../../shared/agenda/agenda.model';
import { AgendaService } from '../../shared/agenda/agenda.service';
import { Chamada, PresencaDaAula } from '../../shared/presenca/presenca.model';
import { PresencaService } from '../../shared/presenca/presenca.service';
import { criarNotificador } from '../auth/testes-auth';
import { PessoaAcademia, ProfessoresService } from '../professores/professores.service';
import { logar, provedoresApp } from '../testes-app';
import { ChamadaComponent } from './chamada.component';

function aula(extra: Partial<AulaDoDia> = {}): AulaDoDia {
  return { id: 7, inicio: '19:00', fim: '20:00', modalidade: 'GI', avulsa: false, motivo: null, cancelada: false, motivoCancelamento: null, vao: 2, euVou: false, janelaFechada: true, podeMarcar: false, ...extra };
}

function presente(extra: Partial<PresencaDaAula>): PresencaDaAula {
  return { idAluno: 2, nome: 'Bia Souza', origem: 'ALUNO', registradoPor: null, dthrRegistro: '2026-11-04T22:00:00Z', ...extra };
}

describe('ChamadaComponent', () => {
  const joao: PessoaAcademia = { id: 3, nome: 'João Alves', email: 'joao@x.com', perfil: 'ALUNO' };
  const bia: PessoaAcademia = { id: 2, nome: 'Bia Souza', email: 'bia@x.com', perfil: 'ALUNO' };
  const chamadaBase: Chamada = {
    presencas: [presente({}), presente({ idAluno: 4, nome: 'Caio Lima', origem: 'PROFESSOR', registradoPor: 'Prof Ana' })],
    podeAjustar: true,
    ajustaAte: '2026-11-08'
  };

  let agenda: jasmine.Spy<AgendaService['agenda']>;
  let presenca: jasmine.SpyObj<PresencaService>;
  let alunos: jasmine.SpyObj<ProfessoresService>;
  let notificador: ReturnType<typeof criarNotificador>;
  let fixture: ComponentFixture<ChamadaComponent>;

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2026-11-04T15:00:00Z'));
    sessionStorage.clear();
    notificador = criarNotificador();
    notificador.confirmar.and.resolveTo(true);
    agenda = jasmine.createSpy('agenda').and.callFake((inicio: string) =>
      of<DiaAgenda[]>([{ data: inicio, diaCancelado: null, aulas: [aula(), aula({ id: 8, inicio: '20:00', fim: '21:00', cancelada: true, vao: 0 })] }])
    );
    presenca = jasmine.createSpyObj<PresencaService>('PresencaService', ['chamada', 'incluir', 'tirar']);
    presenca.chamada.and.returnValue(of(chamadaBase));
    presenca.incluir.and.returnValue(of(undefined));
    presenca.tirar.and.returnValue(of(undefined));
    alunos = jasmine.createSpyObj<ProfessoresService>('ProfessoresService', ['listar']);
    alunos.listar.and.returnValue(of([bia, joao]));
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    sessionStorage.clear();
  });

  async function criar(perfil: Perfil = 'PROFESSOR'): Promise<void> {
    TestBed.configureTestingModule({
      imports: [ChamadaComponent],
      providers: [
        ...provedoresApp(notificador),
        { provide: AgendaService, useValue: { agenda } },
        { provide: PresencaService, useValue: presenca },
        { provide: ProfessoresService, useValue: alunos }
      ]
    });
    logar(TestBed.inject(SessionService), 'Prof Ana', perfil);
    fixture = TestBed.createComponent(ChamadaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const el = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => el().textContent ?? '';

  async function escolherAula(id: number): Promise<void> {
    el().querySelector<HTMLButtonElement>(`button.aula[data-id="${id}"]`)?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('mostra 14 dias, da semana anterior à atual, com hoje selecionado', async () => {
    await criar();

    const dias = Array.from(el().querySelectorAll<HTMLButtonElement>('button.dia'));
    expect(dias.length).toBe(14);
    expect(dias[0].getAttribute('aria-label')).toContain('26/10');
    expect(dias[13].getAttribute('aria-label')).toContain('08/11');
    const marcados = dias.filter(d => d.getAttribute('aria-pressed') === 'true');
    expect(marcados.length).toBe(1);
    expect(marcados[0].getAttribute('aria-label')).toContain('04/11');
    expect(agenda).toHaveBeenCalledWith('2026-11-04', '2026-11-04');
  });

  it('trocar o dia recarrega as aulas do dia', async () => {
    await criar();

    el().querySelectorAll<HTMLButtonElement>('button.dia')[0].click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(agenda).toHaveBeenCalledWith('2026-10-26', '2026-10-26');
  });

  it('lista as aulas do dia com a quantidade de presenças', async () => {
    await criar();

    const primeira = el().querySelector('button.aula[data-id="7"]');
    expect(primeira?.textContent).toContain('19:00');
    expect(primeira?.textContent).toContain('2 presenças');
    expect(el().querySelector('button.aula[data-id="8"]')?.textContent).toContain('Cancelada');
  });

  it('uma presença usa o singular', async () => {
    agenda.and.returnValue(of([{ data: '2026-11-04', diaCancelado: null, aulas: [aula({ vao: 1 })] }]));
    await criar();

    expect(el().querySelector('button.aula')?.textContent).toContain('1 presença');
    expect(el().querySelector('button.aula')?.textContent).not.toContain('1 presenças');
  });

  it('dia sem aula mostra aviso', async () => {
    agenda.and.returnValue(of([{ data: '2026-11-04', diaCancelado: null, aulas: [] }]));
    await criar();

    expect(texto()).toContain('Nenhuma aula neste dia');
  });

  it('escolher a aula carrega a chamada com nome, origem e quem registrou', async () => {
    await criar();

    await escolherAula(7);

    expect(presenca.chamada).toHaveBeenCalledWith('2026-11-04', 7);
    const linhas = Array.from(el().querySelectorAll('li.presente'));
    expect(linhas.length).toBe(2);
    expect(linhas[0].textContent).toContain('Bia Souza');
    expect(linhas[0].textContent).toContain('contada');
    expect(linhas[0].textContent).not.toContain('por ');
    expect(linhas[1].textContent).toContain('Caio Lima');
    expect(linhas[1].textContent).toContain('incluída pelo professor');
    expect(linhas[1].textContent).toContain('Prof Ana');
  });

  it('com podeAjustar mostra Tirar, + Incluir aluno e o prazo do professor', async () => {
    await criar();

    await escolherAula(7);

    expect(el().querySelectorAll('button.tirar').length).toBe(2);
    expect(el().querySelector('button.incluir')?.textContent).toContain('+ Incluir aluno');
    expect(texto()).toContain('Professor pode ajustar até 08/11');
  });

  it('para o dono o prazo fala em dono', async () => {
    await criar('DONO');

    await escolherAula(7);

    expect(texto()).toContain('Dono pode ajustar até 08/11');
  });

  it('sem limite não mostra prazo', async () => {
    presenca.chamada.and.returnValue(of({ ...chamadaBase, ajustaAte: null }));
    await criar('DONO');

    await escolherAula(7);

    expect(texto()).not.toContain('pode ajustar até');
  });

  it('fora do prazo é só leitura com aviso', async () => {
    presenca.chamada.and.returnValue(of({ ...chamadaBase, podeAjustar: false }));
    await criar();

    await escolherAula(7);

    expect(el().querySelectorAll('button.tirar').length).toBe(0);
    expect(el().querySelector('button.incluir')).toBeNull();
    expect(texto()).toContain('Fora do prazo: esta chamada só pode ser consultada.');
    expect(el().querySelectorAll('li.presente').length).toBe(2);
  });

  it('aula cancelada permite tirar mas não incluir', async () => {
    await criar();

    await escolherAula(8);

    expect(el().querySelectorAll('button.tirar').length).toBe(2);
    expect(el().querySelector('button.incluir')).toBeNull();
  });

  it('chamada vazia mostra aviso', async () => {
    presenca.chamada.and.returnValue(of({ ...chamadaBase, presencas: [] }));
    await criar();

    await escolherAula(7);

    expect(texto()).toContain('Ninguém registrado nesta aula');
  });

  it('tirar confirma, remove, avisa e recarrega a chamada e a contagem', async () => {
    await criar();
    await escolherAula(7);
    agenda.calls.reset();
    presenca.chamada.calls.reset();

    await fixture.componentInstance.tirar(chamadaBase.presencas[0]);

    expect(notificador.confirmar).toHaveBeenCalledWith('Tirar presença', 'Tirar Bia Souza desta aula?', 'Tirar');
    expect(presenca.tirar).toHaveBeenCalledWith('2026-11-04', 7, 2);
    expect(notificador.sucesso).toHaveBeenCalled();
    expect(presenca.chamada).toHaveBeenCalledWith('2026-11-04', 7);
    expect(agenda).toHaveBeenCalledWith('2026-11-04', '2026-11-04');
  });

  it('tirar cancelado na confirmação não chama a API', async () => {
    await criar();
    await escolherAula(7);
    notificador.confirmar.and.resolveTo(false);

    await fixture.componentInstance.tirar(chamadaBase.presencas[0]);

    expect(presenca.tirar).not.toHaveBeenCalled();
  });

  it('erro ao tirar mostra o erro da API', async () => {
    await criar();
    await escolherAula(7);
    presenca.tirar.and.returnValue(throwError(() => new Error('x')));

    await fixture.componentInstance.tirar(chamadaBase.presencas[0]);

    expect(notificador.erroDaApi).toHaveBeenCalled();
  });

  it('duplo toque em Tirar só chama a API uma vez', async () => {
    await criar();
    await escolherAula(7);
    const resposta = new Subject<void>();
    presenca.tirar.and.returnValue(resposta);

    const primeira = fixture.componentInstance.tirar(chamadaBase.presencas[0]);
    const segunda = fixture.componentInstance.tirar(chamadaBase.presencas[0]);
    resposta.next();
    resposta.complete();
    await Promise.all([primeira, segunda]);

    expect(presenca.tirar).toHaveBeenCalledTimes(1);
  });

  it('abrir o incluir carrega as contas e deixa de fora quem já está presente', async () => {
    await criar();
    await escolherAula(7);

    await fixture.componentInstance.abrirIncluir();

    expect(alunos.listar).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.candidatos().map(p => p.nome)).toEqual(['João Alves']);
  });

  it('incluir chama a API, avisa e recarrega', async () => {
    await criar();
    await escolherAula(7);
    await fixture.componentInstance.abrirIncluir();
    presenca.chamada.calls.reset();

    await fixture.componentInstance.incluir(joao);

    expect(presenca.incluir).toHaveBeenCalledWith('2026-11-04', 7, 3);
    expect(notificador.sucesso).toHaveBeenCalled();
    expect(presenca.chamada).toHaveBeenCalledWith('2026-11-04', 7);
    expect(fixture.componentInstance.incluindo()).toBeFalse();
  });

  it('erro ao incluir mostra o erro da API e mantém o painel', async () => {
    await criar();
    await escolherAula(7);
    await fixture.componentInstance.abrirIncluir();
    presenca.incluir.and.returnValue(throwError(() => new Error('x')));

    await fixture.componentInstance.incluir(joao);

    expect(notificador.erroDaApi).toHaveBeenCalled();
    expect(fixture.componentInstance.incluindo()).toBeTrue();
  });

  it('erro ao carregar as aulas mostra tentar de novo', async () => {
    agenda.and.returnValue(throwError(() => new Error('x')));
    await criar();

    expect(el().querySelector('.erro-carga')).not.toBeNull();
    expect(notificador.erroDaApi).toHaveBeenCalled();
  });
});
