import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of } from 'rxjs';
import { SessionService } from '../../core/auth/session.service';
import { Notificador } from '../../core/notificacao/notificador';
import { criarNotificador } from '../auth/testes-auth';
import { PerfilComponent } from './perfil.component';
import { PerfilService } from './perfil.service';

describe('PerfilComponent', () => {
  let perfilService: jasmine.SpyObj<PerfilService>;
  let componente: PerfilComponent;

  beforeEach(() => {
    sessionStorage.clear();
    perfilService = jasmine.createSpyObj<PerfilService>('PerfilService', ['alterarSenha']);
    perfilService.alterarSenha.and.returnValue(of(undefined));
    TestBed.configureTestingModule({
      imports: [PerfilComponent],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: PerfilService, useValue: perfilService },
        { provide: Notificador, useValue: criarNotificador() }
      ]
    });
    TestBed.inject(SessionService).iniciar('TK', { id: 1, nome: 'Ana', email: 'ana@example.com', perfil: 'ALUNO' });
    const fixture = TestBed.createComponent(PerfilComponent);
    fixture.detectChanges();
    componente = fixture.componentInstance;
  });

  afterEach(() => sessionStorage.clear());

  it('envia a senha atual e a nova', () => {
    componente.senhaAtual.set('Antiga@1');
    componente.novaSenha.set('Nova@12');
    componente.confirmacaoSenha.set('Nova@12');

    componente.salvar();
    componente.confirmarTrocaDeSenha();

    expect(perfilService.alterarSenha).toHaveBeenCalledWith('Antiga@1', 'Nova@12');
  });

  it('bloqueia senha curta ou diferente', () => {
    componente.senhaAtual.set('Antiga@1');
    componente.novaSenha.set('123');
    componente.confirmacaoSenha.set('123');
    componente.salvar();

    componente.novaSenha.set('Nova@12');
    componente.confirmacaoSenha.set('Outra@12');
    componente.salvar();

    expect(componente.confirmandoSenha()).toBeFalse();
    expect(perfilService.alterarSenha).not.toHaveBeenCalled();
  });

  it('salvar só o nome atualiza a sessão', () => {
    componente.nomeEditado.set('Ana Maria');

    componente.salvar();

    expect(TestBed.inject(SessionService).usuario()?.nome).toBe('Ana Maria');
  });
  it('após trocar a senha avisa e encerra a sessão', async () => {
    const navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    componente.senhaAtual.set('Antiga@1');
    componente.novaSenha.set('Nova@12');
    componente.confirmacaoSenha.set('Nova@12');

    componente.salvar();
    componente.confirmarTrocaDeSenha();
    await Promise.resolve();

    expect(TestBed.inject(SessionService).autenticado()).toBeFalse();
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });

});
