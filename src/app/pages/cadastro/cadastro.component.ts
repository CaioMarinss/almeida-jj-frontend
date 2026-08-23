import { Component } from '@angular/core';
import { DefaultLoginLayoutComponent } from '../../components/default-login-layout/default-login-layout.component';
import { PrimeiroInputComponent } from '../../components/primeiro-input/primeiro-input.component';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [
    DefaultLoginLayoutComponent,
    PrimeiroInputComponent,
    ReactiveFormsModule,
    CommonModule
  ],
  providers: [
    LoginService
  ],
  templateUrl: './cadastro.component.html',
  styleUrl: './cadastro.component.scss'
})
export class CadastroComponent {
  cadastroForm!: FormGroup;

  constructor(
    private router: Router,
    private loginService: LoginService,
    private toastr: ToastrService
  ) {
    this.cadastroForm = new FormGroup({
      nome: new FormControl('', [Validators.required, Validators.minLength(3)]),
      cpf: new FormControl('', [Validators.required, this.cpfValidator()]),
      email: new FormControl('', [Validators.required, Validators.email]),
      senha: new FormControl('', [Validators.required, Validators.minLength(6)]),
      passwordConfirm: new FormControl('', [Validators.required, Validators.minLength(6)])
    }, {
      validators: this.senhasIguaisValidator
    });
  }

  cpfValidator(): ValidatorFn {
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
      if (primeiroDigito === 10) primeiroDigito = 0;

      if (primeiroDigito !== Number(cpf[9])) {
        return { cpfInvalido: true };
      }

      soma = 0;
      for (let indice = 0; indice < 10; indice++) {
        soma += Number(cpf[indice]) * (11 - indice);
      }
      let segundoDigito = (soma * 10) % 11;
      if (segundoDigito === 10) segundoDigito = 0;

      return segundoDigito === Number(cpf[10]) ? null : { cpfInvalido: true };
    };
  }

  senhasIguaisValidator(form: AbstractControl) {
    const senha = form.get('senha')?.value;
    const confirmar = form.get('passwordConfirm')?.value;
  
    return senha === confirmar ? null : { senhasDiferentes: true };
  }
  

  submit() {
    if (this.cadastroForm.valid) {
      const { nome, cpf, email, senha } = this.cadastroForm.value;
      const cpfSemMascara = String(cpf).replace(/\D/g, '');

      this.loginService.cadastrar(nome, cpfSemMascara, email, senha).subscribe({
        next: () => {
          this.toastr.success("Cadastrado com sucesso!");
          this.router.navigate(['/login']);
        },
        error: () => this.toastr.error('Algo deu errado!')
      });
    } else {
      this.toastr.warning('Verifique se os campos do formulário estão preenchidos corretamente.');
      this.cadastroForm.markAllAsTouched();
    }
  }
  

  navigate() {
    this.router.navigate(["login"]);
  }
}
