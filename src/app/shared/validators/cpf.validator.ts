import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function cpfValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const cpf = String(control.value ?? '').replace(/\D/g, '');

    if (cpf.length !== 11 || /^([0-9])\1{10}$/.test(cpf)) {
      return { cpfInvalido: true };
    }

    let soma = 0;

    for (let indice = 0; indice < 9; indice++) {
      soma += Number(cpf[indice]) * (10 - indice);
    }

    let primeiroDigito = (soma * 10) % 11;

    if (primeiroDigito === 10) {
      primeiroDigito = 0;
    }

    if (primeiroDigito !== Number(cpf[9])) {
      return { cpfInvalido: true };
    }

    soma = 0;

    for (let indice = 0; indice < 10; indice++) {
      soma += Number(cpf[indice]) * (11 - indice);
    }

    let segundoDigito = (soma * 10) % 11;

    if (segundoDigito === 10) {
      segundoDigito = 0;
    }

    return segundoDigito === Number(cpf[10])
      ? null
      : { cpfInvalido: true };
  };
}