import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BasePageComponent } from '../../components/base-page/base-page.component';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule, BasePageComponent],
  templateUrl: './configuracoes.component.html',
  styleUrl: './configuracoes.component.scss'
})
export class ConfiguracoesComponent {
  userName = 'Maria Almeida';
  role = 'Aluno';

  profileImage = 'https://images.unsplash.com/photo-1541534401786-2077eed87a74?auto=format&fit=crop&w=400&q=80';

  editedName = this.userName;

  saveProfile(): void {
    this.userName = this.editedName.trim() || this.userName;
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
