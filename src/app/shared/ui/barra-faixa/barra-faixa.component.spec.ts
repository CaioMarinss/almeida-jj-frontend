import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Faixa } from '../../graduacao/graduacao.model';
import { BarraFaixaComponent } from './barra-faixa.component';

const faixa = (parcial: Partial<Faixa>): Faixa => ({
  id: 1,
  codigo: 'AZ',
  descricao: 'Faixa Azul',
  categoria: 'ADULTO',
  corPrincipal: '#2F64D6',
  corSecundaria: null,
  grauMin: 0,
  grauMax: 4,
  ...parcial
});

describe('BarraFaixaComponent', () => {
  let fixture: ComponentFixture<BarraFaixaComponent>;

  async function renderizar(f: Faixa, grau: number): Promise<void> {
    fixture = TestBed.createComponent(BarraFaixaComponent);
    fixture.componentRef.setInput('faixa', f);
    fixture.componentRef.setInput('grau', grau);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement;
  const listras = () => el().querySelectorAll('.grau').length;

  it('desenha um traço por grau', async () => {
    await renderizar(faixa({}), 2);
    expect(listras()).toBe(2);
  });

  it('infantil desenha até 10 listras', async () => {
    await renderizar(faixa({ codigo: 'VE', descricao: 'Faixa Verde', categoria: 'INFANTIL', grauMax: 10 }), 10);
    expect(listras()).toBe(10);
  });

  it('preta desenha até 6 listras', async () => {
    await renderizar(faixa({ codigo: 'PR', descricao: 'Faixa Preta', grauMax: 6 }), 6);
    expect(listras()).toBe(6);
  });

  it('limita ao máximo da faixa e a zero', async () => {
    await renderizar(faixa({}), 7);
    expect(listras()).toBe(4);

    await renderizar(faixa({}), -1);
    expect(listras()).toBe(0);
  });

  it('coral não desenha listras e usa as duas cores', async () => {
    await renderizar(
      faixa({ categoria: 'MESTRE', corPrincipal: '#D32F2F', corSecundaria: '#111111', grauMin: 7, grauMax: 7 }),
      7
    );
    expect(listras()).toBe(0);
    const blocos = Array.from(el().querySelectorAll<HTMLElement>('.bloco'));
    expect(blocos.length).toBeGreaterThan(1);
    const cores = new Set(blocos.map((b) => b.style.background));
    expect(cores.size).toBe(2);
  });

  it('vermelha de mestre não desenha listras', async () => {
    await renderizar(faixa({ categoria: 'MESTRE', corPrincipal: '#D32F2F', grauMin: 9, grauMax: 10 }), 9);
    expect(listras()).toBe(0);
  });

  it('infantil combinada tem a listra secundária', async () => {
    await renderizar(faixa({ categoria: 'INFANTIL', corPrincipal: '#FFFFFF', corSecundaria: '#111111', grauMax: 10 }), 0);
    expect(el().querySelector('.listra-secundaria')).not.toBeNull();
  });

  it('faixa lisa não tem listra secundária', async () => {
    await renderizar(faixa({}), 0);
    expect(el().querySelector('.listra-secundaria')).toBeNull();
  });

  it('descreve a faixa para leitores de tela', async () => {
    await renderizar(faixa({}), 3);
    expect(el().querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('Faixa Azul · 3 graus');
  });
});
