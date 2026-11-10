import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Sumidos } from '../../shared/presenca/presenca.model';
import { PresencaService } from '../../shared/presenca/presenca.service';
import { provedoresApp } from '../testes-app';
import { SumidosComponent } from './sumidos.component';

describe('SumidosComponent', () => {
  let sumidos: jasmine.Spy<PresencaService['sumidos']>;
  let fixture: ComponentFixture<SumidosComponent>;

  const texto = (): string => fixture.nativeElement.textContent ?? '';

  function criar(dados: Sumidos): void {
    sumidos = jasmine.createSpy('sumidos').and.returnValue(of(dados));
    TestBed.configureTestingModule({
      imports: [SumidosComponent],
      providers: [...provedoresApp(), { provide: PresencaService, useValue: { sumidos } }]
    });
    fixture = TestBed.createComponent(SumidosComponent);
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
  }

  it('lista os sumidos com o último treino e há quantos dias', () => {
    criar({
      dias: 14,
      alunos: [
        { id: 3, nome: 'Ana Souza', ultimaPresenca: '2026-10-01', diasSemTreinar: 39 },
        { id: 4, nome: 'Bia Lima', ultimaPresenca: '2026-10-20', diasSemTreinar: 20 }
      ]
    });

    const linhas = Array.from(fixture.nativeElement.querySelectorAll('li.sumido')).map(l => (l as HTMLElement).textContent ?? '');
    expect(linhas.length).toBe(2);
    expect(linhas[0]).toContain('Ana Souza');
    expect(linhas[0]).toContain('Último treino 01/10 · há 39 dias');
    expect(texto()).toContain('2 alunos');
    expect(texto()).toContain('há 14 dias ou mais');
  });

  it('sem ninguém sumido mostra o estado vazio', () => {
    criar({ dias: 14, alunos: [] });

    expect(texto()).toContain('Ninguém sumido');
  });

  it('erro mostra tentar de novo e recarrega', () => {
    criar({ dias: 14, alunos: [] });
    sumidos.and.returnValue(throwError(() => new Error('falha')));
    fixture.componentInstance.carregar();
    fixture.detectChanges();
    expect(texto()).toContain('Não foi possível carregar os alunos');

    sumidos.and.returnValue(of({ dias: 14, alunos: [{ id: 3, nome: 'Ana', ultimaPresenca: '2026-10-01', diasSemTreinar: 39 }] }));
    fixture.componentInstance.carregar();
    fixture.detectChanges();
    expect(texto()).toContain('1 aluno');
  });
});
