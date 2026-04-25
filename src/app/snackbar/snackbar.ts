import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SnackbarService, SnackbarType } from '../services/snackbar.service';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './snackbar.html',
  styleUrls: ['./snackbar.css']
})
export class SnackbarComponent implements OnInit, OnDestroy {
  message = '';
  visible = false;
  type: SnackbarType = 'info';

  private timer: any;
  private sub?: Subscription;

  constructor(private snackbarService: SnackbarService) {}

  ngOnInit(): void {
    this.sub = this.snackbarService.snackbar$.subscribe(data => {
      this.show(data.message, data.type);
    });
  }

  show(message: string, type: SnackbarType = 'info'): void {
    this.message = message;
    this.type = type;
    this.visible = true;

    clearTimeout(this.timer);

    this.timer = setTimeout(() => {
      this.visible = false;
    }, 2500);
  }

  hide(): void {
    this.visible = false;
    clearTimeout(this.timer);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    clearTimeout(this.timer);
  }
}