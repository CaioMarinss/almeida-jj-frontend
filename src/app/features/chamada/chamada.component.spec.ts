import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { SessionService } from '../../core/auth/session.service';
import { Perfil } from '../../core/auth/usuario';
import { AulaDoDia, DiaAgenda } from '../../shared/agenda/agenda.model';
import { AgendaService } from '../../shared/agenda/agenda.service';
import { Chamada, PresencaDaAula } from '../../shared/presenca/presenca.model';
import { PresencaService } from '../../shared/presenca/presenca.service';
import { criarNotificador } from '../auth/testes-auth';
import { PessoaAcademia } from '../../shared/alunos/alunos.model';
import { AlunosService } from '../../shared/alunos/alunos.service';
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
  let alunos: jasmine.SpyObj<AlunosService>;
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
    presenca = jasmine.createSpyObj<PresencaService>('PresencaService', ['chamada', 'incluir', 'tirar', 'prazo']);
    presenca.prazo.and.returnValue(of({ ajustaDesde: '2026-11-02' }));
    presenca.chamada.and.returnValue(of(chamadaBase));
    presenca.incluir.and.returnValue(of(undefined));
    presenca.tirar.and.returnValue(of(undefined));
    alunos = jasmine.createSpyObj<AlunosService>('AlunosService', ['listar']);
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
        { provide: AlunosService, useValue: alunos }
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

  const seta = (rotulo: string): HTMLButtonElement => el().querySelector<HTMLButtonElement>(`button.seta[aria-label="${rotulo}"]`)!;

  async function clicar(botao: HTMLButtonElement): Promise<void> {
    botao.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('mostra a semana atual com hoje selecionado', async () => {
    await criar();

    const dias = Array.from(el().querySelectorAll<HTMLButtonElement>('button.dia'));
    expect(dias.length).toBe(7);
    expect(dias[0].getAttribute('aria-label')).toContain('02/11');
    expect(dias[6].getAttribute('aria-label')).toContain('08/11');
    const marcados = dias.filter(d => d.getAttribute('aria-pressed') === 'true');
    expect(marcados.length).toBe(1);
    expect(marcados[0].getAttribute('aria-label')).toContain('04/11');
    expect(el().querySelector('.intervalo')?.textContent).toContain('Esta semana');
    expect(seta('Próxima semana').disabled).toBeTrue();
    expect(agenda).toHaveBeenCalledWith('2026-11-04', '2026-11-04');
  });

  it('trocar o dia recarrega as aulas do dia', async () => {
    await criar();

    await clicar(el().querySelectorAll<HTMLButtonElement>('button.dia')[0]);

    expect(agenda).toHaveBeenCalledWith('2026-11-02', '2026-11-02');
  });

  it('professor volta uma semana só para consulta e não passa disso', async () => {
    await criar();

    await clicar(seta('Semana anterior'));

    expect(el().querySelector('.intervalo')?.textContent).toContain('26/10 a 01/11');
    expect(fixture.componentInstance.selecionado()).toBe('2026-10-28');
    expect(agenda).toHaveBeenCalledWith('2026-10-28', '2026-10-28');
    expect(seta('Semana anterior').disabled).toBeTrue();
    expect(seta('Próxima semana').disabled).toBeFalse();

    await clicar(seta('Próxima semana'));
    expect(fixture.componentInstance.selecionado()).toBe('2026-11-04');
  });

  it('dono volta até a semana do dia seguinte à última graduação', async () => {
    presenca.prazo.and.returnValue(of({ ajustaDesde: '2026-10-11' }));
    await criar('DONO');

    for (let i = 0; i < 4; i++) {
      await clicar(seta('Semana anterior'));
    }

    expect(el().querySelector('.intervalo')?.textContent).toContain('05/10 a 11/10');
    expect(seta('Semana anterior').disabled).toBeTrue();
  });

  it('dono sem graduação anterior volta até 12 semanas', async () => {
    presenca.prazo.and.returnValue(of({ ajustaDesde: null }));
    await criar('DONO');

    for (let i = 0; i < 12; i++) {
      await clicar(seta('Semana anterior'));
    }

    expect(fixture.componentInstance.semana()).toBe('2026-08-10');
    expect(seta('Semana anterior').disabled).toBeTrue();
  });

  it('sem o prazo da API ainda permite voltar uma semana', async () => {
    presenca.prazo.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await criar('DONO');

    await clicar(seta('Semana anterior'));

    expect(fixture.componentInstance.semana()).toBe('2026-10-26');
    expect(seta('Semana anterior').disabled).toBeTrue();
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
    expect(texto()).toContain('Fora do prazo: estas presenças só podem ser consultadas.');
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

    await fixture.componentInstance.incluir([joao]);

    expect(presenca.incluir).toHaveBeenCalledWith('2026-11-04', 7, 3);
    expect(notificador.sucesso).toHaveBeenCalled();
    expect(presenca.chamada).toHaveBeenCalledWith('2026-11-04', 7);
    expect(fixture.componentInstance.incluindo()).toBeFalse();
  });

  it('incluir vários chama a API para cada um e avisa uma vez', async () => {
    const caio: PessoaAcademia = { id: 5, nome: 'Caio Lima', email: 'caio@x.com', perfil: 'ALUNO' };
    await criar();
    await escolherAula(7);
    await fixture.componentInstance.abrirIncluir();

    await fixture.componentInstance.incluir([joao, caio]);

    expect(presenca.incluir.calls.allArgs()).toEqual([['2026-11-04', 7, 3], ['2026-11-04', 7, 5]]);
    expect(notificador.sucesso).toHaveBeenCalledOnceWith('2 alunos entraram na chamada.');
    expect(fixture.componentInstance.incluindo()).toBeFalse();
  });

  it('quem já estava na chamada (ERR027) não interrompe os outros', async () => {
    const caio: PessoaAcademia = { id: 5, nome: 'Caio Lima', email: 'caio@x.com', perfil: 'ALUNO' };
    await criar();
    await escolherAula(7);
    await fixture.componentInstance.abrirIncluir();
    presenca.incluir.and.callFake((_d: string, _a: number, id: number) =>
      id === 3 ? throwError(() => new HttpErrorResponse({ status: 409, error: { codigo: 'ERR027' } })) : of(undefined)
    );

    await fixture.componentInstance.incluir([joao, caio]);

    expect(presenca.incluir).toHaveBeenCalledTimes(2);
    expect(notificador.erroDaApi).not.toHaveBeenCalled();
    expect(notificador.sucesso).toHaveBeenCalledOnceWith('2 alunos entraram na chamada.');
  });

  it('erro no meio para, avisa quem falhou e recarrega o que já entrou', async () => {
    const caio: PessoaAcademia = { id: 5, nome: 'Caio Lima', email: 'caio@x.com', perfil: 'ALUNO' };
    await criar();
    await escolherAula(7);
    await fixture.componentInstance.abrirIncluir();
    presenca.incluir.and.callFake((_d: string, _a: number, id: number) => (id === 5 ? throwError(() => new Error('x')) : of(undefined)));
    presenca.chamada.calls.reset();

    await fixture.componentInstance.incluir([joao, caio]);

    expect(notificador.erroDaApi).toHaveBeenCalledWith(jasmine.anything(), 'Não foi possível incluir Caio Lima.');
    expect(notificador.sucesso).not.toHaveBeenCalled();
    expect(presenca.chamada).toHaveBeenCalledWith('2026-11-04', 7);
    expect(fixture.componentInstance.incluindo()).toBeTrue();
  });

  it('erro ao incluir mostra o erro da API e mantém o painel', async () => {
    await criar();
    await escolherAula(7);
    await fixture.componentInstance.abrirIncluir();
    presenca.incluir.and.returnValue(throwError(() => new Error('x')));

    await fixture.componentInstance.incluir([joao]);

    expect(notificador.erroDaApi).toHaveBeenCalled();
    expect(fixture.componentInstance.incluindo()).toBeTrue();
  });

  it('erro ao carregar as aulas mostra tentar de novo', async () => {
    agenda.and.returnValue(throwError(() => new Error('x')));
    await criar();

    expect(el().querySelector('.erro-carga')).not.toBeNull();
    expect(notificador.erroDaApi).toHaveBeenCalled();
  });

  it('chamada de dia futuro avisa que abre no dia da aula', async () => {
    presenca.chamada.and.returnValue(of({ ...chamadaBase, podeAjustar: false }));
    await criar();
    await fixture.componentInstance.escolherDia('2026-11-05');
    fixture.detectChanges();
    await escolherAula(7);

    expect(texto()).toContain('O controle de presença abre no dia da aula.');
    expect(texto()).not.toContain('Fora do prazo');
  });

  it('trocar de dia fica bloqueado enquanto salva e as aulas não ficam travadas', async () => {
    await criar();
    await escolherAula(7);
    const resposta = new Subject<void>();
    presenca.tirar.and.returnValue(resposta);

    const tirando = fixture.componentInstance.tirar(chamadaBase.presencas[0]);
    await Promise.resolve();
    fixture.detectChanges();
    expect(el().querySelector<HTMLButtonElement>('button.dia')!.disabled).toBeTrue();
    expect(seta('Semana anterior').disabled).toBeTrue();
    await fixture.componentInstance.escolherDia('2026-11-02');
    expect(fixture.componentInstance.selecionado()).toBe('2026-11-04');

    resposta.next();
    resposta.complete();
    await tirando;
    fixture.detectChanges();
    await fixture.componentInstance.escolherDia('2026-11-02');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.carregandoAulas()).toBeFalse();
    expect(fixture.componentInstance.aulas().length).toBe(2);
  });

  it('a contagem atrasada de outro dia não sobrescreve as aulas do dia atual', async () => {
    await criar();
    await escolherAula(7);
    const atrasada = new Subject<DiaAgenda[]>();
    let chamadas = 0;
    agenda.calls.reset();
    agenda.and.callFake((inicio: string) =>
      ++chamadas === 1 ? atrasada : of<DiaAgenda[]>([{ data: inicio, diaCancelado: null, aulas: [aula({ id: 9 })] }])
    );
    const tirando = fixture.componentInstance.tirar(chamadaBase.presencas[0]);
    while (agenda.calls.count() === 0) {
      await Promise.resolve();
    }
    fixture.componentInstance.selecionado.set('2026-11-02');
    await fixture.componentInstance.carregarAulas();
    atrasada.next([{ data: '2026-11-04', diaCancelado: null, aulas: [] }]);
    atrasada.complete();
    await tirando;

    expect(fixture.componentInstance.aulas().map(a => a.id)).toEqual([9]);
    expect(fixture.componentInstance.carregandoAulas()).toBeFalse();
  });

  for (const codigo of ['ERR027', 'ERR028', 'ERR029']) {
    it(`${codigo} ao tirar recarrega a chamada`, async () => {
      await criar();
      await escolherAula(7);
      presenca.tirar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { codigo } })));
      presenca.chamada.calls.reset();

      await fixture.componentInstance.tirar(chamadaBase.presencas[0]);

      expect(presenca.chamada).toHaveBeenCalledWith('2026-11-04', 7);
    });
  }

  it('ERR029 ao incluir fecha o painel e recarrega a chamada', async () => {
    await criar();
    await escolherAula(7);
    await fixture.componentInstance.abrirIncluir();
    presenca.incluir.and.returnValue(throwError(() => new HttpErrorResponse({ status: 422, error: { codigo: 'ERR029' } })));
    presenca.chamada.calls.reset();

    await fixture.componentInstance.incluir([joao]);

    expect(fixture.componentInstance.incluindo()).toBeFalse();
    expect(presenca.chamada).toHaveBeenCalledTimes(1);
  });

  it('ao voltar para a tela recalcula hoje, recarrega aulas e chamada e renova os alunos', async () => {
    await criar();
    await escolherAula(7);
    await fixture.componentInstance.abrirIncluir();
    fixture.componentInstance.fecharIncluir();
    await fixture.componentInstance.ionViewWillEnter();
    agenda.calls.reset();
    presenca.chamada.calls.reset();
    alunos.listar.calls.reset();
    jasmine.clock().mockDate(new Date('2026-11-10T15:00:00Z'));

    await fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();

    expect(fixture.componentInstance.hoje()).toBe('2026-11-10');
    expect(fixture.componentInstance.selecionado()).toBe('2026-11-04');
    expect(fixture.componentInstance.semana()).toBe('2026-11-02');
    expect(fixture.componentInstance.intervalo()).toBe('02/11 a 08/11');
    expect(agenda).toHaveBeenCalledWith('2026-11-04', '2026-11-04');
    expect(presenca.chamada).toHaveBeenCalledWith('2026-11-04', 7);
    await fixture.componentInstance.abrirIncluir();
    expect(alunos.listar).toHaveBeenCalledTimes(1);
  });

  it('a resposta atrasada do prazo não sobrescreve a mais recente', async () => {
    const atrasada = new Subject<{ ajustaDesde: string | null }>();
    presenca.prazo.and.returnValues(atrasada, of({ ajustaDesde: '2026-10-11' }));
    await criar('DONO');
    await fixture.componentInstance.ionViewWillEnter();
    await fixture.componentInstance.ionViewWillEnter();

    atrasada.next({ ajustaDesde: null });
    atrasada.complete();
    await fixture.whenStable();

    expect(fixture.componentInstance.ajustaDesde()).toBe('2026-10-11');
  });

  it('voltar para a tela no meio do incluir não troca o dia das próximas inclusões', async () => {
    const caio: PessoaAcademia = { id: 5, nome: 'Caio Lima', email: 'caio@x.com', perfil: 'ALUNO' };
    await criar();
    await escolherAula(7);
    await fixture.componentInstance.abrirIncluir();
    const primeira = new Subject<void>();
    presenca.incluir.and.returnValues(primeira, of(undefined));

    const incluindo = fixture.componentInstance.incluir([joao, caio]);
    await Promise.resolve();
    fixture.componentInstance.selecionado.set('2026-11-03');
    primeira.next();
    primeira.complete();
    await incluindo;

    expect(presenca.incluir.calls.allArgs()).toEqual([['2026-11-04', 7, 3], ['2026-11-04', 7, 5]]);
  });
});
