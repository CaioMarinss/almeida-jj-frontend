import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

export function emailValidator(): ValidatorFn {
  return (controle: AbstractControl): ValidationErrors | null => {
    const valor = typeof controle.value === 'string' ? controle.value.trim() : controle.value;
    return Validators.email({ value: valor } as AbstractControl);
  };
}
