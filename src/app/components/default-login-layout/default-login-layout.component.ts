import { Component, Input } from '@angular/core';

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

  }

