import { Component } from '@angular/core';
import { DefaultLoginLayoutComponent } from '../../components/default-login-layout/default-login-layout.component';
import { PrimeiroInputComponent } from '../../components/primeiro-input/primeiro-input.component';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertaService } from '../../services/alerta.service';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-verificaremail',
  imports: [
    DefaultLoginLayoutComponent,
    PrimeiroInputComponent,
    ReactiveFormsModule
  ],
  templateUrl: './verificaremail.component.html',
  styleUrl: './verificaremail.component.scss'
})
export class VerificarEmailComponent {
  emailForm!: FormGroup;
  constructor(
    private router: Router,
    private service: LoginService,
    private alerta: AlertaService
  ){
    this.emailForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
    })
  }

  submit() {
    const email = this.emailForm.value.email;
  
    if (!email || this.emailForm.invalid) {
      this.alerta.error('Digite um e-mail válido.');
      return;
    }
  
    this.service.enviarEmailVerificacao(email).subscribe({
      next: () => {
        this.alerta.success("Email enviado com sucesso!").then(() => {
          this.router.navigate(['/login']);
        });
      },
      error: (err) => this.alerta.errorFromApi(err)
    });
  }
  
  
  navigate(){
    this.router.navigate(["/login"])
  }

}
