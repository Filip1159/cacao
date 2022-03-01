import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardFaceDownComponent } from './card-face-down.component';

describe('CardFaceDownComponent', () => {
  let component: CardFaceDownComponent;
  let fixture: ComponentFixture<CardFaceDownComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CardFaceDownComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CardFaceDownComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
