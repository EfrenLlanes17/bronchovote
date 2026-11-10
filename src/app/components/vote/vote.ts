import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { Unsubscribe } from 'firebase/database';
import type { Subscription } from 'rxjs';
import {
	Bill,
	BillStore,
	EMPTY_VOTE_COUNTS,
	VoteChoice,
	VoteCounts,
} from '../../services/bill-store';

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
	protected voteCounts = signal<VoteCounts>({ ...EMPTY_VOTE_COUNTS });
	protected isLoading = signal(false);
	protected savingVote = signal(false);
	protected hasVoted = signal(false);
	protected feedbackMessage = signal('');
	protected feedbackType = signal<'error' | 'success'>('success');

	private routeSubscription?: Subscription;
	private stopWatchingBill?: Unsubscribe;
	private stopWatchingCounts?: Unsubscribe;

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
		this.stopWatchingCounts?.();
	}

	protected submitEmail(event: SubmitEvent, email: string): void {
		event.preventDefault();

		const trimmedEmail = email.trim();
		if (!trimmedEmail) return;

		this.email.set(trimmedEmail);
		localStorage.setItem('email', trimmedEmail);
	}

	protected async castVote(choice: VoteChoice): Promise<void> {
		const id = this.billId();
		if (!id || !this.bill() || !this.email() || this.hasVoted() || this.savingVote()) return;

		this.savingVote.set(true);
		this.feedbackMessage.set('');
		try {
			const updatedCount = await this.billStore.castVote(id, choice);
			if (updatedCount === null) {
				this.setFeedback('Your vote could not be saved. Please try again.', 'error');
				return;
			}

			this.voteCounts.update((counts) => ({ ...counts, [choice]: updatedCount }));
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
		this.stopWatchingCounts?.();
		this.billId.set(id);
		this.bill.set(null);
		this.voteCounts.set({ ...EMPTY_VOTE_COUNTS });
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
		this.stopWatchingCounts = this.billStore.watchVoteCounts(
			id,
			(counts) => this.voteCounts.set(counts),
			() => this.setFeedback('Could not load vote totals. Check database read permissions.', 'error'),
		);
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