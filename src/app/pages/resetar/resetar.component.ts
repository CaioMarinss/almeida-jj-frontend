import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginService } from '../../services/login.service';
import { PrimeiroInputComponent } from '../../components/primeiro-input/primeiro-input.component';
import { DefaultLoginLayoutComponent } from '../../components/default-login-layout/default-login-layout.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-resetar',
  templateUrl: './resetar.component.html',
  styleUrls: ['./resetar.component.scss'],
  imports: [
    DefaultLoginLayoutComponent,
    PrimeiroInputComponent,
    ReactiveFormsModule
  ]
})
export class ResetarComponent implements OnInit {

  formSenha: FormGroup;
  token!: string;
  email!: string;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private loginService: LoginService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.formSenha = this.fb.group({
      novaSenha: ['', [Validators.required, Validators.minLength(6)]],
      confirmarSenha: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      this.email = params['email'];
    });
  }

  submit() {
    if (this.formSenha.invalid || this.formSenha.value.novaSenha !== this.formSenha.value.confirmarSenha) {
      this.toastr.error('Algo deu errado, revise as informações.');
      return;
    }

    const novaSenha = this.formSenha.value.novaSenha;

    this.loginService.resetSenha(this.email, novaSenha, this.token).subscribe({
      next: (response: any) => {
        console.log('Resposta da API:', response);
        this.toastr.success('Senha redefinida com sucesso!');
        this.router.navigate(['login'])
      },
      error: (err) => {
        console.error('Erro na API:', err);
        this.toastr.error("Erro ao redefinir a senha.");
      }
    });
    
  }

  navigate(){
    this.router.navigate(["/login"])
  }
}
