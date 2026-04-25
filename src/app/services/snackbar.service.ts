import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type SnackbarType = 'success' | 'error' | 'info';

export interface SnackbarData {
  message: string;
  type: SnackbarType;
}

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  private snackbarSubject = new Subject<SnackbarData>();
  snackbar$ = this.snackbarSubject.asObservable();

  show(message: string, type: SnackbarType = 'info') {
    this.snackbarSubject.next({ message, type });
  }
}