import { Component } from '@angular/core';
import { DefaultLoginLayoutComponent } from '../../components/default-login-layout/default-login-layout.component';
import { PrimeiroInputComponent } from '../../components/primeiro-input/primeiro-input.component';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { ToastrService } from 'ngx-toastr';

interface loginForm {
  email: FormControl,
  senha: FormControl
}
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    DefaultLoginLayoutComponent,
    PrimeiroInputComponent,
    ReactiveFormsModule,
  ],
  providers: [
    LoginService
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm!: FormGroup;
  constructor(
    private router: Router,
    private loginService: LoginService,
    private toastr: ToastrService
  ) {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      senha: new FormControl('', [Validators.required, Validators.minLength(6)])
    })
  }
  submit() {
    const { email, senha } = this.loginForm.value;

    this.loginService.login(email, senha).subscribe({
      next: () => {
        this.toastr.success("Logado com sucesso!");
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        const mensagem = err.error?.erro || 'Algo deu errado!';
        this.toastr.error(mensagem);
      }
    });
  }

  esqueciSenha() {
    this.router.navigate(["/esquecisenha"])
  }
  verificarEmail() {
    this.router.navigate(["/verificaremail"])
  }
  navigate() {
    this.router.navigate(["/cadastro"])
  }
}
