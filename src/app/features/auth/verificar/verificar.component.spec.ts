import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { criarAuthService, criarNotificador, provedoresAuth } from '../testes-auth';
import { VerificarComponent } from './verificar.component';

describe('VerificarComponent', () => {
  function criar(query: Record<string, string>, auth = criarAuthService()) {
    TestBed.configureTestingModule({
      imports: [VerificarComponent],
      providers: provedoresAuth(auth, criarNotificador(), query)
    });
    const fixture = TestBed.createComponent(VerificarComponent);
    fixture.detectChanges();
    return { componente: fixture.componentInstance, auth };
  }

  it('sem token não chama a API', () => {
    const { componente, auth } = criar({});

    expect(auth.verificarEmail).not.toHaveBeenCalled();
    expect(componente.status()).toBe('erro');
    expect(componente.mensagem()).toBe('Link inválido ou expirado.');
  });

  it('com token chama a API e mostra sucesso', () => {
    const auth = criarAuthService();
    auth.verificarEmail.and.returnValue(of(undefined));

    const { componente } = criar({ token: 'TK' }, auth);

    expect(auth.verificarEmail).toHaveBeenCalledWith('TK');
    expect(componente.status()).toBe('sucesso');
    expect(componente.mensagem()).toBe('E-mail verificado com sucesso!');
  });
});
