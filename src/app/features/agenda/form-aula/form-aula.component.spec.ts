import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AulaGrade, EdicaoAula } from '../../../shared/agenda/agenda.model';
import { provedoresApp } from '../../testes-app';
import { FormAulaComponent } from './form-aula.component';

describe('FormAulaComponent', () => {
  let fixture: ComponentFixture<FormAulaComponent>;
  let salvos: EdicaoAula[];
  let tirados: number;

  const el = (): HTMLElement => fixture.nativeElement;

  function montar(aula: AulaGrade | null, diaSemana = 1): void {
    TestBed.configureTestingModule({ imports: [FormAulaComponent], providers: provedoresApp() });
    fixture = TestBed.createComponent(FormAulaComponent);
    fixture.componentRef.setInput('aula', aula);
    fixture.componentRef.setInput('diaSemana', diaSemana);
    salvos = [];
    tirados = 0;
    fixture.componentInstance.salvar.subscribe(v => salvos.push(v));
    fixture.componentInstance.tirar.subscribe(() => tirados++);
    fixture.detectChanges();
  }

  function preencher(inicio: string, fim: string): void {
    const i = el().querySelector<HTMLInputElement>('#aula-inicio')!;
    const f = el().querySelector<HTMLInputElement>('#aula-fim')!;
    i.value = inicio;
    i.dispatchEvent(new Event('input'));
    f.value = fim;
    f.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('nova aula: mostra o dia fixo, sem campo de dia, e não oferece tirar da grade', () => {
    montar(null, 2);

    expect(el().textContent).toContain('Nova aula · terça');
    expect(el().querySelector('select, #aula-dia')).toBeNull();
    expect(el().querySelector('.tirar')).toBeNull();
  });

  it('emite início, fim e modalidade em HH:mm', () => {
    montar(null);
    preencher('19:30', '20:30');
    el().querySelector<HTMLButtonElement>('button[data-modalidade="KIDS"]')!.click();
    fixture.detectChanges();

    el().querySelector<HTMLElement>('.salvar ion-button')!.click();

    expect(salvos).toEqual([{ inicio: '19:30', fim: '20:30', modalidade: 'KIDS' }]);
  });

  it('fim igual ou antes do início bloqueia e mostra o erro', () => {
    montar(null);
    preencher('10:00', '09:00');

    el().querySelector<HTMLElement>('.salvar ion-button')!.click();
    fixture.detectChanges();

    expect(salvos).toEqual([]);
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('O fim deve ser depois do início.');

    preencher('10:00', '10:00');
    el().querySelector<HTMLElement>('.salvar ion-button')!.click();
    expect(salvos).toEqual([]);
  });

  it('editar: preenche os valores, mostra Tirar da grade e emite', () => {
    montar({ id: 7, diaSemana: 1, inicio: '07:10', fim: '08:10', modalidade: 'NO_GI' });

    expect(el().textContent).toContain('Editar aula · segunda');
    expect(el().querySelector<HTMLInputElement>('#aula-inicio')!.value).toBe('07:10');
    el().querySelector<HTMLElement>('.salvar ion-button')!.click();
    expect(salvos).toEqual([{ inicio: '07:10', fim: '08:10', modalidade: 'NO_GI' }]);

    el().querySelector<HTMLElement>('.tirar ion-button')!.click();
    expect(tirados).toBe(1);
  });
});
