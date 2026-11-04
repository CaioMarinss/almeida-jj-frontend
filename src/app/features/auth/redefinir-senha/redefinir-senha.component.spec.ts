import { Subject } from 'rxjs';
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
    componente.formSenha.setValue({ novaSenha: 'Nova@123', confirmarSenha: 'Nova@123' });

    componente.submit();

    expect(componente.linkValido()).toBeFalse();
    expect(auth.redefinirSenha).not.toHaveBeenCalled();
  });

  it('envia só o token e a nova senha', () => {
    const auth = criarAuthService();
    auth.redefinirSenha.and.returnValue(of(undefined));
    const { componente } = criar({ token: 'TK', email: 'ana@example.com' }, auth);
    componente.formSenha.setValue({ novaSenha: 'Nova@123', confirmarSenha: 'Nova@123' });

    componente.submit();

    expect(auth.redefinirSenha).toHaveBeenCalledWith('TK', 'Nova@123');
  });
  it('não envia de novo enquanto a redefinição está em andamento', () => {
    const auth = criarAuthService();
    auth.redefinirSenha.and.returnValue(new Subject<never>());
    const { componente } = criar({ token: 'TK' }, auth);
    componente.formSenha.setValue({ novaSenha: 'Nova@123', confirmarSenha: 'Nova@123' });

    componente.submit();
    componente.submit();

    expect(auth.redefinirSenha).toHaveBeenCalledTimes(1);
  });


  it('não envia senha fraca', () => {
    const auth = criarAuthService();
    auth.redefinirSenha.and.returnValue(of(undefined));
    const { componente } = criar({ token: 'TK' }, auth);
    componente.formSenha.setValue({ novaSenha: 'senhafraca1', confirmarSenha: 'senhafraca1' });

    componente.submit();

    expect(componente.formSenha.controls.novaSenha.hasError('senhaFraca')).toBeTrue();
    expect(auth.redefinirSenha).not.toHaveBeenCalled();
  });

  it('mostra a lista de regras da nova senha', async () => {
    TestBed.configureTestingModule({
      imports: [RedefinirSenhaComponent],
      providers: provedoresAuth(criarAuthService(), criarNotificador(), { token: 'TK' })
    });
    const fixture = TestBed.createComponent(RedefinirSenhaComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.formSenha.controls.novaSenha.setValue('Nova@123');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('ajj-regras-senha li.cumprida').length).toBe(6);
    expect(fixture.nativeElement.textContent).toContain('Escolha uma senha forte');
  });
});
