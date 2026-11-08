import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular';
import { SessionService } from '../../core/auth/session.service';
import { criarNotificador } from '../auth/testes-auth';
import { logar, provedoresApp } from '../testes-app';
import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  const notificador = criarNotificador();
  let fixture: ComponentFixture<ShellComponent>;
  let sessao: SessionService;

  beforeEach(async () => {
    sessionStorage.clear();
    notificador.confirmar.and.resolveTo(true);
    TestBed.configureTestingModule({ imports: [ShellComponent], providers: provedoresApp(notificador) });
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

  it('mostra o item Professores só para o dono', async () => {
    const itemProfessores = () => fixture.nativeElement.querySelector('ion-menu [routerLink="/app/professores"]');
    expect(itemProfessores()).toBeNull();

    logar(sessao, 'Carla Dias', 'DONO');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(itemProfessores()?.textContent).toContain('Professores');
  });

  it('mostra o item Agenda só para o dono, entre Professores e Graduação', async () => {
    const itemAgenda = () => fixture.nativeElement.querySelector('ion-menu [routerLink="/app/agenda"]');
    expect(itemAgenda()).toBeNull();

    logar(sessao, 'Carla Dias', 'DONO');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(itemAgenda()?.textContent).toContain('Agenda');
    const itens = Array.from(fixture.nativeElement.querySelectorAll('ion-menu ion-item')).map(i =>
      (i as HTMLElement).textContent?.trim()
    );
    expect(itens.slice(-5)).toEqual(['Professores', 'Agenda', 'Graduação', 'Perfil', 'Sair']);
  });

  it('no menu lateral, Perfil fica logo acima de Sair, no fim', async () => {
    logar(sessao, 'Carla Dias', 'DONO');
    fixture.detectChanges();
    await fixture.whenStable();

    const itens = Array.from(fixture.nativeElement.querySelectorAll('ion-menu ion-item')).map(i =>
      (i as HTMLElement).textContent?.trim()
    );

    expect(itens.slice(-2)).toEqual(['Perfil', 'Sair']);
  });

  it('tem cinco abas', () => {
    const abas = Array.from(fixture.nativeElement.querySelectorAll('ion-tab-button')).map(
      a => (a as HTMLElement).getAttribute('tab')
    );

    expect(abas).toEqual(['inicio', 'aulas', 'presenca', 'financeiro', 'perfil']);
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
