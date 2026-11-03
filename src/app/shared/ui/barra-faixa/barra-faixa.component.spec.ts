import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarraFaixaComponent } from './barra-faixa.component';

describe('BarraFaixaComponent', () => {
  let fixture: ComponentFixture<BarraFaixaComponent>;

  async function renderizar(graus: number): Promise<void> {
    fixture = TestBed.createComponent(BarraFaixaComponent);
    fixture.componentRef.setInput('cor', '#2F64D6');
    fixture.componentRef.setInput('graus', graus);
    fixture.componentRef.setInput('descricao', 'Faixa azul');
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const listras = () => fixture.nativeElement.querySelectorAll('.grau').length;

  it('desenha um traço por grau', async () => {
    await renderizar(2);

    expect(listras()).toBe(2);
  });

  it('limita os graus entre 0 e 4', async () => {
    await renderizar(7);
    expect(listras()).toBe(4);

    await renderizar(-1);
    expect(listras()).toBe(0);
  });

  it('descreve a faixa para leitores de tela', async () => {
    await renderizar(3);

    expect(fixture.nativeElement.querySelector('[role="img"]').getAttribute('aria-label')).toBe('Faixa azul, 3 graus');
  });
});
