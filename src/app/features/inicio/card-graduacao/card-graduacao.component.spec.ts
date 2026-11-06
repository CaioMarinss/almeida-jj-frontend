import { TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { Observable, of, throwError } from 'rxjs';
import { Faixa, MinhaGraduacao, RegistroGraduacao } from '../../../shared/graduacao/graduacao.model';
import { GraduacaoService } from '../../../shared/graduacao/graduacao.service';
import { CardGraduacaoComponent } from './card-graduacao.component';

const AZUL: Faixa = {
  id: 2,
  codigo: 'AZUL',
  descricao: 'Faixa Azul',
  categoria: 'ADULTO',
  corPrincipal: '#1565C0',
  corSecundaria: null,
  grauMin: 0,
  grauMax: 4
};

function registro(id: number, grau: number, data: string): RegistroGraduacao {
  return { id, faixa: AZUL, grau, data };
}

function dados(parcial: Partial<MinhaGraduacao> = {}): MinhaGraduacao {
  return { atual: { faixa: AZUL, grau: 2 }, historico: [], proxima: null, ...parcial };
}

async function esperarAte(condicao: () => boolean): Promise<void> {
  for (let i = 0; i < 50 && !condicao(); i++) {
    await new Promise(r => setTimeout(r, 20));
  }
}

describe('CardGraduacaoComponent', () => {
  let minha: jasmine.Spy<() => Observable<MinhaGraduacao>>;

  async function renderizar(resposta: Observable<MinhaGraduacao>) {
    minha = jasmine.createSpy('minha').and.returnValue(resposta);
    TestBed.configureTestingModule({
      imports: [CardGraduacaoComponent],
      providers: [provideIonicAngular(), { provide: GraduacaoService, useValue: { minha } }]
    });
    const fixture = TestBed.createComponent(CardGraduacaoComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  function botao(el: HTMLElement, texto: string): HTMLElement | undefined {
    return Array.from(el.querySelectorAll<HTMLElement>('ion-button')).find(b =>
      b.textContent?.includes(texto)
    );
  }

  it('mostra a barra e a descrição da faixa atual', async () => {
    const { el } = await renderizar(of(dados()));

    expect(el.querySelector('ajj-barra-faixa')).toBeTruthy();
    expect(el.textContent).toContain('Faixa Azul · 2 graus');
  });

  it('mostra a data da próxima graduação', async () => {
    const { el } = await renderizar(of(dados({ proxima: '2026-12-14' })));

    expect(el.textContent).toContain('Próxima graduação: 14/12');
  });

  it('avisa quando não há data definida', async () => {
    const { el } = await renderizar(of(dados()));

    expect(el.textContent).toContain('Sem data definida para a próxima graduação');
  });

  it('sem graduação mostra o estado vazio e a linha da próxima graduação', async () => {
    const { el } = await renderizar(of(dados({ atual: null, proxima: '2026-12-14' })));

    expect(el.querySelector('ajj-barra-faixa')).toBeNull();
    expect(el.textContent).toContain('Sem graduação');
    expect(el.textContent).toContain('Quando sua graduação for registrada, você acompanha a evolução por aqui.');
    expect(el.textContent).toContain('Próxima graduação: 14/12');
  });

  it('com mais de 3 registros mostra 3 e abre o histórico completo', async () => {
    const historico = [
      registro(4, 2, '2026-06-10'),
      registro(3, 1, '2026-03-10'),
      registro(2, 0, '2025-12-10'),
      registro(1, 4, '2025-06-10')
    ];
    const { fixture, el } = await renderizar(of(dados({ historico })));

    expect(el.querySelectorAll('.evolucao li').length).toBe(3);
    expect(el.textContent).toContain('Azul · 2 graus — 06/2026');
    expect(el.textContent).toContain('Azul · 1 grau — 03/2026');
    expect(el.textContent).toContain('Azul · sem graus — 12/2025');
    expect(el.textContent).not.toContain('0 graus');

    botao(el, 'Ver histórico completo')?.click();
    fixture.detectChanges();
    await esperarAte(() => document.querySelectorAll('ion-modal li').length > 0);

    expect(document.querySelectorAll('ion-modal li').length).toBe(4);
  });

  it('com 3 registros não mostra o link do histórico completo', async () => {
    const historico = [registro(3, 2, '2026-06-10'), registro(2, 1, '2026-03-10'), registro(1, 0, '2025-12-10')];
    const { el } = await renderizar(of(dados({ historico })));

    expect(el.querySelectorAll('.evolucao li').length).toBe(3);
    expect(botao(el, 'Ver histórico completo')).toBeUndefined();
  });

  it('no erro mostra mensagem e tenta de novo', async () => {
    const { fixture, el } = await renderizar(throwError(() => new Error('falha')));

    expect(el.textContent).toContain('Não foi possível carregar sua graduação');
    expect(minha).toHaveBeenCalledTimes(1);

    minha.and.returnValue(of(dados()));
    botao(el, 'Tentar de novo')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(minha).toHaveBeenCalledTimes(2);
    expect(el.textContent).toContain('Faixa Azul · 2 graus');
  });
});
