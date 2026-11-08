import { TestBed } from '@angular/core/testing';
import { AulaDoDia } from '../../../shared/agenda/agenda.model';
import { AulaCardComponent } from './aula-card.component';

const BASE: AulaDoDia = {
  id: 1, inicio: '07:10', fim: '08:10', modalidade: 'GI', avulsa: false, motivo: null, cancelada: false, motivoCancelamento: null, vao: 0, euVou: false, janelaFechada: false, podeMarcar: false
};

async function montar(aula: AulaDoDia): Promise<HTMLElement> {
  TestBed.configureTestingModule({ imports: [AulaCardComponent] });
  const fixture = TestBed.createComponent(AulaCardComponent);
  fixture.componentRef.setInput('aula', aula);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture.nativeElement;
}

describe('AulaCardComponent', () => {
  it('mostra horário, fim e modalidade', async () => {
    const el = await montar(BASE);
    expect(el.textContent).toContain('07:10');
    expect(el.textContent).toContain('até 08:10');
    expect(el.querySelector('.chip')?.textContent?.trim()).toBe('Gi');
    expect(el.querySelector('.cancelada')).toBeNull();
  });

  it('cancelada mostra riscado e motivo', async () => {
    const el = await montar({ ...BASE, cancelada: true, motivoCancelamento: 'Professor viajando' });
    expect(el.querySelector('.cancelada')).toBeTruthy();
    expect(el.textContent).toContain('Cancelada · Professor viajando');
  });

  it('cancelada sem motivo mostra só Cancelada', async () => {
    const el = await montar({ ...BASE, cancelada: true });
    expect(el.querySelector('.motivo')?.textContent?.trim()).toBe('Cancelada');
  });

  it('avulsa mostra selo e motivo', async () => {
    const el = await montar({ ...BASE, modalidade: 'NO_GI', avulsa: true, motivo: 'Aulão de férias' });
    expect(el.querySelector('.chip.avulsa')?.textContent?.trim()).toBe('Avulsa');
    expect(el.textContent).toContain('Aulão de férias');
    expect(el.textContent).toContain('No-Gi');
  });
});
