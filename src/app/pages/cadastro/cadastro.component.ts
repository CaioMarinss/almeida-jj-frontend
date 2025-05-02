import { Component } from '@angular/core';
import { DefaultLoginLayoutComponent } from '../../components/default-login-layout/default-login-layout.component';
import { PrimeiroInputComponent } from '../../components/primeiro-input/primeiro-input.component';
import { FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
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
      email: new FormControl('', [Validators.required, Validators.email]),
      senha: new FormControl('', [Validators.required, Validators.minLength(6)]),
      passwordConfirm: new FormControl('', [Validators.required, Validators.minLength(6)])
    }, {
      validators: this.senhasIguaisValidator
    });
  }

  senhasIguaisValidator(form: AbstractControl) {
    const senha = form.get('senha')?.value;
    const confirmar = form.get('passwordConfirm')?.value;
  
    return senha === confirmar ? null : { senhasDiferentes: true };
  }
  

  submit() {
    if (this.cadastroForm.valid) {
      const { nome, email, senha } = this.cadastroForm.value;
      this.loginService.cadastrar(nome, email, senha).subscribe({
        next: () => {
          this.toastr.success("Cadastrado com sucesso!");
          this.router.navigate(['/login']);
        },
        error: () => this.toastr.error('Algo deu errado!')
      });
    } else {
      this.toastr.warning('Verifique os campos do formulário.');
      this.cadastroForm.markAllAsTouched();
    }
  }
  

  navigate() {
    this.router.navigate(["login"]);
  }
}
