import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArchiveParserService } from '../../core/import/archive-parser.service';
import { SnapshotFacade } from '../../core/state/snapshot.facade';
import { ImportPageComponent } from './import-page.component';

describe('ImportPageComponent', () => {
  const facade = {
    activeSnapshots: signal([]),
    currentSnapshot: signal(null),
    inMemorySnapshot: signal(null),
    persistence: signal<'memory' | 'local'>('local'),
    localUnlocked: signal(true),
    message: signal<string | null>(null),
    previewInMemory: vi.fn(),
    save: vi.fn().mockResolvedValue({
      id: 'imported',
      mode: 'merge-update',
      recordsAdded: 1,
      recordsUpdated: 2,
      recordsIgnored: 0,
      recordsReplaced: 0,
      duplicateArchive: false,
    }),
  };

  beforeEach(async () => {
    facade.previewInMemory.mockClear();
    facade.save.mockClear();
    await TestBed.configureTestingModule({
      imports: [ImportPageComponent],
      providers: [
        { provide: SnapshotFacade, useValue: facade },
        { provide: ArchiveParserService, useValue: { parse: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
      ],
    }).compileComponents();
  });

  it('shows category detection and requires explicit confirmation for replacement', () => {
    const fixture = TestBed.createComponent(ImportPageComponent);
    fixture.detectChanges();
    fixture.componentInstance.preview.set({
      sourceHash: 'hash',
      importedAt: '2026-11-01T10:00:00.000Z',
      datasets: { followers: [{ username: 'alice' }], following: [] },
      categoryDetection: {
        followers: { filesFound: 1, recordsRead: 1, validRecords: 1, invalidRecords: 0 },
        following: { filesFound: 1, recordsRead: 0, validRecords: 0, invalidRecords: 0 },
      },
      invalidRecords: 0,
      duplicateRecords: 0,
      warnings: [],
    });
    fixture.componentInstance.passphrase.set('a sufficiently long passphrase');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('1 file · 1 validi · 0 non validi');
    expect(fixture.nativeElement.textContent).toContain('Categoria assente');
    const saveButton = [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
      button.textContent.includes('Conferma importazione'),
    );
    expect(saveButton.disabled).toBe(true);

    fixture.componentInstance.confirmReplacement.set(true);
    fixture.detectChanges();
    expect(saveButton.disabled).toBe(false);
  });

  it('passes the chosen mode to local persistence and shows the resulting report', async () => {
    const fixture = TestBed.createComponent(ImportPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.preview.set({
      sourceHash: 'hash',
      importedAt: '2026-11-01T10:00:00.000Z',
      datasets: { followers: [{ username: 'alice' }] },
      invalidRecords: 0,
      duplicateRecords: 0,
      warnings: [],
    });
    component.importMode.set('merge-update');
    component.passphrase.set('a sufficiently long passphrase');

    await component.saveLocally();
    fixture.detectChanges();

    expect(facade.save).toHaveBeenCalledWith(
      expect.objectContaining({ sourceHash: 'hash' }),
      'a sufficiently long passphrase',
      false,
      'merge-update',
    );
    expect(fixture.nativeElement.textContent).toContain('2 aggiornati');
    expect(fixture.nativeElement.textContent).toContain(
      'Lo snapshot originale è stato conservato.',
    );
  });
});
