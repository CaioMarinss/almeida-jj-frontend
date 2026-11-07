import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { PaginacaoComponent } from './paginacao.component';

describe('PaginacaoComponent', () => {
  let fixture: ComponentFixture<PaginacaoComponent>;
  let emitidas: number[];

  async function definir(pagina: number, totalPaginas: number): Promise<void> {
    fixture.componentRef.setInput('pagina', pagina);
    fixture.componentRef.setInput('totalPaginas', totalPaginas);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const botoes = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('ion-button'));
  const desabilitado = (el: HTMLElement): boolean => el.hasAttribute('disabled') || (el as HTMLButtonElement & { disabled: boolean }).disabled === true;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PaginacaoComponent], providers: [provideIonicAngular()] });
    fixture = TestBed.createComponent(PaginacaoComponent);
    emitidas = [];
    fixture.componentInstance.paginaChange.subscribe((p: number) => emitidas.push(p));
  });

  it('esconde com 1 página', async () => {
    await definir(1, 1);

    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('Anterior desabilitado na 1ª', async () => {
    await definir(1, 3);

    expect(desabilitado(botoes()[0])).toBeTrue();
    expect(desabilitado(botoes()[1])).toBeFalse();
  });

  it('Próxima desabilitado na última', async () => {
    await definir(3, 3);

    expect(desabilitado(botoes()[0])).toBeFalse();
    expect(desabilitado(botoes()[1])).toBeTrue();
  });

  it('emite pagina + 1 ao clicar em Próxima', async () => {
    await definir(2, 3);

    botoes()[1].click();

    expect(emitidas).toEqual([3]);
  });

  it('emite pagina - 1 ao clicar em Anterior', async () => {
    await definir(2, 3);

    botoes()[0].click();

    expect(emitidas).toEqual([1]);
  });

  it('mostra "Página 2 de 3"', async () => {
    await definir(2, 3);

    const nav = fixture.nativeElement.querySelector('nav');
    const texto = nav.querySelector('[aria-live="polite"]');
    expect(nav.getAttribute('aria-label')).toBe('Paginação');
    expect(texto.textContent.trim()).toBe('Página 2 de 3');
  });
});
