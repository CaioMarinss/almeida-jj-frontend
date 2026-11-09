import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { MinhasPresencas, PresencaContada } from '../../shared/presenca/presenca.model';
import { PresencaService } from '../../shared/presenca/presenca.service';
import { provedoresApp } from '../testes-app';
import { PresencaComponent } from './presenca.component';

function contada(extra: Partial<PresencaContada> = {}): PresencaContada {
  return { data: '2026-11-06', inicio: '18:00', modalidade: 'GI', origem: 'ALUNO', ...extra };
}

function varias(n: number): PresencaContada[] {
  return Array.from({ length: n }, (_, i) => contada({ data: `2026-10-${String(i + 1).padStart(2, '0')}` }));
}

describe('PresencaComponent', () => {
  let service: jasmine.SpyObj<PresencaService>;
  let fixture: ComponentFixture<PresencaComponent>;

  const el = (): HTMLElement => fixture.nativeElement;
  const texto = (): string => (el().textContent ?? '').replace(/\s+/g, ' ');
  const itens = (): HTMLElement[] => Array.from(el().querySelectorAll<HTMLElement>('.presencas li'));
  const botao = (rotulo: string): HTMLElement | undefined =>
    Array.from(el().querySelectorAll<HTMLElement>('ion-button')).find(b => b.textContent?.trim() === rotulo);

  async function montar(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [PresencaComponent],
      providers: [...provedoresApp(), { provide: PresencaService, useValue: service }]
    });
    fixture = TestBed.createComponent(PresencaComponent);
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    service = jasmine.createSpyObj<PresencaService>('PresencaService', ['minhas']);
  });

  it('mostra o carregando enquanto espera', async () => {
    service.minhas.and.returnValue(new Subject<MinhasPresencas>());
    await montar();

    expect(el().querySelector('ion-spinner')).toBeTruthy();
  });

  it('mostra o ciclo com progresso, faltam, trilha e desde', async () => {
    service.minhas.and.returnValue(
      of({ ciclo: { trilha: 'GRAU', desde: '2026-09-01', ate: '2026-12-14', minimo: 30, contadas: 18 }, presencas: [contada()] })
    );
    await montar();

    expect(texto()).toContain('18 de 30 presenças até a graduação de 14/12');
    expect(texto()).toContain('Faltam 12');
    expect(texto()).toContain('troca de grau');
    expect(texto()).toContain('contando desde 01/09');
    const barra = el().querySelector('[role="progressbar"]')!;
    expect(barra.getAttribute('aria-valuenow')).toBe('18');
    expect(barra.getAttribute('aria-valuemax')).toBe('30');
    expect((el().querySelector('.preenchimento') as HTMLElement).style.width).toBe('60%');
  });

  it('limita a barra a 100% e avisa que atingiu o mínimo', async () => {
    service.minhas.and.returnValue(
      of({ ciclo: { trilha: 'FAIXA', desde: null, ate: '2026-12-14', minimo: 30, contadas: 34 }, presencas: [contada()] })
    );
    await montar();

    expect(texto()).toContain('Você já atingiu o mínimo');
    expect(texto()).not.toContain('Faltam');
    expect(texto()).toContain('troca de faixa');
    expect(texto()).toContain('contando desde o início');
    expect((el().querySelector('.preenchimento') as HTMLElement).style.width).toBe('100%');
  });

  it('avisa quando o mínimo não está definido', async () => {
    service.minhas.and.returnValue(
      of({ ciclo: { trilha: 'GRAU', desde: null, ate: '2026-12-14', minimo: null, contadas: 5 }, presencas: [contada()] })
    );
    await montar();

    expect(texto()).toContain('5 presenças · mínimo não definido');
    expect(el().querySelector('[role="progressbar"]')).toBeNull();
  });

  it('sem graduação agendada mostra o total desde a última graduação', async () => {
    service.minhas.and.returnValue(
      of({ ciclo: { trilha: 'GRAU', desde: '2026-09-01', ate: null, minimo: null, contadas: 7 }, presencas: [contada()] })
    );
    await montar();

    expect(texto()).toContain('7 presenças desde 01/09');
    expect(el().querySelector('[role="progressbar"]')).toBeNull();
  });

  it('sem ciclo mostra o total contado', async () => {
    service.minhas.and.returnValue(of({ ciclo: null, presencas: [contada(), contada({ data: '2026-11-05' })] }));
    await montar();

    expect(texto()).toContain('2 presenças contadas');
  });

  it('lista a presença com dia, hora, modalidade e origem', async () => {
    service.minhas.and.returnValue(
      of({ ciclo: null, presencas: [contada(), contada({ data: '2026-11-05', inicio: '07:10', modalidade: 'NO_GI', origem: 'PROFESSOR' })] })
    );
    await montar();

    expect(itens()[0].textContent).toContain('Sex 06/11');
    expect(itens()[0].textContent).toContain('18:00 Gi');
    expect(itens()[0].textContent).toContain('contada');
    expect(itens()[1].textContent).toContain('Qui 05/11');
    expect(itens()[1].textContent).toContain('07:10 No-Gi');
    expect(itens()[1].textContent).toContain('incluída pelo professor');
  });

  it('mostra as 10 primeiras e expande com Ver todas', async () => {
    service.minhas.and.returnValue(of({ ciclo: null, presencas: varias(14) }));
    await montar();

    expect(itens().length).toBe(10);
    botao('Ver todas')!.click();
    fixture.detectChanges();

    expect(itens().length).toBe(14);
    expect(botao('Ver todas')).toBeUndefined();
  });

  it('não oferece Ver todas com 10 ou menos', async () => {
    service.minhas.and.returnValue(of({ ciclo: null, presencas: varias(10) }));
    await montar();

    expect(botao('Ver todas')).toBeUndefined();
  });

  it('mostra estado vazio sem presenças', async () => {
    service.minhas.and.returnValue(of({ ciclo: null, presencas: [] }));
    await montar();

    expect(texto()).toContain('Nenhuma presença contada ainda');
  });

  it('mostra erro e tenta de novo', async () => {
    service.minhas.and.returnValues(throwError(() => new Error('x')), of({ ciclo: null, presencas: [contada()] }));
    await montar();

    expect(texto()).toContain('Não foi possível carregar suas presenças');
    botao('Tentar de novo')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto()).not.toContain('Não foi possível');
    expect(itens().length).toBe(1);
  });

  it('recarrega ao entrar na aba', async () => {
    service.minhas.and.returnValue(of({ ciclo: null, presencas: [] }));
    await montar();
    fixture.componentInstance.ionViewWillEnter();

    expect(service.minhas).toHaveBeenCalledTimes(2);
  });

  it('limita aria-valuenow ao máximo quando passou do mínimo', async () => {
    service.minhas.and.returnValue(
      of({ ciclo: { trilha: 'FAIXA', desde: null, ate: '2026-12-14', minimo: 30, contadas: 34 }, presencas: [contada()] })
    );
    await montar();

    const barra = el().querySelector('[role="progressbar"]')!;
    expect(barra.getAttribute('aria-valuenow')).toBe('30');
    expect(barra.getAttribute('aria-valuemax')).toBe('30');
  });

  it('mínimo zero usa valuemax 1 e valuenow 1', async () => {
    service.minhas.and.returnValue(
      of({ ciclo: { trilha: 'GRAU', desde: null, ate: '2026-12-14', minimo: 0, contadas: 0 }, presencas: [contada()] })
    );
    await montar();

    const barra = el().querySelector('[role="progressbar"]')!;
    expect(barra.getAttribute('aria-valuenow')).toBe('1');
    expect(barra.getAttribute('aria-valuemax')).toBe('1');
  });
});
