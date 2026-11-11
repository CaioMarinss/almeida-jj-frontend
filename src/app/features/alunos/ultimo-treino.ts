import { ROTULO_PERFIL } from '../../core/auth/usuario';
import { AlunoPainel } from '../../shared/alunos/alunos.model';
import { formatarDiaMes } from '../../shared/graduacao/descrever';

export function textoDoUltimoTreino(aluno: AlunoPainel): string | null {
  if (aluno.perfil !== 'ALUNO') {
    return ROTULO_PERFIL[aluno.perfil];
  }
  if (aluno.sumido) {
    return aluno.diasSemTreinar === null ? 'sumido' : `sumido · ${aluno.diasSemTreinar} dias`;
  }
  const dias = aluno.diasSemTreinar;
  if (dias === null) {
    return null;
  }
  if (dias === 0) {
    return 'treinou hoje';
  }
  return dias === 1 ? 'treinou ontem' : `há ${dias} dias`;
}

export function dataDoUltimoTreino(aluno: AlunoPainel): string {
  if (aluno.diasSemTreinar === null || aluno.ultimaPresenca === null) {
    return '—';
  }
  if (aluno.diasSemTreinar === 0) {
    return 'hoje';
  }
  return aluno.diasSemTreinar === 1 ? 'ontem' : formatarDiaMes(aluno.ultimaPresenca);
}
