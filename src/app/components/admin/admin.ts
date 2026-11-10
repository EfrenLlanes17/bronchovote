import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Bill, BillStore } from '../../services/bill-store';

@Component({
  imports: [FormsModule],
  selector: 'app-admin',
  styleUrl: './admin.css',
  templateUrl: './admin.html',
})
export class Admin implements OnInit, OnDestroy {
  protected billId = signal('');
  protected billName = signal('');
  protected activeBills = signal<Bill[]>([]);
  protected feedbackMessage = signal('');
  protected feedbackType = signal<'error' | 'success'>('success');
  protected saving = signal(false);

  private stopWatchingBills?: () => void;

  constructor(private readonly billStore: BillStore) {}

  ngOnInit(): void {
    this.stopWatchingBills = this.billStore.watchActiveBills(
      (bills) => this.activeBills.set(bills),
      () =>
        this.setFeedback(
          'Could not load bills. Check the Realtime Database URL and read permissions.',
          'error',
        ),
    );
  }

  ngOnDestroy(): void {
    this.stopWatchingBills?.();
  }

  protected async createBill(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    const id = this.billId().trim();
    const name = this.billName().trim();
    if (!id || !name) return;

    if (!/^[A-Za-z0-9_-]+$/.test(id)) {
      this.setFeedback('Use only letters, numbers, hyphens, and underscores in the bill ID.', 'error');
      return;
    }

    this.saving.set(true);
    try {
      const created = await this.billStore.createBill(id, name);
      if (!created) {
        this.setFeedback('A bill with this ID already exists.', 'error');
        return;
      }

      this.activeBills.update((bills) =>
        bills.some((bill) => bill.id.toLowerCase() === id.toLowerCase())
          ? bills
          : [...bills, { id, name, active: true }],
      );
      this.billId.set('');
      this.billName.set('');
      this.setFeedback('Bill created and added to the active list.', 'success');
    } catch {
      this.setFeedback(
        'Could not save the bill. Check the Realtime Database URL and write permissions.',
        'error',
      );
    } finally {
      this.saving.set(false);
    }
  }

  private setFeedback(message: string, type: 'error' | 'success'): void {
    this.feedbackMessage.set(message);
    this.feedbackType.set(type);
  }
}
