import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular';
import { SessionService } from '../../core/auth/session.service';
import { logar, provedoresApp } from '../testes-app';
import { PerfilComponent } from './perfil.component';

describe('PerfilComponent', () => {
  let componente: PerfilComponent;
  let tela: HTMLElement;

  beforeEach(async () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ imports: [PerfilComponent], providers: provedoresApp() });
    logar(TestBed.inject(SessionService), 'Ana Souza');
    const fixture = TestBed.createComponent(PerfilComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    componente = fixture.componentInstance;
    tela = fixture.nativeElement;
  });

  afterEach(() => sessionStorage.clear());

  it('mostra o chip Dono para o dono', async () => {
    logar(TestBed.inject(SessionService), 'Carla Dias', 'DONO');
    const fixture = TestBed.createComponent(PerfilComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.ajj-chip').textContent).toContain('Dono');
  });

  it('perfilSemBotoesDeGerenciar', async () => {
    logar(TestBed.inject(SessionService), 'Carla Dias', 'DONO');
    const fixture = TestBed.createComponent(PerfilComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('ajj-botao.gerenciar')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Gerenciar');
  });

  it('Trocar senha navega para a tela própria', async () => {
    const navegar = spyOn(TestBed.inject(NavController), 'navigateForward').and.resolveTo(true);

    const item: HTMLElement = tela.querySelector('.trocar-senha')!;
    expect(item.textContent).toContain('Trocar senha');
    await componente.abrirTrocarSenha();

    expect(navegar).toHaveBeenCalledWith('/app/perfil/senha');
  });

  it('mostra identidade com nome e e-mail truncáveis', () => {
    expect(tela.querySelector('.nome')?.classList).toContain('ajj-truncar');
    expect(tela.querySelector('.email')?.classList).toContain('ajj-truncar');
    expect(tela.textContent).toContain('Aluno');
  });
});
