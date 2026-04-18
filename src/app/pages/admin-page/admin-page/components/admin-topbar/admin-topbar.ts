import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-topbar.html',
  styleUrls: ['./admin-topbar.css'],
})
export class AdminTopbar {
  @Input() username = 'Admin';
  @Input() pageTitle = 'Dashboard';

  @Output() menuToggle = new EventEmitter<void>();

  onMenuToggle(): void {
    this.menuToggle.emit();
  }
}