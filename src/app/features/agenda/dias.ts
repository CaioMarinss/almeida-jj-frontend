export const DIAS_SEMANA_LONGOS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

export function artigoDoDia(diaSemana: number): 'na' | 'no' {
  return diaSemana >= 6 ? 'no' : 'na';
}
