import { Injectable } from '@angular/core';
import {
	DataSnapshot,
	onValue,
	ref,
	runTransaction,
	type Unsubscribe,
} from 'firebase/database';
import { database } from '../firebase';

export interface Bill {
	id: string;
	name: string;
	active: boolean;
}

@Injectable({ providedIn: 'root' })
export class BillStore {
	watchActiveBills(onBills: (bills: Bill[]) => void, onError: (error: Error) => void): Unsubscribe {
		return onValue(
			ref(database, 'bills'),
			(snapshot) => onBills(this.readBills(snapshot)),
			(error) => onError(error),
		);
	}

	async createBill(id: string, name: string): Promise<boolean> {
		const billRef = ref(database, `bills/${id.toLowerCase()}`);
		const result = await runTransaction(
			billRef,
			(currentValue: unknown) =>
				currentValue === null ? { id, name, active: true } : undefined,
			{ applyLocally: false },
		);

		return result.committed;
	}

	private readBills(snapshot: DataSnapshot): Bill[] {
		const values: unknown = snapshot.val();
		if (typeof values !== 'object' || values === null) return [];

		return Object.values(values).filter(this.isActiveBill);
	}

	private isActiveBill(value: unknown): value is Bill {
		return (
			typeof value === 'object' &&
				value !== null &&
				'id' in value &&
				typeof value.id === 'string' &&
				'name' in value &&
				typeof value.name === 'string' &&
				'active' in value &&
				value.active === true
		);
	}
}