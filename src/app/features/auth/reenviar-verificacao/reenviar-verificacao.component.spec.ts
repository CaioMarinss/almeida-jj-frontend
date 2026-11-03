import { Subject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { criarAuthService, criarNotificador, provedoresAuth } from '../testes-auth';
import { ReenviarVerificacaoComponent } from './reenviar-verificacao.component';

describe('ReenviarVerificacaoComponent', () => {
  it('preenche o e-mail a partir da query', () => {
    TestBed.configureTestingModule({
      imports: [ReenviarVerificacaoComponent],
      providers: provedoresAuth(criarAuthService(), criarNotificador(), { email: 'ana@example.com' })
    });
    const fixture = TestBed.createComponent(ReenviarVerificacaoComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.emailForm.value.email).toBe('ana@example.com');
  });
  it('não envia de novo enquanto o envio está em andamento', () => {
    const auth = criarAuthService();
    auth.reenviarVerificacao.and.returnValue(new Subject<never>());
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ReenviarVerificacaoComponent],
      providers: provedoresAuth(auth, criarNotificador(), { email: 'ana@example.com' })
    });
    const fixture = TestBed.createComponent(ReenviarVerificacaoComponent);
    fixture.detectChanges();

    fixture.componentInstance.submit();
    fixture.componentInstance.submit();

    expect(auth.reenviarVerificacao).toHaveBeenCalledTimes(1);
  });

});
