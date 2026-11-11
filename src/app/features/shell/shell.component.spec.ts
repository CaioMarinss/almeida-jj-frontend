import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NavController } from '@ionic/angular';
import { SessionService } from '../../core/auth/session.service';
import { Perfil } from '../../core/auth/usuario';
import { ContadoresDonoService } from '../../core/dono/contadores-dono.service';
import { criarNotificador } from '../auth/testes-auth';
import { logar, provedoresApp } from '../testes-app';
import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  const notificador = criarNotificador();
  let fixture: ComponentFixture<ShellComponent>;
  let sessao: SessionService;
  const aptos = signal(0);
  const sumidos = signal(0);
  const atualizar = jasmine.createSpy('atualizar');

  beforeEach(async () => {
    sessionStorage.clear();
    notificador.confirmar.and.resolveTo(true);
    aptos.set(0);
    sumidos.set(0);
    atualizar.calls.reset();
    atualizar.and.resolveTo();
    TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        ...provedoresApp(notificador),
        { provide: ContadoresDonoService, useValue: { aptos, sumidos, atualizar } }
      ]
    });
    sessao = TestBed.inject(SessionService);
    logar(sessao, 'Bruno Lima', 'PROFESSOR');
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => sessionStorage.clear());

  it('mostra nome e perfil da sessão no menu', () => {
    const texto: string = fixture.nativeElement.querySelector('ion-menu').textContent;

    expect(texto).toContain('Bruno Lima');
    expect(texto).toContain('Professor');
  });

  it('mostra Dono para o dono', async () => {
    logar(sessao, 'Carla Dias', 'DONO');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('ion-menu').textContent).toContain('Dono');
  });

  const rotulosMenu = (): string[] =>
    Array.from(fixture.nativeElement.querySelectorAll('ion-menu ion-item')).map(i => (i as HTMLElement).textContent?.trim() ?? '');
  const rotulosAbas = (): string[] =>
    Array.from(fixture.nativeElement.querySelectorAll('ion-tab-button')).map(i => (i as HTMLElement).textContent?.trim() ?? '');
  const entrarComo = async (perfil: Perfil) => {
    logar(sessao, 'Carla Dias', perfil);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('donoVeAbasDeGestao', async () => {
    await entrarComo('DONO');

    expect(rotulosAbas()).toEqual(['Presenças', 'Financeiro', 'Graduação', 'Alunos', 'Perfil']);
    expect(Array.from(fixture.nativeElement.querySelectorAll('ion-tab-button')).map(a => (a as HTMLElement & { tab: string }).tab)).toEqual(['chamada', 'financeiro', 'graduacao', 'alunos', 'perfil']);
    expect(rotulosMenu()).toEqual(['Presenças', 'Financeiro', 'Graduação', 'Alunos', 'Perfil', 'Sair']);
  });

  it('alunoEProfessorVeemAbasAtuais', async () => {
    for (const perfil of ['ALUNO', 'PROFESSOR'] as const) {
      await entrarComo(perfil);

      expect(rotulosAbas()).toEqual(['Início', 'Aulas', 'Presença', 'Financeiro', 'Perfil']);
      expect(rotulosMenu()).toEqual(['Início', 'Aulas', 'Presença', 'Financeiro', 'Perfil', 'Sair']);
      expect(Array.from(fixture.nativeElement.querySelectorAll('ion-tab-button')).map(a => (a as HTMLElement & { tab: string }).tab)).toEqual(['inicio', 'aulas', 'presenca', 'financeiro', 'perfil']);
    }
  });

  it('badgeSoAparecesComContadorMaiorQueZero', async () => {
    await entrarComo('DONO');
    expect(fixture.nativeElement.querySelector('ion-badge')).toBeNull();

    aptos.set(3);
    sumidos.set(1);
    fixture.detectChanges();
    await fixture.whenStable();

    const badges = Array.from(fixture.nativeElement.querySelectorAll('ion-tab-button ion-badge')) as HTMLElement[];
    expect(badges.map(b => b.textContent?.trim())).toEqual(['3', '1']);
    expect(badges.map(b => b.getAttribute('aria-label'))).toEqual(['3 aptos', '1 sumidos']);

    aptos.set(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('ion-tab-button ion-badge').length).toBe(1);
  });

  it('dono atualiza os contadores ao entrar e ao trocar de aba', async () => {
    await entrarComo('DONO');
    const chamadasAoEntrar = atualizar.calls.count();

    expect(chamadasAoEntrar).toBeGreaterThan(0);
    fixture.debugElement.query(By.css('ion-tabs')).triggerEventHandler('ionTabsDidChange', { tab: 'alunos' });

    expect(atualizar.calls.count()).toBe(chamadasAoEntrar + 1);
  });

  it('professor não atualiza os contadores do dono', async () => {
    await entrarComo('PROFESSOR');
    fixture.debugElement.query(By.css('ion-tabs')).triggerEventHandler('ionTabsDidChange', { tab: 'aulas' });

    expect(atualizar).not.toHaveBeenCalled();
  });

  it('sair confirmado encerra a sessão e navega para o login', async () => {
    const navegar = spyOn(TestBed.inject(NavController), 'navigateRoot').and.resolveTo(true);

    await fixture.componentInstance.sair();

    expect(sessao.autenticado()).toBeFalse();
    expect(navegar).toHaveBeenCalledWith('/login');
  });

  it('sair cancelado mantém a sessão', async () => {
    notificador.confirmar.and.resolveTo(false);

    await fixture.componentInstance.sair();

    expect(sessao.autenticado()).toBeTrue();
  });
});
