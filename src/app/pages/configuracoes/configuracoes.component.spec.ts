import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfiguracoesComponent } from './configuracoes.component';
import { LoginService } from '../../services/login.service';
import { AlertaService } from '../../services/alerta.service';
import { of } from 'rxjs';

describe('ConfiguracoesComponent', () => {
  let component: ConfiguracoesComponent;
  let fixture: ComponentFixture<ConfiguracoesComponent>;
  let loginService: jasmine.SpyObj<LoginService>;
  let alertaService: jasmine.SpyObj<AlertaService>;

  beforeEach(async () => {
    loginService = jasmine.createSpyObj('LoginService', ['resetSenha']);
    alertaService = jasmine.createSpyObj('AlertaService', ['success', 'errorFromApi']);

    await TestBed.configureTestingModule({
      imports: [ConfiguracoesComponent],
      providers: [
        { provide: LoginService, useValue: loginService },
        { provide: AlertaService, useValue: alertaService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfiguracoesComponent);
    component = fixture.componentInstance;
    sessionStorage.setItem('auth-token', 'abc.123');
    sessionStorage.setItem('username', 'Maria Almeida');
    loginService.resetSenha.and.returnValue(of({}));
    alertaService.success.and.returnValue(Promise.resolve());
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should request password reset through the same endpoint when confirming password change', () => {
    component.email = 'maria@almeida.com';
    component.newPassword = 'NovaSenha123';
    component.confirmPassword = 'NovaSenha123';

    component.confirmPasswordChange();

    expect(loginService.resetSenha).toHaveBeenCalledWith(
      'maria@almeida.com',
      'NovaSenha123',
      'abc.123'
    );
  });
});
