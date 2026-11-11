import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular';
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
  const caio: PessoaAcademia = { id: 4, nome: 'Caio Lima', email: 'caio@x.com', perfil: 'PROFESSOR' };
  const agata: PessoaAcademia = { id: 6, nome: 'Ágata Dias', email: 'agata@x.com', perfil: 'ALUNO' };
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
    alunos.listar.and.returnValue(of([bia, joao, caio, agata]));
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
    await esvaziar();
    fixture.detectChanges();
  }

  async function esvaziar(): Promise<void> {
    for (let i = 0; i < 20; i++) {
      await Promise.resolve();
    }
  }

  const el = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => el().textContent ?? '';

  async function escolherAula(id: number): Promise<void> {
    el().querySelector<HTMLButtonElement>(`button.aula[data-id="${id}"]`)?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await esvaziar();
    fixture.detectChanges();
  }

  const seta = (rotulo: string): HTMLButtonElement => el().querySelector<HTMLButtonElement>(`button.seta[aria-label="${rotulo}"]`)!;

  async function clicar(botao: HTMLButtonElement): Promise<void> {
    botao.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await esvaziar();
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
    expect(primeira?.textContent).toContain('2 pres.');
    expect(el().querySelector('button.aula[data-id="8"]')?.textContent).toContain('Cancelada');
  });

  it('uma presença usa o singular', async () => {
    agenda.and.returnValue(of([{ data: '2026-11-04', diaCancelado: null, aulas: [aula({ vao: 1 })] }]));
    await criar();

    expect(el().querySelector('button.aula')?.textContent).toContain('1 pres.');
  });

  it('dia sem aula mostra aviso', async () => {
    agenda.and.returnValue(of([{ data: '2026-11-04', diaCancelado: null, aulas: [] }]));
    await criar();

    expect(texto()).toContain('Nenhuma aula neste dia');
  });

  const linhas = (secao: string): HTMLButtonElement[] => Array.from(el().querySelectorAll<HTMLButtonElement>(`section.${secao} button.linha`));
  const linha = (id: number): HTMLButtonElement => el().querySelector<HTMLButtonElement>(`button.linha[data-id="${id}"]`)!;

  it('abre na aula de agora e já carrega a chamada', async () => {
    agenda.and.returnValue(
      of([{ data: '2026-11-04', diaCancelado: null, aulas: [aula({ id: 5, inicio: '07:00', fim: '08:00' }), aula({ id: 6, inicio: '12:00', fim: '13:00' }), aula({ id: 7 })] }])
    );
    await criar('DONO');

    expect(fixture.componentInstance.idAula()).toBe(6);
    expect(presenca.chamada).toHaveBeenCalledOnceWith('2026-11-04', 6);
    expect(el().querySelector('button.aula[data-id="6"]')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('em outro dia abre na primeira aula', async () => {
    await criar('DONO');
    agenda.and.returnValue(
      of([{ data: '2026-11-03', diaCancelado: null, aulas: [aula({ id: 5, inicio: '07:00', fim: '08:00' }), aula({ id: 6, inicio: '12:00', fim: '13:00' })] }])
    );

    await fixture.componentInstance.escolherDia('2026-11-03');
    fixture.detectChanges();
    await fixture.whenStable();
    await esvaziar();

    expect(fixture.componentInstance.idAula()).toBe(5);
    expect(presenca.chamada).toHaveBeenCalledWith('2026-11-03', 5);
  });

  it('lista Presentes com a origem e Outros alunos sem os presentes', async () => {
    presenca.chamada.and.returnValue(
      of({ ...chamadaBase, presencas: [...chamadaBase.presencas, presente({ idAluno: 3, nome: 'João Alves', origem: 'DONO', registradoPor: 'Dono' })] })
    );
    await criar('DONO');

    expect(el().querySelector('section.presentes h2')?.textContent).toContain('Presentes · 3');
    const presentes = linhas('presentes');
    expect(presentes.map(l => l.querySelector('strong')?.textContent)).toEqual(['Bia Souza', 'Caio Lima', 'João Alves']);
    expect(presentes[0].textContent).toContain('marcou Vou');
    expect(presentes[1].textContent).toContain('incluída pelo professor');
    expect(presentes[2].textContent).toContain('incluído por você');
    expect(presentes.every(l => l.getAttribute('aria-pressed') === 'true')).toBeTrue();
    expect(el().querySelector('section.outros h2')?.textContent).toContain('Outros alunos');
    const outros = linhas('outros');
    expect(outros.map(l => l.querySelector('strong')?.textContent)).toEqual(['Ágata Dias']);
    expect(outros[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('mostra o prazo como ajustável até', async () => {
    await criar('DONO');

    expect(texto()).toContain('ajustável até 08/11');
  });

  it('sem limite não mostra prazo', async () => {
    presenca.chamada.and.returnValue(of({ ...chamadaBase, ajustaAte: null }));
    await criar('DONO');

    expect(texto()).not.toContain('ajustável até');
  });

  it('marcar um aluno inclui na aula e recarrega a chamada e a contagem', async () => {
    await criar('DONO');
    agenda.calls.reset();
    presenca.chamada.calls.reset();

    await clicar(linha(3));

    expect(presenca.incluir).toHaveBeenCalledOnceWith('2026-11-04', 7, 3);
    expect(presenca.chamada).toHaveBeenCalledWith('2026-11-04', 7);
    expect(agenda).toHaveBeenCalledWith('2026-11-04', '2026-11-04');
    expect(notificador.confirmar).not.toHaveBeenCalled();
  });

  it('desmarcar pede confirmação e tira a presença', async () => {
    await criar('DONO');
    presenca.chamada.calls.reset();

    await clicar(linha(2));

    expect(notificador.confirmar).toHaveBeenCalledWith('Tirar a presença', 'Tirar a presença de Bia Souza?', 'Tirar');
    expect(presenca.tirar).toHaveBeenCalledOnceWith('2026-11-04', 7, 2);
    expect(presenca.chamada).toHaveBeenCalledWith('2026-11-04', 7);
  });

  it('desmarcar cancelado na confirmação não chama a API', async () => {
    await criar('DONO');
    notificador.confirmar.and.resolveTo(false);

    await clicar(linha(2));

    expect(presenca.tirar).not.toHaveBeenCalled();
  });

  it('a linha tocada fica desabilitada enquanto salva e toque repetido chama a API uma vez', async () => {
    await criar('DONO');
    const resposta = new Subject<void>();
    presenca.incluir.and.returnValue(resposta);
    const joaoLinha = fixture.componentInstance.outros()[1];

    const primeira = fixture.componentInstance.alternar(joaoLinha);
    const segunda = fixture.componentInstance.alternar(joaoLinha);
    fixture.detectChanges();
    expect(linha(3).disabled).toBeTrue();
    resposta.next();
    resposta.complete();
    await Promise.all([primeira, segunda]);

    expect(presenca.incluir).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.salvando()).toBeFalse();
  });

  it('erro ao marcar mostra o erro da API e recarrega a chamada', async () => {
    await criar('DONO');
    presenca.incluir.and.returnValue(throwError(() => new Error('x')));
    presenca.chamada.calls.reset();

    await clicar(linha(3));

    expect(notificador.erroDaApi).toHaveBeenCalledWith(jasmine.anything(), 'Não foi possível incluir João Alves.');
    expect(presenca.chamada).toHaveBeenCalledWith('2026-11-04', 7);
  });

  it('erro ao tirar mostra o erro da API e recarrega a chamada', async () => {
    await criar('DONO');
    presenca.tirar.and.returnValue(throwError(() => new Error('x')));
    presenca.chamada.calls.reset();

    await clicar(linha(2));

    expect(notificador.erroDaApi).toHaveBeenCalledWith(jasmine.anything(), 'Não foi possível tirar a presença.');
    expect(presenca.chamada).toHaveBeenCalledWith('2026-11-04', 7);
  });

  it('a busca filtra as duas seções sem considerar acento', async () => {
    await criar('DONO');
    const campo = el().querySelector<HTMLInputElement>('input[type="search"]')!;

    campo.value = 'agata';
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(linhas('presentes').length).toBe(0);
    expect(linhas('outros').map(l => l.querySelector('strong')?.textContent)).toEqual(['Ágata Dias']);

    campo.value = 'BIA';
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(linhas('presentes').map(l => l.querySelector('strong')?.textContent)).toEqual(['Bia Souza']);
    expect(linhas('outros').length).toBe(0);
  });

  it('fora do prazo é só leitura com aviso', async () => {
    presenca.chamada.and.returnValue(of({ ...chamadaBase, podeAjustar: false }));
    await criar('DONO');

    expect(texto()).toContain('Fora do prazo: estas presenças só podem ser consultadas.');
    expect(texto()).not.toContain('ajustável até');
    const todas = [...linhas('presentes'), ...linhas('outros')];
    expect(todas.length).toBe(4);
    expect(todas.every(l => l.disabled)).toBeTrue();
  });

  it('aula cancelada permite tirar mas não incluir', async () => {
    await criar('DONO');

    await escolherAula(8);

    expect(linhas('presentes').every(l => !l.disabled)).toBeTrue();
    expect(linhas('outros').every(l => l.disabled)).toBeTrue();
  });

  it('chamada vazia mostra aviso', async () => {
    presenca.chamada.and.returnValue(of({ ...chamadaBase, presencas: [] }));
    await criar('DONO');

    expect(texto()).toContain('Ninguém registrado nesta aula');
    expect(linhas('outros').length).toBe(4);
  });

  it('Editar grade navega para a grade', async () => {
    await criar('DONO');
    const navegar = spyOn(TestBed.inject(NavController), 'navigateForward').and.resolveTo(true);

    const botao = Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.includes('Editar grade'))!;
    botao.click();

    expect(navegar).toHaveBeenCalledWith('/app/grade');
  });

  it('erro ao carregar as aulas mostra tentar de novo', async () => {
    agenda.and.returnValue(throwError(() => new Error('x')));
    await criar();

    expect(el().querySelector('.erro-carga')).not.toBeNull();
    expect(notificador.erroDaApi).toHaveBeenCalled();
  });

  it('chamada de dia futuro avisa que abre no dia da aula', async () => {
    presenca.chamada.and.returnValue(of({ ...chamadaBase, podeAjustar: false }));
    await criar('DONO');
    await fixture.componentInstance.escolherDia('2026-11-05');
    fixture.detectChanges();
    await fixture.whenStable();
    await esvaziar();
    fixture.detectChanges();

    expect(texto()).toContain('O controle de presença abre no dia da aula.');
    expect(texto()).not.toContain('Fora do prazo');
  });

  it('trocar de dia fica bloqueado enquanto salva e as aulas não ficam travadas', async () => {
    await criar('DONO');
    const resposta = new Subject<void>();
    presenca.tirar.and.returnValue(resposta);

    const tirando = fixture.componentInstance.alternar(fixture.componentInstance.presentes()[0]);
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
    await criar('DONO');
    const atrasada = new Subject<DiaAgenda[]>();
    let chamadas = 0;
    agenda.calls.reset();
    agenda.and.callFake((inicio: string) =>
      ++chamadas === 1 ? atrasada : of<DiaAgenda[]>([{ data: inicio, diaCancelado: null, aulas: [aula({ id: 9 })] }])
    );
    const tirando = fixture.componentInstance.alternar(fixture.componentInstance.presentes()[0]);
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
      await criar('DONO');
      presenca.tirar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { codigo } })));
      presenca.chamada.calls.reset();

      await fixture.componentInstance.alternar(fixture.componentInstance.presentes()[0]);

      expect(presenca.chamada).toHaveBeenCalledWith('2026-11-04', 7);
    });
  }

  it('ERR027 ao incluir recarrega a chamada', async () => {
    await criar('DONO');
    presenca.incluir.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { codigo: 'ERR027' } })));
    presenca.chamada.calls.reset();

    await clicar(linha(3));

    expect(presenca.chamada).toHaveBeenCalledWith('2026-11-04', 7);
  });

  it('ao voltar para a tela recalcula hoje, recarrega aulas e chamada e renova os alunos', async () => {
    await criar('DONO');
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

  it('voltar para a tela no meio do toque não troca o dia da inclusão', async () => {
    await criar('DONO');
    const resposta = new Subject<void>();
    presenca.incluir.and.returnValue(resposta);

    const incluindo = fixture.componentInstance.alternar(fixture.componentInstance.outros()[1]);
    await Promise.resolve();
    fixture.componentInstance.selecionado.set('2026-11-03');
    resposta.next();
    resposta.complete();
    await incluindo;

    expect(presenca.incluir).toHaveBeenCalledOnceWith('2026-11-04', 7, 3);
  });
});
