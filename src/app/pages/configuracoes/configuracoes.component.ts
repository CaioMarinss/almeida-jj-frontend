import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BasePageComponent } from '../../components/base-page/base-page.component';
import { ConfirmPopupComponent } from '../../components/confirm-popup/confirm-popup.component';
import { AlertaService } from '../../services/alerta.service';
import { LoginService } from '../../services/login.service';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule, BasePageComponent, ConfirmPopupComponent],
  templateUrl: './configuracoes.component.html',
  styleUrl: './configuracoes.component.scss'
})
export class ConfiguracoesComponent {
  userName = sessionStorage.getItem('username') || 'Maria Almeida';
  role = 'Aluno';
  profileImage = 'https://images.unsplash.com/photo-1541534401786-2077eed87a74?auto=format&fit=crop&w=400&q=80';
  email = 'maria@almeida.com';
  editedName = this.userName;
  newPassword = '';
  confirmPassword = '';
  showPasswordPopup = false;

  constructor(
    private loginService: LoginService,
    private alertaService: AlertaService
  ) {}

  saveProfile(): void {
    const hasPasswordChange = !!this.newPassword || !!this.confirmPassword;

    if (hasPasswordChange) {
      if (!this.newPassword || !this.confirmPassword) {
        this.alertaService.warning('Preencha a nova senha e a confirmação.');
        return;
      }

      if (this.newPassword.length < 6) {
        this.alertaService.warning('A nova senha deve ter pelo menos 6 caracteres.');
        return;
      }

      if (this.newPassword !== this.confirmPassword) {
        this.alertaService.warning('As senhas não coincidem.');
        return;
      }

      this.showPasswordPopup = true;
      return;
    }

    this.userName = this.editedName.trim() || this.userName;
    sessionStorage.setItem('username', this.userName);
    this.alertaService.success('Alterações salvas com sucesso!');
  }

  closePasswordPopup(): void {
    this.showPasswordPopup = false;
  }

  confirmPasswordChange(): void {
    const token = sessionStorage.getItem('auth-token');

    this.userName = this.editedName.trim() || this.userName;
    sessionStorage.setItem('username', this.userName);

    if (!token) {
      this.showPasswordPopup = false;
      this.alertaService.error('Sessão expirada. Faça login novamente.');
      return;
    }

    this.loginService.resetSenha(this.email, this.newPassword, token).subscribe({
      next: () => {
        this.showPasswordPopup = false;
        this.newPassword = '';
        this.confirmPassword = '';
        this.alertaService.success('Alterações salvas com sucesso!');
      },
      error: (error) => {
        this.showPasswordPopup = false;
        this.alertaService.errorFromApi(error, 'Erro ao alterar a senha.');
      }
    });
  }

  onImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) {
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      this.profileImage = reader.result as string;
    };

    reader.readAsDataURL(file);
  }
}
