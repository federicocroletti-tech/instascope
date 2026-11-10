import { Routes } from '@angular/router';
import { ownerGuard } from './core/auth/owner.guard';

export const routes: Routes = [
  {
    path: 'guida-export',
    loadComponent: () =>
      import('./features/imports/export-guide.component').then(
        (module) => module.ExportGuideComponent,
      ),
  },
  { path: 'import', pathMatch: 'full', redirectTo: 'local/import' },
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing-page.component').then(
        (module) => module.LandingPageComponent,
      ),
  },
  {
    path: 'demo',
    children: [
      {
        path: '',
        pathMatch: 'full',
        data: { demo: true },
        loadComponent: () =>
          import('./features/dashboard/dashboard-page.component').then(
            (module) => module.DashboardPageComponent,
          ),
      },
      {
        path: 'import',
        data: { demo: true },
        loadComponent: () =>
          import('./features/imports/import-page.component').then(
            (module) => module.ImportPageComponent,
          ),
      },
      ...(
        ['unfollow', 'pending-requests', 'recommendations', 'relationships', 'recent'] as const
      ).map((path) => ({
        path,
        data: {
          demo: true,
          page:
            path === 'unfollow'
              ? 'unfollow'
              : path === 'pending-requests'
                ? 'pending'
                : path === 'recommendations'
                  ? 'recommendations'
                  : path === 'relationships'
                    ? 'relationships'
                    : 'recent',
        },
        loadComponent: () =>
          import('./features/data/data-page.component').then((module) => module.DataPageComponent),
      })),
      {
        path: 'insights',
        data: { demo: true },
        loadComponent: () =>
          import('./features/insights/insights-page.component').then(
            (module) => module.InsightsPageComponent,
          ),
      },
      {
        path: 'privacy',
        data: { demo: true },
        loadComponent: () =>
          import('./features/privacy/privacy-page.component').then(
            (module) => module.PrivacyPageComponent,
          ),
      },
      {
        path: 'demographics',
        loadComponent: () =>
          import('./features/privacy/demographics-page.component').then(
            (module) => module.DemographicsPageComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings-page.component').then(
            (module) => module.SettingsPageComponent,
          ),
      },
    ],
  },
  {
    path: 'login',
    data: { robots: 'noindex, nofollow, noarchive' },
    loadComponent: () =>
      import('./features/auth/login-page.component').then((module) => module.LoginPageComponent),
  },
  {
    path: 'local',
    data: { robots: 'noindex, nofollow, noarchive' },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'import' },
      {
        path: 'import',
        data: { local: true },
        loadComponent: () =>
          import('./features/imports/import-page.component').then(
            (module) => module.ImportPageComponent,
          ),
      },
      {
        path: 'dashboard',
        data: { local: true },
        loadComponent: () =>
          import('./features/dashboard/dashboard-page.component').then(
            (module) => module.DashboardPageComponent,
          ),
      },
      {
        path: 'unfollow',
        data: { local: true, page: 'unfollow' },
        loadComponent: () =>
          import('./features/data/data-page.component').then((module) => module.DataPageComponent),
      },
      ...(['pending-requests', 'relationships', 'recent', 'recommendations'] as const).map(
        (path) => ({
          path,
          data: {
            local: true,
            page: path === 'pending-requests' ? 'pending' : path,
          },
          loadComponent: () =>
            import('./features/data/data-page.component').then(
              (module) => module.DataPageComponent,
            ),
        }),
      ),
      {
        path: 'insights',
        data: { local: true },
        loadComponent: () =>
          import('./features/insights/insights-page.component').then(
            (module) => module.InsightsPageComponent,
          ),
      },
      {
        path: 'privacy',
        data: { local: true },
        loadComponent: () =>
          import('./features/privacy/privacy-page.component').then(
            (module) => module.PrivacyPageComponent,
          ),
      },
    ],
  },
  {
    path: 'app',
    canActivate: [ownerGuard],
    canActivateChild: [ownerGuard],
    data: { robots: 'noindex, nofollow, noarchive' },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page.component').then(
            (module) => module.DashboardPageComponent,
          ),
      },
      {
        path: 'imports',
        loadComponent: () =>
          import('./features/imports/import-page.component').then(
            (module) => module.ImportPageComponent,
          ),
      },
      {
        path: 'unfollow',
        data: { page: 'unfollow' },
        loadComponent: () =>
          import('./features/data/data-page.component').then((module) => module.DataPageComponent),
      },
      {
        path: 'pending-requests',
        data: { page: 'pending' },
        loadComponent: () =>
          import('./features/data/data-page.component').then((module) => module.DataPageComponent),
      },
      {
        path: 'relationships',
        data: { page: 'relationships' },
        loadComponent: () =>
          import('./features/data/data-page.component').then((module) => module.DataPageComponent),
      },
      {
        path: 'recent',
        data: { page: 'recent' },
        loadComponent: () =>
          import('./features/data/data-page.component').then((module) => module.DataPageComponent),
      },
      {
        path: 'recommendations',
        data: { page: 'recommendations' },
        loadComponent: () =>
          import('./features/data/data-page.component').then((module) => module.DataPageComponent),
      },
      {
        path: 'insights',
        loadComponent: () =>
          import('./features/insights/insights-page.component').then(
            (module) => module.InsightsPageComponent,
          ),
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('./features/privacy/privacy-page.component').then(
            (module) => module.PrivacyPageComponent,
          ),
      },
      {
        path: 'demographics',
        loadComponent: () =>
          import('./features/privacy/demographics-page.component').then(
            (module) => module.DemographicsPageComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings-page.component').then(
            (module) => module.SettingsPageComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
