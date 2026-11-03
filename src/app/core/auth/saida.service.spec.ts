import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Notificador } from '../notificacao/notificador';
import { criarNotificador } from '../../features/auth/testes-auth';
import { SaidaService } from './saida.service';
import { SessionService } from './session.service';

describe('SaidaService', () => {
  const notificador = criarNotificador();
  let sessao: SessionService;
  let navegar: jasmine.Spy;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Notificador, useValue: notificador }] });
    sessao = TestBed.inject(SessionService);
    sessao.iniciar('TK', { id: 1, nome: 'Ana', email: 'a@x.com', perfil: 'ALUNO' });
    navegar = spyOn(TestBed.inject(NavController), 'navigateRoot').and.resolveTo(true);
  });

  afterEach(() => sessionStorage.clear());

  it('confirmado encerra a sessão e volta ao login', async () => {
    notificador.confirmar.and.resolveTo(true);

    await TestBed.inject(SaidaService).sair();

    expect(sessao.autenticado()).toBeFalse();
    expect(navegar).toHaveBeenCalledWith('/login');
  });

  it('cancelado mantém a sessão', async () => {
    notificador.confirmar.and.resolveTo(false);

    await TestBed.inject(SaidaService).sair();

    expect(sessao.autenticado()).toBeTrue();
    expect(navegar).not.toHaveBeenCalled();
  });
});
