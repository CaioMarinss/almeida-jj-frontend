import { AulaDoDia } from '../../shared/agenda/agenda.model';
import { aulaInicial } from './aula-inicial';

function aula(id: number, inicio: string, fim: string, cancelada = false): AulaDoDia {
  return { id, inicio, fim, modalidade: 'GI', avulsa: false, motivo: null, cancelada, motivoCancelamento: null, vao: 0, euVou: false, janelaFechada: false, podeMarcar: false };
}

describe('aulaInicial', () => {
  const aulas = [aula(1, '07:00', '08:00'), aula(2, '12:00', '13:00'), aula(3, '19:00', '20:00')];

  it('antes da primeira aula devolve a primeira', () => {
    expect(aulaInicial(aulas, '05:30')?.id).toBe(1);
  });

  it('durante a terceira devolve a terceira', () => {
    expect(aulaInicial(aulas, '19:30')?.id).toBe(3);
  });

  it('até 30 minutos depois do fim ainda é a mesma aula', () => {
    expect(aulaInicial(aulas, '08:29')?.id).toBe(1);
    expect(aulaInicial(aulas, '08:30')?.id).toBe(2);
  });

  it('depois de todas devolve a última', () => {
    expect(aulaInicial(aulas, '22:00')?.id).toBe(3);
  });

  it('pula as canceladas', () => {
    const lista = [aula(1, '07:00', '08:00', true), aula(2, '12:00', '13:00'), aula(3, '19:00', '20:00', true)];
    expect(aulaInicial(lista, '06:00')?.id).toBe(2);
    expect(aulaInicial(lista, '23:00')?.id).toBe(2);
  });

  it('só canceladas devolve a primeira', () => {
    const lista = [aula(1, '07:00', '08:00', true), aula(2, '12:00', '13:00', true)];
    expect(aulaInicial(lista, '10:00')?.id).toBe(1);
  });

  it('lista vazia devolve null', () => {
    expect(aulaInicial([], '10:00')).toBeNull();
  });
});
