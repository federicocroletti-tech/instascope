import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const ownerGuard: CanActivateFn = async (_route, state) => {
  const injector = inject(EnvironmentInjector);
  const router = inject(Router);
  const { SupabaseAuthService } = await import('./supabase-auth.service');
  const isOwner = await runInInjectionContext(injector, () =>
    inject(SupabaseAuthService).isOwner(),
  );

  if (isOwner) {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
