import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { SessionService } from '../../core/auth/session.service';
import { criarNotificador } from '../auth/testes-auth';
import { logar, provedoresApp } from '../testes-app';
import { PerfilComponent } from './perfil.component';
import { PerfilService } from './perfil.service';

describe('PerfilComponent', () => {
  let perfilService: jasmine.SpyObj<PerfilService>;
  let notificador: ReturnType<typeof criarNotificador>;
  let componente: PerfilComponent;
  let tela: HTMLElement;

  beforeEach(async () => {
    sessionStorage.clear();
    perfilService = jasmine.createSpyObj<PerfilService>('PerfilService', ['alterarSenha']);
    perfilService.alterarSenha.and.returnValue(of(undefined));
    notificador = criarNotificador();
    TestBed.configureTestingModule({
      imports: [PerfilComponent],
      providers: [...provedoresApp(notificador), { provide: PerfilService, useValue: perfilService }]
    });
    logar(TestBed.inject(SessionService), 'Ana Souza');
    const fixture = TestBed.createComponent(PerfilComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    componente = fixture.componentInstance;
    tela = fixture.nativeElement;
  });

  afterEach(() => sessionStorage.clear());

  const preencherSenha = (atual: string, nova: string, confirmacao: string) =>
    componente.senhaForm.setValue({ senhaAtual: atual, novaSenha: nova, passwordConfirm: confirmacao });

  it('mostra identidade com nome e e-mail truncáveis', () => {
    expect(tela.querySelector('.nome')?.classList).toContain('ajj-truncar');
    expect(tela.querySelector('.email')?.classList).toContain('ajj-truncar');
    expect(tela.textContent).toContain('Aluno');
  });

  it('envia a senha atual e a nova', async () => {
    preencherSenha('Antiga@1', 'Nova@12', 'Nova@12');

    await componente.trocarSenha();

    expect(perfilService.alterarSenha).toHaveBeenCalledWith('Antiga@1', 'Nova@12');
  });

  it('bloqueia senha curta ou diferente', async () => {
    preencherSenha('Antiga@1', '123', '123');
    await componente.trocarSenha();
    preencherSenha('Antiga@1', 'Nova@12', 'Outra@12');
    await componente.trocarSenha();

    expect(notificador.confirmar).not.toHaveBeenCalled();
    expect(perfilService.alterarSenha).not.toHaveBeenCalled();
  });

  it('salvar só o nome atualiza a sessão', () => {
    componente.nomeForm.setValue({ nome: 'Ana Maria' });

    componente.salvarNome();

    expect(TestBed.inject(SessionService).usuario()?.nome).toBe('Ana Maria');
  });

  it('após trocar a senha avisa e encerra a sessão', async () => {
    const navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    preencherSenha('Antiga@1', 'Nova@12', 'Nova@12');

    await componente.trocarSenha();
    await Promise.resolve();

    expect(notificador.sucesso).toHaveBeenCalledWith('Senha alterada! Entre novamente com a nova senha.');
    expect(TestBed.inject(SessionService).autenticado()).toBeFalse();
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });

  it('troca cancelada não chama a API', async () => {
    notificador.confirmar.and.resolveTo(false);
    preencherSenha('Antiga@1', 'Nova@12', 'Nova@12');

    await componente.trocarSenha();

    expect(perfilService.alterarSenha).not.toHaveBeenCalled();
  });

  it('duplo toque em trocar senha chama a API uma vez', async () => {
    preencherSenha('Antiga@1', 'Nova@12', 'Nova@12');

    await Promise.all([componente.trocarSenha(), componente.trocarSenha()]);

    expect(notificador.confirmar).toHaveBeenCalledTimes(1);
    expect(perfilService.alterarSenha).toHaveBeenCalledTimes(1);
  });
});
