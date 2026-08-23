import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, FormGroup, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { NgxMaskDirective } from 'ngx-mask';

type InputTypes = "text" | "email" |"password"

@Component({
  selector: 'app-primeiro-input',
  standalone: true, 
  imports: [
    ReactiveFormsModule,
    NgxMaskDirective
  ],
  providers:[
    {
      provide:NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PrimeiroInputComponent),
      multi: true
    }
  ],
  templateUrl: './primeiro-input.component.html',
  styleUrl: './primeiro-input.component.scss'
})
export class PrimeiroInputComponent implements ControlValueAccessor{
  
  @Input() type: InputTypes = "text";
  @Input() placeholder: string = "";
  @Input() label: string = "";
  @Input() inputName: string = "";
  @Input() controlName: string = "";
  @Input() mask: string = '';

  @Input() formGroup!: FormGroup;
  value: string ='';
  onChange:any = () => {}
  onTouched:any = () => {}

  onInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.value = value;
    this.onChange(value);
  }

  get errorMessage(): string {
    const control = this.formGroup?.get(this.controlName);

    if (!control || (!control.touched && !control.dirty)) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Este campo é obrigatório.';
    }

    if (control.hasError('email')) {
      return 'Digite um e-mail válido.';
    }

    if (control.hasError('minlength')) {
      const requiredLength = control.getError('minlength').requiredLength;
      return `Digite pelo menos ${requiredLength} caracteres.`;
    }

    if (control.hasError('cpfInvalido')) {
      return 'Digite um CPF válido.';
    }

    if (this.controlName === 'passwordConfirm'
      && this.formGroup.hasError('senhasDiferentes')) {
      return 'As senhas não coincidem.';
    }

    return '';
  }

  onBlur(): void {
    this.onTouched();
  }
  writeValue(value: any): void {
    this.value = value
  }
  registerOnChange(fn: any): void {
    this.onChange = fn
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {}
}
