import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SessionService } from '../../core/auth/session.service';
import { GraduacaoService } from '../../shared/graduacao/graduacao.service';
import { logar, provedoresApp } from '../testes-app';
import { InicioComponent } from './inicio.component';

describe('InicioComponent', () => {
  async function renderizar(nome: string, perfil?: 'DONO' | 'PROFESSOR' | 'ALUNO') {
    sessionStorage.clear();
    TestBed.configureTestingModule({ imports: [InicioComponent], providers: [
        ...provedoresApp(),
        { provide: GraduacaoService, useValue: { minha: () => of({ atual: null, historico: [], proxima: null }) } }
      ]
    });
    logar(TestBed.inject(SessionService), nome, perfil);
    const fixture = TestBed.createComponent(InicioComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => sessionStorage.clear());

  it('saúda com o primeiro nome em maiúsculas', async () => {
    const tela = await renderizar('ana souza');

    expect(tela.querySelector('.saudacao-nome')?.textContent?.trim()).toBe('ANA');
    expect(tela.querySelector('.saudacao-nome')?.classList).toContain('ajj-truncar');
  });

  it('não mostra números fictícios', async () => {
    const tela = await renderizar('Ana');

    expect(/\d/.test(tela.querySelector('ion-content')?.textContent ?? '')).toBeFalse();
  });

  it('check-in fica desabilitado até a funcionalidade existir', async () => {
    const tela = await renderizar('Ana');

    expect(tela.querySelector('.checkin ion-button')?.hasAttribute('disabled')).toBeTrue();
  });

  it('dono vê o card Área do dono logo após a saudação', async () => {
    const tela = await renderizar('Carla', 'DONO');

    expect(tela.querySelector('header.saudacao + app-area-dono')).not.toBeNull();
  });

  it('aluno e professor não veem o card', async () => {
    expect((await renderizar('Ana', 'ALUNO')).querySelector('app-area-dono')).toBeNull();
    TestBed.resetTestingModule();
    expect((await renderizar('Pedro', 'PROFESSOR')).querySelector('app-area-dono')).toBeNull();
  });
});
