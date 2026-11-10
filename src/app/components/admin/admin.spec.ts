import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Bill, BillStore } from '../../services/bill-store';
import { Admin } from './admin';

describe('Admin', () => {
  let component: Admin;
  let fixture: ComponentFixture<Admin>;
  let savedBills: Bill[];
  let listeners: Array<(bills: Bill[]) => void>;

  beforeEach(async () => {
    savedBills = [];
    listeners = [];
    const billStore: Pick<BillStore, 'watchActiveBills' | 'createBill'> = {
      watchActiveBills: (onBills) => {
        listeners.push(onBills);
        onBills([...savedBills]);
        return () => undefined;
      },
      createBill: async (id, name) => {
        if (savedBills.some((bill) => bill.id.toLowerCase() === id.toLowerCase())) return false;
        savedBills = [...savedBills, { id, name, active: true }];
        listeners.forEach((onBills) => onBills([...savedBills]));
        return true;
      },
    };

    await TestBed.configureTestingModule({
      imports: [Admin],
      providers: [{ provide: BillStore, useValue: billStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(Admin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should create a bill and show it in the realtime active list', async () => {
    const idInput: HTMLInputElement = fixture.nativeElement.querySelector('#bill-id');
    const nameInput: HTMLInputElement = fixture.nativeElement.querySelector('#bill-name');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    idInput.value = 'HB-1042';
    idInput.dispatchEvent(new Event('input', { bubbles: true }));
    nameInput.value = 'Community Health Funding Act';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(savedBills).toEqual([{ id: 'HB-1042', name: 'Community Health Funding Act', active: true }]);
    expect(fixture.nativeElement.textContent).toContain('Community Health Funding Act');

    fixture.destroy();
    fixture = TestBed.createComponent(Admin);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Community Health Funding Act');
    expect(fixture.nativeElement.textContent).toContain('HB-1042');
  });

  it('should reject a duplicate bill ID', () => {
    savedBills = [{ id: 'HB-1042', name: 'Existing bill', active: true }];
    fixture.destroy();
    fixture = TestBed.createComponent(Admin);
    fixture.detectChanges();

    const idInput: HTMLInputElement = fixture.nativeElement.querySelector('#bill-id');
    const nameInput: HTMLInputElement = fixture.nativeElement.querySelector('#bill-name');
    idInput.value = 'HB-1042';
    idInput.dispatchEvent(new Event('input', { bubbles: true }));
    nameInput.value = 'Duplicate bill';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.nativeElement.querySelector('form').dispatchEvent(
      new SubmitEvent('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('A bill with this ID already exists.');
    expect(savedBills).toHaveLength(1);
  });
});
