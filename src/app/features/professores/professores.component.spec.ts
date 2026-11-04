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

  it('mostra uma linha por pessoa com nome, e-mail e cargo', async () => {
    await criar();

    expect(fixture.nativeElement.querySelectorAll('li.pessoa').length).toBe(3);
    expect(linha('bia@x.com')?.textContent).toContain('Bia Souza');
    expect(linha('bia@x.com')?.textContent).toContain('bia@x.com');
    expect(linha('bia@x.com')?.querySelector('.ajj-chip')?.textContent).toContain('Aluno');
    expect(linha('caio@x.com')?.querySelector('.ajj-chip')?.textContent).toContain('Professor');
    expect(linha('dora@x.com')?.querySelector('.ajj-chip')?.textContent).toContain('Dono');
  });

  it('oferece o botão certo para cada cargo e nenhum para o dono', async () => {
    await criar();

    expect(linha('bia@x.com')?.querySelector('ajj-botao')?.textContent).toContain('Tornar professor');
    expect(linha('caio@x.com')?.querySelector('ajj-botao')?.textContent).toContain('Remover professor');
    expect(linha('dora@x.com')?.querySelector('ajj-botao')).toBeNull();
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

  it('dois cliques seguidos fazem uma única chamada e o botão fica carregando', async () => {
    const resposta = new Subject<void>();
    service.alterarPerfil.and.returnValue(resposta);
    await criar();

    const primeira = fixture.componentInstance.alternar(bia);
    const segunda = fixture.componentInstance.alternar(bia);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(service.alterarPerfil).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.alterando()).toBe(2);
    expect(linha('bia@x.com')?.querySelector('ion-button')?.getAttribute('aria-busy')).toBe('true');

    resposta.next();
    resposta.complete();
    await Promise.all([primeira, segunda]);
    expect(fixture.componentInstance.alterando()).toBeNull();
  });

  it('erro ao carregar mostra o erro da API e o estado vazio', async () => {
    const erro = new Error('falhou');
    service.listar.and.returnValue(throwError(() => erro));
    await criar();

    expect(notificador.erroDaApi).toHaveBeenCalledWith(erro, 'Não foi possível carregar os alunos.');
    expect(fixture.componentInstance.carregando()).toBeFalse();
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
