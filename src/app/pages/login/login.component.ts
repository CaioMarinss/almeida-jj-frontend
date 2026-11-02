import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LayoutAuthComponent } from '../../shared/ui/layout-auth/layout-auth.component';
import { CampoComponent } from '../../shared/ui/campo/campo.component';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../../services/login/login.service';
import { AlertaService } from '../../services/alerta.service';

interface loginForm {
  email: FormControl,
  senha: FormControl
}
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    LayoutAuthComponent,
    CampoComponent,
    ReactiveFormsModule,
  ],
  providers: [
    LoginService
  ],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm!: FormGroup;
  constructor(
    private router: Router,
    private loginService: LoginService,
    private alerta: AlertaService
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
        this.alerta.success("Logado com sucesso!").then(() => {
          this.router.navigate(['/dashboard']);
        });
      },
      error: (err) => {
        this.alerta.errorFromApi(err);
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
