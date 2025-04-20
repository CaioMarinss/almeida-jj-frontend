import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, FormGroup, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

type InputTypes = "text" | "email" |"password"

@Component({
  selector: 'app-primeiro-input',
  standalone: true, 
  imports: [
    ReactiveFormsModule
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

  @Input() formGroup!: FormGroup;
  value: string ='';
  onChange:any = () => {}
  onTouched:any = () => {}

  onInput(event: Event){
    const value = (event.target as HTMLInputElement).value
    this.onChange(value)
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
