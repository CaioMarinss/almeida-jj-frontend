import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormGroup, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { NgxMaskDirective } from 'ngx-mask';
import { startWith, switchMap } from 'rxjs';

type TipoCampo = 'text' | 'email' | 'password';

@Component({
  selector: 'app-campo',
  imports: [ReactiveFormsModule, NgxMaskDirective],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CampoComponent), multi: true }],
  templateUrl: './campo.component.html',
  styleUrl: './campo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CampoComponent implements ControlValueAccessor {
  readonly type = input<TipoCampo>('text');
  readonly placeholder = input('');
  readonly label = input('');
  readonly inputName = input('');
  readonly controlName = input('');
  readonly mask = input('');
  readonly formGroup = input.required<FormGroup>();

  readonly value = signal('');

  private readonly eventosDoFormulario = toSignal(
    toObservable(this.formGroup).pipe(switchMap(form => form.events.pipe(startWith(null))))
  );

  readonly mensagemErro = computed(() => {
    this.eventosDoFormulario();
    const form = this.formGroup();
    const controle = form.get(this.controlName());
    if (!controle || (!controle.touched && !controle.dirty)) {
      return '';
    }
    if (controle.hasError('required')) {
      return 'Este campo é obrigatório.';
    }
    if (controle.hasError('email')) {
      return 'Digite um e-mail válido.';
    }
    if (controle.hasError('minlength')) {
      return `Digite pelo menos ${controle.getError('minlength').requiredLength} caracteres.`;
    }
    if (controle.hasError('cpfInvalido')) {
      return 'Digite um CPF válido.';
    }
    if (this.controlName() === 'passwordConfirm' && form.hasError('senhasDiferentes')) {
      return 'As senhas não coincidem.';
    }
    return '';
  });

  private onChange: (valor: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  aoDigitar(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.value.set(valor);
    this.onChange(valor);
  }

  aoSair(): void {
    this.onTouched();
  }

  writeValue(valor: string | null): void {
    this.value.set(valor ?? '');
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
