import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Billstats } from './billstats';

describe('Billstats', () => {
  let component: Billstats;
  let fixture: ComponentFixture<Billstats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Billstats],
    }).compileComponents();

    fixture = TestBed.createComponent(Billstats);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
