import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { Unsubscribe } from 'firebase/database';
import type { Subscription } from 'rxjs';
import { BillStore } from '../../services/bill-store';
import type { Bill, VoteChoice } from '../../services/bill-store';

@Component({
	imports: [],
	selector: 'app-vote',
	styleUrl: './vote.css',
	templateUrl: './vote.html',
})
export class Vote implements OnInit, OnDestroy {
	protected readonly voteOptions: { value: VoteChoice; label: string }[] = [
		{ value: 'aye', label: 'Aye' },
		{ value: 'nay', label: 'Nay' },
		{ value: 'abstain', label: 'Abstain' },
	];
	protected email = signal('');
	protected billId = signal('');
	protected bill = signal<Bill | null>(null);
	protected isLoading = signal(false);
	protected savingVote = signal(false);
	protected checkingVoteStatus = signal(false);
	protected hasVoted = signal(false);
	protected feedbackMessage = signal('');
	protected feedbackType = signal<'error' | 'success'>('success');

	private routeSubscription?: Subscription;
	private stopWatchingBill?: Unsubscribe;

	constructor(
		private readonly route: ActivatedRoute,
		private readonly billStore: BillStore,
	) {}

	ngOnInit(): void {
		this.email.set(this.getSavedEmail());
		this.routeSubscription = this.route.queryParamMap.subscribe((params) => {
			this.loadBill(params.get('billId')?.trim() ?? '');
		});
	}

	ngOnDestroy(): void {
		this.routeSubscription?.unsubscribe();
		this.stopWatchingBill?.();
	}

	protected submitEmail(event: SubmitEvent, email: string): void {
		event.preventDefault();

		const trimmedEmail = email.trim();
		if (!trimmedEmail) return;

		this.email.set(trimmedEmail);
		localStorage.setItem('email', trimmedEmail);
		void this.checkExistingVote(this.billId(), trimmedEmail);
	}

	protected async castVote(choice: VoteChoice): Promise<void> {
		const id = this.billId();
		if (!id || !this.bill() || !this.email() || this.hasVoted() || this.checkingVoteStatus() || this.savingVote()) return;

		this.savingVote.set(true);
		this.feedbackMessage.set('');
		try {
			const result = await this.billStore.castVote(id, choice, this.email());
			if (result === 'already-voted') {
				this.hasVoted.set(true);
				this.setFeedback('A vote from this email is already recorded for this bill.', 'error');
				return;
			}
			if (result === 'unavailable') {
				this.setFeedback('Your vote could not be saved. Please try again.', 'error');
				return;
			}

			this.hasVoted.set(true);
			this.setFeedback(`Your ${this.voteOptions.find((option) => option.value === choice)?.label} vote has been recorded.`, 'success');
		} catch {
			this.setFeedback('Your vote could not be saved. Check database write permissions and try again.', 'error');
		} finally {
			this.savingVote.set(false);
		}
	}

	private loadBill(id: string): void {
		this.stopWatchingBill?.();
		this.billId.set(id);
		this.bill.set(null);
		this.hasVoted.set(false);
		this.feedbackMessage.set('');

		if (!id) {
			this.isLoading.set(false);
			return;
		}
		if (!/^[A-Za-z0-9_-]+$/.test(id)) {
			this.isLoading.set(false);
			this.setFeedback('The bill ID in this link is invalid.', 'error');
			return;
		}

		this.isLoading.set(true);
		this.stopWatchingBill = this.billStore.watchBill(
			id,
			(bill) => {
				this.bill.set(bill);
				this.isLoading.set(false);
				if (!bill) this.setFeedback('This bill does not exist or is no longer active.', 'error');
			},
			() => {
				this.isLoading.set(false);
				this.setFeedback('Could not load this bill. Check database read permissions.', 'error');
			},
		);
		if (this.email()) void this.checkExistingVote(id, this.email());
	}

	private async checkExistingVote(id: string, email: string): Promise<void> {
		if (!id || !email || !/^[A-Za-z0-9_-]+$/.test(id)) return;
		this.checkingVoteStatus.set(true);
		try {
			const alreadyVoted = await this.billStore.hasVoted(id, email);
			if (this.billId() === id && this.email().toLowerCase() === email.toLowerCase()) {
				this.hasVoted.set(alreadyVoted);
				if (alreadyVoted) this.setFeedback('A vote from this email is already recorded for this bill.', 'error');
			}
		} catch {
			this.setFeedback('Could not check prior voting status. The database will still reject duplicate votes.', 'error');
		} finally {
			this.checkingVoteStatus.set(false);
		}
	}

	private getSavedEmail(): string {
		const savedEmail = localStorage.getItem('email');
		if (savedEmail) return savedEmail;

		const sessionEmail = sessionStorage.getItem('email');
		if (sessionEmail) {
			localStorage.setItem('email', sessionEmail);
			return sessionEmail;
		}

		const cookie = document.cookie
			.split('; ')
			.find((entry) => entry.startsWith('email='));

		return cookie ? decodeURIComponent(cookie.slice('email='.length)) : '';
	}

	private setFeedback(message: string, type: 'error' | 'success'): void {
		this.feedbackMessage.set(message);
		this.feedbackType.set(type);
	}
}