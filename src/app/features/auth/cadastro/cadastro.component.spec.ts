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
      senha: 'Senha@12',
      passwordConfirm: 'Senha@12'
    });

    fixture.componentInstance.submit();

    expect(auth.cadastrar).toHaveBeenCalledWith({
      nome: 'Ana',
      cpf: '52998224725',
      email: 'ana@x.com',
      senha: 'Senha@12'
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
      senha: 'Senha@12',
      passwordConfirm: 'Senha@12'
    });

    fixture.componentInstance.submit();
    fixture.componentInstance.submit();

    expect(auth.cadastrar).toHaveBeenCalledTimes(1);
  });

  it('botão principal mostra carregando durante o envio', async () => {
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
      senha: 'Senha@12',
      passwordConfirm: 'Senha@12'
    });

    fixture.componentInstance.submit();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('ajj-botao ion-spinner')).toBeTruthy();
  });


  describe('regras de senha', () => {
    function criar() {
      const auth = criarAuthService();
      auth.cadastrar.and.returnValue(of(undefined));
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [CadastroComponent], providers: provedoresAuth(auth, criarNotificador()) });
      const fixture = TestBed.createComponent(CadastroComponent);
      fixture.detectChanges();
      return { fixture, auth };
    }
    const preencher = (fixture: ReturnType<typeof criar>['fixture'], senha: string, confirmacao = senha) =>
      fixture.componentInstance.cadastroForm.setValue({
        nome: 'Ana',
        cpf: '529.982.247-25',
        email: 'ana@x.com',
        senha,
        passwordConfirm: confirmacao
      });

    const fracas = ['Senha@1', 'senha@123', 'SENHA@123', 'Senha@abc', 'Senha1234', 'Senha@ 123'];
    fracas.forEach(senha => {
      it(`não envia a senha fraca "${senha}"`, () => {
        const { fixture, auth } = criar();
        preencher(fixture, senha);

        fixture.componentInstance.submit();

        expect(fixture.componentInstance.cadastroForm.controls.senha.hasError('senhaFraca')).toBeTrue();
        expect(auth.cadastrar).not.toHaveBeenCalled();
      });
    });

    it('não envia quando a confirmação é diferente', () => {
      const { fixture, auth } = criar();
      preencher(fixture, 'Senha@123', 'Senha@124');

      fixture.componentInstance.submit();

      expect(auth.cadastrar).not.toHaveBeenCalled();
    });

    it('mostra a lista de regras e marca conforme a digitação', async () => {
      const { fixture } = criar();
      await fixture.whenStable();
      const cumpridas = () => fixture.nativeElement.querySelectorAll('ajj-regras-senha li.cumprida').length;
      expect(fixture.nativeElement.querySelectorAll('ajj-regras-senha li').length).toBe(6);
      expect(cumpridas()).toBe(0);

      const campoSenha: HTMLElement = fixture.nativeElement.querySelector('#senha');
      campoSenha.dispatchEvent(new CustomEvent('ionInput', { detail: { value: 'Senha@123' } }));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(cumpridas()).toBe(6);
    });
  });
});
