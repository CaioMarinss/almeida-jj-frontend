import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { criarAuthService, criarNotificador, provedoresAuth } from '../testes-auth';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  const auth = criarAuthService();
  const notificador = criarNotificador();
  let componente: LoginComponent;
  let navegar: jasmine.Spy;

  beforeEach(async () => {
    auth.login.calls.reset();
    notificador.aviso.calls.reset();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: provedoresAuth(auth, notificador)
    }).compileComponents();
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    componente = fixture.componentInstance;
    navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    componente.loginForm.setValue({ email: 'ana@example.com', senha: 'Senha@1' });
  });

  it('login com sucesso navega para o dashboard', () => {
    auth.login.and.returnValue(of({ id: 1, nome: 'Ana', email: 'ana@example.com', perfil: 'ALUNO' }));

    componente.submit();

    expect(auth.login).toHaveBeenCalledWith('ana@example.com', 'Senha@1');
    expect(navegar).toHaveBeenCalledWith(['/dashboard']);
  });

  it('conta não verificada avisa e leva ao reenvio com o e-mail', async () => {
    auth.login.and.returnValue(
      throwError(
        () => new HttpErrorResponse({ status: 403, error: { detail: 'E-mail não verificado.', codigo: 'ERR003' } })
      )
    );

    componente.submit();
    await Promise.resolve();

    expect(notificador.aviso).toHaveBeenCalledWith('E-mail não verificado.');
    expect(navegar).toHaveBeenCalledWith(['/verificaremail'], { queryParams: { email: 'ana@example.com' } });
  });

  it('não chama a API com formulário inválido', () => {
    componente.loginForm.setValue({ email: 'x', senha: '' });

    componente.submit();

    expect(auth.login).not.toHaveBeenCalled();
  });
});
