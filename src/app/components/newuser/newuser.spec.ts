import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Newuser } from './newuser';

describe('Newuser', () => {
  let component: Newuser;
  let fixture: ComponentFixture<Newuser>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Newuser],
    }).compileComponents();

    fixture = TestBed.createComponent(Newuser);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
