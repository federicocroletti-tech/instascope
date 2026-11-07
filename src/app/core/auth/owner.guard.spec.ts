// Runtime validation coverage for: owner-only route authorization.
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { ownerGuard } from './owner.guard';
import { SupabaseAuthService } from './supabase-auth.service';

@Component({ standalone: true, template: '<h1>Area privata</h1>' })
class PrivatePage {}

@Component({ standalone: true, template: '<h1>Accesso</h1>' })
class LoginPage {}

describe('ownerGuard', () => {
  async function createHarness(isOwner: () => Promise<boolean>) {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'private', canActivate: [ownerGuard], component: PrivatePage },
          { path: 'login', component: LoginPage },
        ]),
        { provide: SupabaseAuthService, useValue: { isOwner } },
      ],
    }).compileComponents();

    return RouterTestingHarness.create();
  }

  it('redirects an unauthorized user to login with a return URL', async () => {
    const isOwner = vi.fn().mockResolvedValue(false);
    const harness = await createHarness(isOwner);

    await harness.navigateByUrl('/private', LoginPage);

    expect(harness.routeNativeElement?.textContent).toContain('Accesso');
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fprivate');
    expect(isOwner).toHaveBeenCalledOnce();
  });

  it('allows the verified owner to enter the private route', async () => {
    const isOwner = vi.fn().mockResolvedValue(true);
    const harness = await createHarness(isOwner);

    await harness.navigateByUrl('/private', PrivatePage);

    expect(harness.routeNativeElement?.textContent).toContain('Area privata');
    expect(isOwner).toHaveBeenCalledOnce();
  });
});
