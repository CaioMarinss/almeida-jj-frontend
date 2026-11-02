export function formatarCpf(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  const partes = [digitos.slice(0, 3), digitos.slice(3, 6), digitos.slice(6, 9)].filter(Boolean);
  const verificador = digitos.slice(9, 11);
  return partes.join('.') + (verificador ? `-${verificador}` : '');
}
