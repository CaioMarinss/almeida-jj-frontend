import { DIAS_SEMANA_CURTOS, diaSemanaIso, formatarDiaMes, inicioDaSemana, somarDias } from './datas';

describe('datas da agenda', () => {
  it('encontra a segunda-feira da semana', () => {
    expect(inicioDaSemana('2026-11-15')).toBe('2026-11-09');
    expect(inicioDaSemana('2026-11-09')).toBe('2026-11-09');
    expect(inicioDaSemana('2026-11-11')).toBe('2026-11-09');
  });

  it('soma dias atravessando o ano', () => {
    expect(somarDias('2026-12-29', 6)).toBe('2027-01-04');
    expect(somarDias('2027-01-04', -6)).toBe('2026-12-29');
  });

  it('calcula o dia da semana de 1 a 7', () => {
    expect(diaSemanaIso('2026-11-09')).toBe(1);
    expect(diaSemanaIso('2026-11-15')).toBe(7);
  });

  it('formata dia e mês', () => {
    expect(formatarDiaMes('2027-01-04')).toBe('04/01');
  });

  it('lista os dias curtos a partir da segunda', () => {
    expect(DIAS_SEMANA_CURTOS).toEqual(['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']);
  });
});
