import { TestBed } from '@angular/core/testing';
import { NavController } from '@ionic/angular';
import { AreaDonoComponent } from './area-dono.component';
import { provedoresApp } from '../../testes-app';

describe('AreaDonoComponent', () => {
  function renderizar() {
    TestBed.configureTestingModule({ imports: [AreaDonoComponent], providers: [...provedoresApp()] });
    const fixture = TestBed.createComponent(AreaDonoComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('mostra o título e os dois botões', () => {
    const tela = renderizar();

    const secao = tela.querySelector('section');
    const titulo = tela.querySelector('#area-dono-titulo');
    expect(secao?.getAttribute('aria-labelledby')).toBe('area-dono-titulo');
    expect(titulo?.textContent?.trim()).toBe('Área do dono');
    expect(tela.querySelector('ajj-botao.professores')?.textContent?.trim()).toBe('Professores');
    expect(tela.querySelector('ajj-botao.graducoes')?.textContent?.trim()).toBe('Graduações');
  });

  it('cada botão navega para a rota certa', async () => {
    TestBed.configureTestingModule({ imports: [AreaDonoComponent], providers: [...provedoresApp()] });
    const fixture = TestBed.createComponent(AreaDonoComponent);
    const navegar = spyOn(TestBed.inject(NavController), 'navigateForward').and.resolveTo(true);

    await fixture.componentInstance.abrirProfessores();
    await fixture.componentInstance.abrirGraduacoes();

    expect(navegar.calls.allArgs()).toEqual([['/app/professores'], ['/app/graduacao']]);
  });
});
