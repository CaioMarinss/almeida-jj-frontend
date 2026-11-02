import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SessionService } from '../../../core/auth/session.service';
import { LayoutAppComponent } from './layout-app.component';

describe('LayoutAppComponent', () => {
  let fixture: ComponentFixture<LayoutAppComponent>;
  let sessao: SessionService;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LayoutAppComponent],
      providers: [provideRouter([])]
    }).compileComponents();
    sessao = TestBed.inject(SessionService);
    sessao.iniciar('TK', { id: 1, nome: 'Bruno', email: 'b@x.com', perfil: 'PROFESSOR' });
    fixture = TestBed.createComponent(LayoutAppComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => sessionStorage.clear());

  it('renderiza o shell da área logada', () => {
    expect(fixture.nativeElement.querySelector('.base-page-shell')).toBeTruthy();
  });

  it('mostra nome e perfil da sessão', () => {
    const texto: string = fixture.nativeElement.textContent;

    expect(texto).toContain('Bruno');
    expect(texto).toContain('Professor');
  });

  it('sair encerra a sessão e navega para o login', async () => {
    const navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    fixture.componentInstance.confirmarSaida();

    expect(sessao.autenticado()).toBeFalse();
    expect(navegar).toHaveBeenCalledWith(['/login']);
  });
});
