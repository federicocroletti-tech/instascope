import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SupabaseAuthService } from '../../core/auth/supabase-auth.service';
import { DEMO_SNAPSHOTS } from '../demo/demo-data';
import { AiInsightsComponent } from './ai-insights.component';

async function setup(cloudAllowed = true, demo = false) {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ enabled: true }));
  vi.stubGlobal('fetch', fetcher);
  TestBed.configureTestingModule({
    imports: [AiInsightsComponent],
    providers: [
      {
        provide: SupabaseAuthService,
        useValue: { isConfigured: true, accessToken: async () => 'synthetic-token' },
      },
    ],
  });
  const fixture = TestBed.createComponent(AiInsightsComponent);
  fixture.componentRef.setInput('snapshots', [...DEMO_SNAPSHOTS]);
  fixture.componentRef.setInput('cloudAllowed', cloudAllowed);
  fixture.componentRef.setInput('demo', demo);
  fixture.detectChanges();
  if (cloudAllowed && !demo) {
    await vi.waitFor(() => expect(fixture.componentInstance.enabled()).toBe(true));
  }
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, fetcher };
}

afterEach(() => vi.unstubAllGlobals());

describe('AI insights', () => {
  it('keeps the local workspace and synthetic preview offline', async () => {
    const { component, fetcher } = await setup(false, true);
    component.preview();
    expect(component.answer()).toContain('Snapshot:');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not request cloud configuration in the local workspace', async () => {
    const { component, fetcher } = await setup(false);
    component.consent = true;
    component.question = 'Cosa cambia?';
    await component.ask();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('requires explicit consent and sends only aggregate data', async () => {
    const { component, fetcher } = await setup();
    component.question = 'Cosa cambia?';
    await component.ask();
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockResolvedValue(
      Response.json({ answer: 'Possibile uscita, non una causa dimostrata.' }),
    );
    component.consent = true;
    await component.ask();
    expect(fetcher).toHaveBeenCalledTimes(2);
    const options = fetcher.mock.calls[1][1] as RequestInit;
    const body = JSON.parse(options.body as string);
    expect(body.consent).toBe(true);
    expect(body.summary.followers).toBe(3);
    expect(options.body).not.toMatch(/username|demo_user|sourceHash|profileUrl/);
    expect(component.answer()).toContain('Possibile uscita');
    expect(component.consent).toBe(false);
    expect(component.busy()).toBe(false);
  });

  it('renders provider text safely, without interpreting HTML', async () => {
    const { fixture, component, fetcher } = await setup();
    fetcher.mockResolvedValue(Response.json({ answer: '<img src=x onerror=alert(1)>' }));
    component.question = 'Cosa cambia?';
    component.consent = true;
    await component.ask();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.answer img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.answer').textContent).toContain('<img');
  });

  it('handles request limits and clears consent after failure', async () => {
    const { component, fetcher } = await setup();
    fetcher.mockResolvedValue(new Response('', { status: 429 }));
    component.question = 'Cosa cambia?';
    component.consent = true;
    await component.ask();
    expect(component.error()).toContain('Limite');
    expect(component.answer()).toBe('');
    expect(component.consent).toBe(false);
  });

  it('discards late results after cancellation', async () => {
    const { component, fetcher } = await setup();
    let finish!: (response: Response) => void;
    fetcher.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    component.question = 'Cosa cambia?';
    component.consent = true;
    const pending = component.ask();
    await Promise.resolve();
    component.cancel();
    finish(Response.json({ answer: 'Late answer' }));
    await pending;
    expect(component.answer()).toBe('');
    expect(component.busy()).toBe(false);
  });

  it('clears answers and consent when the dataset changes', async () => {
    const { fixture, component } = await setup();
    component.answer.set('Previous answer');
    component.consent = true;
    fixture.componentRef.setInput('snapshots', []);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.answer()).toBe('');
    expect(component.consent).toBe(false);
    expect(component.summary()).toBeNull();
  });
});
