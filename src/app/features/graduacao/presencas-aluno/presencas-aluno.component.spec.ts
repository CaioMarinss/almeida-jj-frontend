import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MinhasPresencas, PresencaContada } from '../../../shared/presenca/presenca.model';
import { PresencaService } from '../../../shared/presenca/presenca.service';
import { provedoresApp } from '../../testes-app';
import { PresencasAlunoComponent } from './presencas-aluno.component';

function presenca(dia: number): PresencaContada {
  return { data: `2026-11-${String(dia).padStart(2, '0')}`, inicio: '19:00', modalidade: 'GI', origem: 'ALUNO' };
}

describe('PresencasAlunoComponent', () => {
  let doAluno: jasmine.Spy<PresencaService['doAluno']>;
  let fixture: ComponentFixture<PresencasAlunoComponent>;

  const texto = (): string => fixture.nativeElement.textContent ?? '';
  const itens = (): number => fixture.nativeElement.querySelectorAll('li').length;

  function criar(dados: MinhasPresencas): void {
    doAluno = jasmine.createSpy('doAluno').and.returnValue(of(dados));
    TestBed.configureTestingModule({
      imports: [PresencasAlunoComponent],
      providers: [...provedoresApp(), { provide: PresencaService, useValue: { doAluno } }]
    });
    fixture = TestBed.createComponent(PresencasAlunoComponent);
    fixture.componentRef.setInput('idAluno', 7);
    fixture.detectChanges();
  }

  it('busca as presenças do aluno e mostra o ciclo com quanto falta', () => {
    criar({ ciclo: { trilha: 'GRAU', desde: '2026-08-01', ate: '2026-12-14', minimo: 30, contadas: 18 }, presencas: [presenca(3)] });

    expect(doAluno).toHaveBeenCalledWith(7);
    expect(texto()).toContain('18 de 30 presenças até a graduação de 14/12');
    expect(texto()).toContain('Faltam 12');
    expect(texto()).toContain('Ter 03/11');
    expect(texto()).toContain('contada');
  });

  it('quem já atingiu o mínimo não aparece como você', () => {
    criar({ ciclo: { trilha: 'FAIXA', desde: null, ate: '2026-12-14', minimo: 2, contadas: 3 }, presencas: [] });

    expect(texto()).toContain('Já atingiu o mínimo');
    expect(texto()).not.toContain('Você');
  });

  it('sem graduação agendada conta desde a última graduação', () => {
    criar({ ciclo: null, presencas: [presenca(2)] });

    expect(texto()).toContain('1 presença desde a última graduação');
  });

  it('mostra 5 e libera o resto em Ver todas', () => {
    criar({ ciclo: null, presencas: [1, 2, 3, 4, 5, 6, 7].map(presenca) });

    expect(itens()).toBe(5);
    fixture.componentInstance.verTodas();
    fixture.detectChanges();
    expect(itens()).toBe(7);
  });

  it('sem presenças avisa', () => {
    criar({ ciclo: null, presencas: [] });

    expect(texto()).toContain('Nenhuma presença contada desde a última graduação.');
  });

  it('erro mostra tentar de novo e recarrega', () => {
    criar({ ciclo: null, presencas: [] });
    doAluno.and.returnValue(throwError(() => new Error('falha')));
    fixture.componentInstance.carregar();
    fixture.detectChanges();
    expect(texto()).toContain('Não foi possível carregar as presenças.');

    doAluno.and.returnValue(of({ ciclo: null, presencas: [] }));
    fixture.componentInstance.carregar();
    fixture.detectChanges();
    expect(texto()).not.toContain('Não foi possível');
  });
});
