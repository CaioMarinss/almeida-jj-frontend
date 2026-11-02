import { Subject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { criarAuthService, criarNotificador, provedoresAuth } from '../testes-auth';
import { EsqueciSenhaComponent } from './esqueci-senha.component';

describe('EsqueciSenhaComponent', () => {
  it('envia o e-mail normalizado', () => {
    const auth = criarAuthService();
    auth.esqueciSenha.and.returnValue(of(undefined));
    TestBed.configureTestingModule({
      imports: [EsqueciSenhaComponent],
      providers: provedoresAuth(auth, criarNotificador())
    });
    const fixture = TestBed.createComponent(EsqueciSenhaComponent);
    fixture.detectChanges();
    fixture.componentInstance.emailForm.setValue({ email: ' Ana@Example.com ' });

    fixture.componentInstance.submit();

    expect(auth.esqueciSenha).toHaveBeenCalledWith('ana@example.com');
  });
  it('não envia de novo enquanto o envio está em andamento', () => {
    const auth = criarAuthService();
    auth.esqueciSenha.and.returnValue(new Subject<never>());
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [EsqueciSenhaComponent], providers: provedoresAuth(auth, criarNotificador()) });
    const fixture = TestBed.createComponent(EsqueciSenhaComponent);
    fixture.detectChanges();
    fixture.componentInstance.emailForm.setValue({ email: 'ana@example.com' });

    fixture.componentInstance.submit();
    fixture.componentInstance.submit();

    expect(auth.esqueciSenha).toHaveBeenCalledTimes(1);
  });

});
