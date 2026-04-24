import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './snackbar.html',
  styleUrls: ['./snackbar.css']
})
export class SnackbarComponent {
  message = '';
  visible = false;
  type: 'success' | 'error' | 'info' = 'info';
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.message = message;
    this.type = type;
    this.visible = true;

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.visible = false;
    }, 3000);
  }
}