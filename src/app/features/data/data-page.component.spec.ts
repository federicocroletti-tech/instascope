import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { SnapshotFacade } from '../../core/state/snapshot.facade';
import { Snapshot } from '../../shared/models/snapshot.model';
import { DataPageComponent } from './data-page.component';

function snapshot(id: string, followers: string[], following?: string[]): Snapshot {
  return {
    id,
    createdAt: `2026-11-0${id}T12:00:00.000Z`,
    importedAt: `2026-11-0${id}T12:00:00.000Z`,
    sourceHash: `synthetic-${id}`,
    invalidRecords: 0,
    duplicateRecords: 0,
    warnings: [],
    datasets: {
      followers: followers.map((username) => ({ username })),
      ...(following ? { following: following.map((username) => ({ username })) } : {}),
    },
  };
}

function checkbox(checked: boolean): Event {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  const event = new Event('change');
  Object.defineProperty(event, 'target', { value: input });
  return event;
}

describe('Lost follower review', () => {
  const snapshots = signal<Snapshot[]>([]);

  beforeEach(() => {
    snapshots.set([
      snapshot('3', ['kept'], ['lost_one', 'lost_two']),
      snapshot('2', ['kept', 'lost_one', 'lost_two', 'not_followed'], ['lost_one']),
      snapshot('1', ['kept', 'older_lost'], ['older_lost']),
    ]);
    TestBed.configureTestingModule({
      imports: [DataPageComponent],
      providers: [
        provideRouter([]),
        { provide: SnapshotFacade, useValue: { activeSnapshots: snapshots } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { page: 'unfollow', local: true } } },
        },
      ],
    });
  });

  it('selects only lost followers still followed and tracks partial/all selection', () => {
    const component = TestBed.createComponent(DataPageComponent).componentInstance;
    component.toggleLostFollower('lost_one', checkbox(true));
    component.toggleLostFollower('not_followed', checkbox(true));
    expect(component.selectedLostFollowers().map((account) => account.username)).toEqual([
      'lost_one',
    ]);
    expect(component.someLostFollowersSelected()).toBe(true);
    expect(component.allLostFollowersSelected()).toBe(false);
    component.toggleAllLostFollowers(checkbox(true));
    expect(component.selectedLostFollowers()).toHaveLength(2);
    expect(component.allLostFollowersSelected()).toBe(true);
    expect(component.someLostFollowersSelected()).toBe(false);
    component.clearLostFollowerSelection();
    expect(component.selectedLostFollowers()).toEqual([]);
  });

  it('deduplicates selections and supports deselection without changing snapshots', () => {
    const component = TestBed.createComponent(DataPageComponent).componentInstance;
    const before = JSON.stringify(snapshots());
    component.toggleLostFollower('lost_one', checkbox(true));
    component.toggleLostFollower('lost_one', checkbox(true));
    expect(component.selectedLostFollowers()).toHaveLength(1);
    component.toggleLostFollower('lost_one', checkbox(false));
    expect(component.selectedLostFollowers()).toEqual([]);
    expect(JSON.stringify(snapshots())).toBe(before);
  });

  it('clears selection when either comparison snapshot changes', () => {
    const component = TestBed.createComponent(DataPageComponent).componentInstance;
    component.toggleAllLostFollowers(checkbox(true));
    expect(component.selectedLostFollowers()).toHaveLength(2);
    component.selectedPreviousId.set('1');
    expect(component.selectedLostUsernames()).toEqual([]);
    component.selectedPreviousId.set('2');
    component.toggleAllLostFollowers(checkbox(true));
    component.selectedCurrentId.set('2');
    expect(component.selectedLostUsernames()).toEqual([]);
  });

  it('clears stale selection on lock, deletion, or archive replacement', () => {
    const component = TestBed.createComponent(DataPageComponent).componentInstance;
    component.toggleAllLostFollowers(checkbox(true));
    expect(component.selectedLostFollowers()).toHaveLength(2);
    snapshots.set([]);
    expect(component.selectedLostUsernames()).toEqual([]);
    expect(component.allLostFollowersSelected()).toBe(false);
    snapshots.set([snapshot('3', ['kept'], []), snapshot('2', ['kept', 'lost_one'])]);
    expect(component.selectedLostFollowers()).toEqual([]);
  });

  it('does not offer review when Following is missing or the category is empty', () => {
    snapshots.set([snapshot('3', ['kept']), snapshot('2', ['kept', 'lost_one'])]);
    const component = TestBed.createComponent(DataPageComponent).componentInstance;
    component.toggleAllLostFollowers(checkbox(true));
    expect(component.selectedLostFollowers()).toEqual([]);
    expect(component.allLostFollowersSelected()).toBe(false);
    expect(component.unfollowUnavailableMessage()).toContain('Following');
  });
});
