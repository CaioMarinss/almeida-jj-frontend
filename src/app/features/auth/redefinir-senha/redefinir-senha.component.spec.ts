import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { criarAuthService, criarNotificador, provedoresAuth } from '../testes-auth';
import { RedefinirSenhaComponent } from './redefinir-senha.component';

describe('RedefinirSenhaComponent', () => {
  function criar(query: Record<string, string>, auth = criarAuthService()) {
    TestBed.configureTestingModule({
      imports: [RedefinirSenhaComponent],
      providers: provedoresAuth(auth, criarNotificador(), query)
    });
    const fixture = TestBed.createComponent(RedefinirSenhaComponent);
    fixture.detectChanges();
    return { componente: fixture.componentInstance, auth };
  }

  it('sem token não chama a API', () => {
    const { componente, auth } = criar({});
    componente.formSenha.setValue({ novaSenha: 'Nova@12', confirmarSenha: 'Nova@12' });

    componente.submit();

    expect(componente.linkValido()).toBeFalse();
    expect(auth.redefinirSenha).not.toHaveBeenCalled();
  });

  it('envia só o token e a nova senha', () => {
    const auth = criarAuthService();
    auth.redefinirSenha.and.returnValue(of(undefined));
    const { componente } = criar({ token: 'TK', email: 'ana@example.com' }, auth);
    componente.formSenha.setValue({ novaSenha: 'Nova@12', confirmarSenha: 'Nova@12' });

    componente.submit();

    expect(auth.redefinirSenha).toHaveBeenCalledWith('TK', 'Nova@12');
  });
});
