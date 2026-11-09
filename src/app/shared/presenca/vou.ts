import { AulaDoDia } from '../agenda/agenda.model';

export function textoVao(aula: AulaDoDia): string | null {
  if (aula.cancelada || !(aula.podeMarcar || aula.janelaFechada)) {
    return null;
  }
  if (aula.vao === 0) {
    return null;
  }
  return aula.vao === 1 ? '1 vai' : `${aula.vao} vão`;
}

export function aplicarPresenca(aula: AulaDoDia, euVou: boolean): AulaDoDia {
  return { ...aula, euVou, vao: Math.max(0, aula.vao + (euVou ? 1 : -1)) };
}
