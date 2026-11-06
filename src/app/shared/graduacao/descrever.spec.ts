import { Faixa } from './graduacao.model';
import { descreverGraduacao, descreverGrau, formatarDiaMes, formatarMesAno, hojeEmSaoPaulo } from './descrever';

const faixa = (descricao: string, categoria: Faixa['categoria']): Faixa => ({
  id: 1,
  codigo: 'X',
  descricao,
  categoria,
  corPrincipal: '#000',
  corSecundaria: null,
  grauMin: 0,
  grauMax: 4
});

describe('descrever', () => {
  it('descreve graus no plural, singular e zero', () => {
    const azul = faixa('Faixa Azul', 'ADULTO');
    expect(descreverGraduacao(azul, 2)).toBe('Faixa Azul · 2 graus');
    expect(descreverGraduacao(azul, 1)).toBe('Faixa Azul · 1 grau');
    expect(descreverGraduacao(azul, 0)).toBe('Faixa Azul · sem graus');
  });

  it('descreve o grau de mestre', () => {
    expect(descreverGraduacao(faixa('Faixa Vermelha', 'MESTRE'), 9)).toBe('Faixa Vermelha · 9º grau');
  });

  it('descreve só o grau', () => {
    expect(descreverGrau(faixa('Faixa Azul', 'ADULTO'), 0)).toBe('sem graus');
    expect(descreverGrau(faixa('Faixa Vermelha', 'MESTRE'), 9)).toBe('9º grau');
  });

  describe('hojeEmSaoPaulo', () => {
    afterEach(() => jasmine.clock().uninstall());

    it('usa a data de São Paulo, não a de UTC', () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date('2026-11-11T01:00:00Z'));
      expect(hojeEmSaoPaulo()).toBe('2026-11-10');
    });

    it('vira o dia às 03:00 UTC', () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date('2026-11-11T02:59:00Z'));
      expect(hojeEmSaoPaulo()).toBe('2026-11-10');
      jasmine.clock().mockDate(new Date('2026-11-11T03:00:00Z'));
      expect(hojeEmSaoPaulo()).toBe('2026-11-11');
    });
  });

  it('formata datas sem usar fuso', () => {
    expect(formatarDiaMes('2026-12-14')).toBe('14/12');
    expect(formatarMesAno('2026-03-01')).toBe('03/2026');
  });
});
