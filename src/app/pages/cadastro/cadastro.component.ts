import { Component } from '@angular/core';

import { DefaultLoginLayoutComponent } from '../../components/default-login-layout/default-login-layout.component';
import { PrimeiroInputComponent } from '../../components/primeiro-input/primeiro-input.component';

import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { Router } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { AlertaService } from '../../services/alerta.service';
import { CommonModule } from '@angular/common';

import { cpfValidator } from '../../validators/cpf.validator';
import { normalizarEmail } from '../../utils/email.util';

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
    private alerta: AlertaService
  ) {
    this.cadastroForm = new FormGroup({

      nome: new FormControl('', [
        Validators.required,
        Validators.minLength(3)
      ]),

      cpf: new FormControl('', [
        Validators.required,
        cpfValidator()
      ]),

      email: new FormControl('', [
        Validators.required,
        Validators.email
      ]),

      senha: new FormControl('', [
        Validators.required,
        Validators.minLength(6)
      ]),

      passwordConfirm: new FormControl('', [
        Validators.required,
        Validators.minLength(6)
      ])

    }, {
      validators: this.senhasIguaisValidator
    });
  }

  senhasIguaisValidator(form: any) {
    const senha = form.get('senha')?.value;
    const confirmar = form.get('passwordConfirm')?.value;

    return senha === confirmar
      ? null
      : { senhasDiferentes: true };
  }

  submit() {
    if (this.cadastroForm.valid) {
      const { nome, cpf, email, senha } = this.cadastroForm.value;

      const cpfSemMascara = String(cpf).replace(/\D/g, '');
      const emailNormalizado = normalizarEmail(email);

      this.loginService.cadastrar(
        nome,
        cpfSemMascara,
        emailNormalizado,
        senha
      ).subscribe({
        next: () => {
          this.alerta.success("Cadastrado com sucesso!").then(() => {
            this.router.navigate(['/login']);
          });
        },
        error: (err) => this.alerta.errorFromApi(err)
      });
    } else {
      this.alerta.warning(
        'Verifique se os campos do formulário estão preenchidos corretamente.'
      );
      this.cadastroForm.markAllAsTouched();
    }
  }

  navigate() {
    this.router.navigate(["login"]);
  }
}