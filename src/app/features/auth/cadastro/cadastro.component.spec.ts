import { Subject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { criarAuthService, criarNotificador, provedoresAuth } from '../testes-auth';
import { CadastroComponent } from './cadastro.component';

describe('CadastroComponent', () => {
  it('envia CPF sem máscara e e-mail normalizado', () => {
    const auth = criarAuthService();
    auth.cadastrar.and.returnValue(of(undefined));
    TestBed.configureTestingModule({
      imports: [CadastroComponent],
      providers: provedoresAuth(auth, criarNotificador())
    });
    const fixture = TestBed.createComponent(CadastroComponent);
    fixture.detectChanges();
    fixture.componentInstance.cadastroForm.setValue({
      nome: 'Ana',
      cpf: '529.982.247-25',
      email: ' Ana@X.com ',
      senha: 'Senha@1',
      passwordConfirm: 'Senha@1'
    });

    fixture.componentInstance.submit();

    expect(auth.cadastrar).toHaveBeenCalledWith({
      nome: 'Ana',
      cpf: '52998224725',
      email: 'ana@x.com',
      senha: 'Senha@1'
    });
  });
  it('não envia de novo enquanto o cadastro está em andamento', () => {
    const auth = criarAuthService();
    auth.cadastrar.and.returnValue(new Subject<never>());
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [CadastroComponent], providers: provedoresAuth(auth, criarNotificador()) });
    const fixture = TestBed.createComponent(CadastroComponent);
    fixture.detectChanges();
    fixture.componentInstance.cadastroForm.setValue({
      nome: 'Ana',
      cpf: '529.982.247-25',
      email: 'ana@x.com',
      senha: 'Senha@1',
      passwordConfirm: 'Senha@1'
    });

    fixture.componentInstance.submit();
    fixture.componentInstance.submit();

    expect(auth.cadastrar).toHaveBeenCalledTimes(1);
  });

});
