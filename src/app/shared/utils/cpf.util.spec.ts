import { formatarCpf } from './cpf.util';

describe('formatarCpf', () => {
  it('formata progressivamente', () => {
    expect(formatarCpf('')).toBe('');
    expect(formatarCpf('529')).toBe('529');
    expect(formatarCpf('5299')).toBe('529.9');
    expect(formatarCpf('5299822')).toBe('529.982.2');
    expect(formatarCpf('5299822472')).toBe('529.982.247-2');
    expect(formatarCpf('52998224725')).toBe('529.982.247-25');
  });

  it('ignora letras e símbolos', () => {
    expect(formatarCpf('529.982-ab247 25')).toBe('529.982.247-25');
  });

  it('corta em 11 dígitos', () => {
    expect(formatarCpf('5299822472599')).toBe('529.982.247-25');
  });
});
