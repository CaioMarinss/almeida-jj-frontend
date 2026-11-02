import { Component, ChangeDetectionStrategy } from '@angular/core';

import { LayoutAuthComponent } from '../../shared/ui/layout-auth/layout-auth.component';
import { CampoComponent } from '../../shared/ui/campo/campo.component';

import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { Router } from '@angular/router';
import { LoginService } from '../../services/login/login.service';
import { AlertaService } from '../../services/alerta.service';
import { CommonModule } from '@angular/common';

import { cpfValidator } from '../../shared/validators/cpf.validator';
import { normalizarEmail } from '../../shared/utils/email.util';

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [
    LayoutAuthComponent,
    CampoComponent,
    ReactiveFormsModule,
    CommonModule
  ],
  providers: [
    LoginService
  ],
  templateUrl: './cadastro.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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
      this.cadastroForm.markAllAsTouched();
    }
  }

  navigate() {
    this.router.navigate(["login"]);
  }
}