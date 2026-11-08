import { TestBed } from '@angular/core/testing';
import { AulaDoDia } from '../../../shared/agenda/agenda.model';
import { AulaCardComponent } from './aula-card.component';

const BASE: AulaDoDia = {
  id: 1, inicio: '07:10', fim: '08:10', modalidade: 'GI', avulsa: false, motivo: null, cancelada: false, motivoCancelamento: null, vao: 0, euVou: false, janelaFechada: false, podeMarcar: false
};

async function montar(aula: AulaDoDia, salvando = false): Promise<HTMLElement> {
  TestBed.configureTestingModule({ imports: [AulaCardComponent] });
  const fixture = TestBed.createComponent(AulaCardComponent);
  fixture.componentRef.setInput('aula', aula);
  fixture.componentRef.setInput('salvando', salvando);
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

  describe('presença', () => {
    const ABERTA: AulaDoDia = { ...BASE, inicio: '18:00', vao: 12, podeMarcar: true };
    const botao = (el: HTMLElement): HTMLButtonElement | null => el.querySelector<HTMLButtonElement>('button.vou');

    it('mostra Vou não marcado, com contador', async () => {
      const el = await montar(ABERTA);
      expect(botao(el)?.textContent?.trim()).toBe('Vou');
      expect(botao(el)?.getAttribute('aria-pressed')).toBe('false');
      expect(botao(el)?.getAttribute('aria-label')).toBe('Vou na aula das 18:00');
      expect(el.querySelector('.contador')?.textContent?.trim()).toBe('12 vão');
    });

    it('mostra ✓ Vou quando marcado', async () => {
      const el = await montar({ ...ABERTA, euVou: true });
      expect(botao(el)?.textContent?.trim()).toBe('✓ Vou');
      expect(botao(el)?.getAttribute('aria-pressed')).toBe('true');
    });

    it('usa singular com 1 pessoa', async () => {
      const el = await montar({ ...ABERTA, vao: 1 });
      expect(el.querySelector('.contador')?.textContent?.trim()).toBe('1 vai');
    });

    it('emite alternar ao tocar', async () => {
      TestBed.configureTestingModule({ imports: [AulaCardComponent] });
      const fixture = TestBed.createComponent(AulaCardComponent);
      fixture.componentRef.setInput('aula', ABERTA);
      fixture.detectChanges();
      const emitido: AulaDoDia[] = [];
      fixture.componentInstance.alternar.subscribe(a => emitido.push(a));
      botao(fixture.nativeElement)!.click();
      expect(emitido).toEqual([ABERTA]);
    });

    it('desabilita o botão enquanto salva', async () => {
      const el = await montar(ABERTA, true);
      expect(botao(el)?.disabled).toBeTrue();
    });

    it('após a janela mostra Presença contada se marcou', async () => {
      const el = await montar({ ...BASE, janelaFechada: true, euVou: true, vao: 3 });
      expect(botao(el)).toBeNull();
      expect(el.querySelector('.situacao')?.textContent?.trim()).toBe('Presença contada');
      expect(el.querySelector('.contador')?.textContent?.trim()).toBe('3 vão');
    });

    it('após a janela mostra Janela fechada se não marcou', async () => {
      const el = await montar({ ...BASE, janelaFechada: true });
      expect(el.querySelector('.situacao')?.textContent?.trim()).toBe('Janela fechada');
    });

    it('semana futura não mostra botão, situação nem contador', async () => {
      const el = await montar(BASE);
      expect(botao(el)).toBeNull();
      expect(el.querySelector('.situacao')).toBeNull();
      expect(el.querySelector('.contador')).toBeNull();
    });

    it('cancelada não mostra botão nem contador', async () => {
      const el = await montar({ ...ABERTA, cancelada: true });
      expect(botao(el)).toBeNull();
      expect(el.querySelector('.situacao')).toBeNull();
      expect(el.querySelector('.contador')).toBeNull();
    });
  });
});
