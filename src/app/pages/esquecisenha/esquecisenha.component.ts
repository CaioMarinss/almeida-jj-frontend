import { Component, ChangeDetectionStrategy } from '@angular/core';
import { LayoutAuthComponent } from '../../shared/ui/layout-auth/layout-auth.component';
import { CampoComponent } from '../../shared/ui/campo/campo.component';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertaService } from '../../services/alerta.service';
import { LoginService } from '../../services/login/login.service';

@Component({
  selector: 'app-esquecisenha',
  imports: [
    LayoutAuthComponent,
    CampoComponent,
    ReactiveFormsModule
  ],
  templateUrl: './esquecisenha.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './esquecisenha.component.scss'
})
export class EsqueciSenhaComponent {
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
      this.emailForm.markAllAsTouched();
      return;
    }
  
    this.service.enviarEmailRecuperacao(email).subscribe({
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
