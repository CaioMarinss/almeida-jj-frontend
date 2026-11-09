import { AulaDoDia } from '../agenda/agenda.model';
import { textoVao } from './vou';

function aula(extra: Partial<AulaDoDia>): AulaDoDia {
  return { id: 1, inicio: '19:00', fim: '20:00', modalidade: 'GI', avulsa: false, motivo: null, cancelada: false, motivoCancelamento: null, vao: 0, euVou: false, janelaFechada: false, podeMarcar: true, ...extra };
}

describe('textoVao', () => {
  it('esconde o contador quando ninguém vai', () => {
    expect(textoVao(aula({ vao: 0 }))).toBeNull();
  });

  it('usa singular e plural', () => {
    expect(textoVao(aula({ vao: 1 }))).toBe('1 vai');
    expect(textoVao(aula({ vao: 4 }))).toBe('4 vão');
  });
});
