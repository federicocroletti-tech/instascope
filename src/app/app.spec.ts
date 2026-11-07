// Runtime validation coverage for: public application shell and command palette.
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { App } from './app';
import { SnapshotFacade } from './core/state/snapshot.facade';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: SnapshotFacade, useValue: { lock: vi.fn() } }],
    }).compileComponents();
  });

  it('renders the public navigation shell', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.wordmark')?.textContent).toContain('InstaScope');
    expect(compiled.querySelector('nav[aria-label="Navigazione principale"]')).toBeTruthy();
  });

  it('opens the command palette', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    fixture.componentInstance.openCommandPalette();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
  });
});
