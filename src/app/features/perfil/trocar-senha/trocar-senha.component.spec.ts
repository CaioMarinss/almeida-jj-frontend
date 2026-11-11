import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { SessionService } from '../../../core/auth/session.service';
import { criarNotificador } from '../../auth/testes-auth';
import { logar, provedoresApp } from '../../testes-app';
import { PerfilService } from '../perfil.service';
import { TrocarSenhaComponent } from './trocar-senha.component';

describe('TrocarSenhaComponent', () => {
  let perfilService: jasmine.SpyObj<PerfilService>;
  let notificador: ReturnType<typeof criarNotificador>;
  let componente: TrocarSenhaComponent;
  let tela: HTMLElement;

  beforeEach(async () => {
    sessionStorage.clear();
    perfilService = jasmine.createSpyObj<PerfilService>('PerfilService', ['alterarSenha']);
    perfilService.alterarSenha.and.returnValue(of(undefined));
    notificador = criarNotificador();
    TestBed.configureTestingModule({
      imports: [TrocarSenhaComponent],
      providers: [...provedoresApp(notificador), { provide: PerfilService, useValue: perfilService }]
    });
    logar(TestBed.inject(SessionService), 'Ana Souza');
    const fixture = TestBed.createComponent(TrocarSenhaComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    componente = fixture.componentInstance;
    tela = fixture.nativeElement;
  });

  afterEach(() => sessionStorage.clear());

  const preencherSenha = (atual: string, nova: string, confirmacao: string) =>
    componente.senhaForm.setValue({ senhaAtual: atual, novaSenha: nova, passwordConfirm: confirmacao });

  it('tem botão de voltar para o perfil', () => {
    const voltar = tela.querySelector<HTMLElement & { defaultHref?: string }>('ion-back-button');

    expect(voltar?.defaultHref).toBe('/app/perfil');
  });

  it('trocarSenhaMantemValidacoes: envia a senha atual e a nova', async () => {
    preencherSenha('Antiga@1', 'Nova@123', 'Nova@123');

    await componente.trocarSenha();

    expect(perfilService.alterarSenha).toHaveBeenCalledWith('Antiga@1', 'Nova@123');
  });

  it('bloqueia senha curta ou diferente', async () => {
    preencherSenha('Antiga@1', '123', '123');
    await componente.trocarSenha();
    preencherSenha('Antiga@1', 'Nova@123', 'Outra@123');
    await componente.trocarSenha();

    expect(notificador.confirmar).not.toHaveBeenCalled();
    expect(perfilService.alterarSenha).not.toHaveBeenCalled();
  });

  it('sessão expirada na troca de senha não mostra alerta de erro', async () => {
    perfilService.alterarSenha.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    preencherSenha('Antiga@1', 'Nova@123', 'Nova@123');

    await componente.trocarSenha();

    expect(notificador.erroDaApi).not.toHaveBeenCalled();
  });

  it('após trocar a senha avisa e encerra a sessão', async () => {
    const navegar = spyOn(TestBed.inject(NavController), 'navigateRoot').and.resolveTo(true);
    preencherSenha('Antiga@1', 'Nova@123', 'Nova@123');

    await componente.trocarSenha();
    await Promise.resolve();

    expect(notificador.sucesso).toHaveBeenCalledWith('Senha alterada! Entre novamente com a nova senha.');
    expect(TestBed.inject(SessionService).autenticado()).toBeFalse();
    expect(navegar).toHaveBeenCalledWith('/login');
  });

  it('troca cancelada não chama a API', async () => {
    notificador.confirmar.and.resolveTo(false);
    preencherSenha('Antiga@1', 'Nova@123', 'Nova@123');

    await componente.trocarSenha();

    expect(perfilService.alterarSenha).not.toHaveBeenCalled();
  });

  it('duplo toque em trocar senha chama a API uma vez', async () => {
    preencherSenha('Antiga@1', 'Nova@123', 'Nova@123');

    await Promise.all([componente.trocarSenha(), componente.trocarSenha()]);

    expect(notificador.confirmar).toHaveBeenCalledTimes(1);
    expect(perfilService.alterarSenha).toHaveBeenCalledTimes(1);
  });

  it('bloqueia nova senha que não cumpre as regras', async () => {
    for (const fraca of ['novasenha1', 'NOVASENHA@1', 'NovaSenha@', 'NovaSenha1', 'Nova @123']) {
      preencherSenha('Antiga@1', fraca, fraca);
      await componente.trocarSenha();
    }

    expect(perfilService.alterarSenha).not.toHaveBeenCalled();
  });

  it('aceita senha atual fora das regras novas', async () => {
    preencherSenha('fraca', 'Nova@123', 'Nova@123');

    await componente.trocarSenha();

    expect(perfilService.alterarSenha).toHaveBeenCalledWith('fraca', 'Nova@123');
  });

  it('mostra a lista de regras da nova senha', () => {
    expect(tela.querySelectorAll('ajj-regras-senha li').length).toBe(6);
  });
});
