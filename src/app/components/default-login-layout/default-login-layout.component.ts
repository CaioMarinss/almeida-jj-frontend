import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-default-login-layout',
  standalone: true,
  templateUrl: './default-login-layout.component.html',
  imports: [],
  styleUrls: ['./default-login-layout.component.scss']  // Adicionei o caminho do CSS aqui
})
export class DefaultLoginLayoutComponent {
  //variaveis q vou receber de quem me usar de layout
  @Input() title: string = "";
  @Input() primeiroBotao: string = "";
  @Input() segundoBotao: string = "";
  

  @Output ("submit") onSubmit = new EventEmitter();
  @Output ("navigate") onNavigate = new EventEmitter();

  submit(){
    this.onSubmit.emit()
  }
  navigate(){
    this.onNavigate.emit()
  }
  }

