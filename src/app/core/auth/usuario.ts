export type Perfil = 'ALUNO' | 'PROFESSOR' | 'DONO';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
}

export const ROTULO_PERFIL: Record<Perfil, string> = {
  ALUNO: 'Aluno',
  PROFESSOR: 'Professor',
  DONO: 'Dono'
};
