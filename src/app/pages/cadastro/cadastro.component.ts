import { Component } from '@angular/core';
import { DefaultLoginLayoutComponent } from '../../components/default-login-layout/default-login-layout.component';
import { PrimeiroInputComponent } from '../../components/primeiro-input/primeiro-input.component';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from '../../services/login.service';
import { ToastrService } from 'ngx-toastr';

interface CadastroForm{
  name:FormControl,
  email:FormControl,
  password: FormControl,
  passwordConfirm:FormControl,

}

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [
    DefaultLoginLayoutComponent,
    PrimeiroInputComponent,
    ReactiveFormsModule,
  ],
  providers:[
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

  ){
    this.cadastroForm = new FormGroup({
      nome: new FormControl('', [Validators.required, Validators.minLength(3)]),
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)]),
      passwordConfirm: new FormControl('', [Validators.required, Validators.minLength(6)])
    })
  }
  submit(){
    this.loginService.login(this.cadastroForm.value.email, this.cadastroForm.value.password).subscribe({
      next: ()=> this.toastr.success("Logado"),
      error: ()=> this.toastr.error('Algo deu errado!')
    })
  }
  navigate(){
    this.router.navigate(["login"])
  }
}
