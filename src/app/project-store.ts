import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  addEntity as appendEntity,
  answer as recordAnswer,
  createProject,
  goTo as moveTo,
  findStep,
  journeyOf,
  migrateProject,
  moveEntity as shiftEntity,
  openQuestions,
  removeEntity as dropEntity,
  updateEntity as editEntity,
  workflowFor,
} from '../domain';
import type {
  AnswerValue,
  EntityKind,
  JourneyStop,
  Project,
  ProjectMode,
  ProjectSummary,
  Step,
  Workflow,
} from '../domain';
import type { EntityChange } from './entity-change';
import { PROJECT_CLOCK, PROJECT_ID_GENERATOR } from './project-environment';
import { PROJECT_REPOSITORY, ProjectStorageError } from './project-repository';
import type { StorageProblem } from './project-repository';

export const AUTOSAVE_DELAY_MS = 400;

export type OpenState = 'none' | 'loading' | 'open' | 'not-found' | 'unreadable';

/**
 * The only writer of project state (ADR-0004). Edits show at once and are saved after a short
 * pause; opening, creating or hiding the page saves immediately.
 */
@Injectable({ providedIn: 'root' })
export class ProjectStore {
  private readonly repository = inject(PROJECT_REPOSITORY);
  private readonly now = inject(PROJECT_CLOCK);
  private readonly newId = inject(PROJECT_ID_GENERATOR);

  private readonly summaries = signal<readonly ProjectSummary[]>([]);
  private readonly openProject = signal<Project | undefined>(undefined);
  private readonly openStatus = signal<OpenState>('none');
  private readonly storageProblem = signal<StorageProblem | undefined>(undefined);

  private autosaveTimer: ReturnType<typeof setTimeout> | undefined;
  private unsaved = false;
  private writes: Promise<void> = Promise.resolve();
  private openRequest = 0;

  readonly projects = computed<readonly ProjectSummary[]>(() =>
    [...this.summaries()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
  readonly project = this.openProject.asReadonly();
  readonly openState = this.openStatus.asReadonly();
  readonly problem = this.storageProblem.asReadonly();
  readonly workflow = computed<Workflow | undefined>(() => {
    const project = this.openProject();
    return project && workflowFor(project.mode);
  });
  readonly currentStep = computed<Step | undefined>(() => {
    const project = this.openProject();
    const workflow = this.workflow();
    return project && workflow && findStep(workflow, project.currentStepId);
  });

  readonly journey = computed<readonly JourneyStop[]>(() => {
    const project = this.openProject();
    return project ? journeyOf(project) : [];
  });

  readonly openQuestionCount = computed(() => {
    const project = this.openProject();
    const step = this.currentStep();
    return project && step ? openQuestions(project, step).length : 0;
  });

  constructor() {
    const page = inject(DOCUMENT).defaultView;
    // Relies on the adapter finishing its write in microtasks once it has loaded (the deferred adapter starts loading at provide time); a truly asynchronous one (IndexedDB) could lose it.
    const saveBeforeLeaving = (): void => {
      void this.flush();
    };
    page?.addEventListener('pagehide', saveBeforeLeaving);
    inject(DestroyRef).onDestroy(() => {
      page?.removeEventListener('pagehide', saveBeforeLeaving);
      saveBeforeLeaving();
    });
  }

  async refresh(): Promise<void> {
    try {
      this.summaries.set(await this.repository.list());
    } catch (error: unknown) {
      this.storageProblem.set(problemOf(error));
    }
  }

  async create(name: string, mode: ProjectMode): Promise<string> {
    await this.flush();
    const project = createProject({ id: this.newId(), name, mode, now: this.now() });
    this.openRequest++;
    this.openProject.set(project);
    this.openStatus.set('open');
    this.unsaved = true;
    await this.flush();
    await this.refresh();
    return project.id;
  }

  async open(id: string): Promise<void> {
    if (this.openStatus() === 'open' && this.openProject()?.id === id) {
      return;
    }
    await this.flush();
    const request = ++this.openRequest;
    this.unsaved = false;
    this.openProject.set(undefined);
    this.openStatus.set('loading');
    try {
      const stored = await this.repository.load(id);
      if (request !== this.openRequest) {
        return;
      }
      if (stored === undefined) {
        this.openStatus.set('not-found');
        return;
      }
      const project = migrateProject(stored);
      this.openProject.set(project);
      this.openStatus.set(project ? 'open' : 'unreadable');
    } catch (error: unknown) {
      if (request === this.openRequest) {
        this.storageProblem.set(problemOf(error));
        this.openStatus.set('unreadable');
      }
    }
  }

  answer(stepId: string, questionId: string, value: AnswerValue): void {
    this.change((project, now) => recordAnswer(project, stepId, questionId, value, now));
  }

  /** Applies one edit to a list of rows; an added row gets an id the store makes up. */
  changeEntities(kind: EntityKind, change: EntityChange): void {
    switch (change.type) {
      case 'add': {
        const id = this.newId();
        this.change((project, now) => appendEntity(project, kind, id, now));
        break;
      }
      case 'edit':
        this.change((project, now) => editEntity(project, kind, change.id, change.edit, now));
        break;
      case 'move':
        this.change((project, now) => shiftEntity(project, kind, change.id, change.offset, now));
        break;
      case 'remove':
        this.change((project, now) => dropEntity(project, kind, change.id, now));
        break;
    }
  }

  goTo(stepId: string): void {
    this.change((project, now) => moveTo(project, stepId, now));
  }

  /** Saves any pending edit now. Resolves once storage has answered; it never rejects. */
  async flush(): Promise<void> {
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = undefined;
    const project = this.openProject();
    if (project && this.unsaved) {
      this.unsaved = false;
      this.writes = this.writes.then(() => this.write(project));
    }
    await this.writes;
  }

  private change(update: (project: Project, now: string) => Project): void {
    const current = this.openProject();
    if (!current) {
      return;
    }
    const next = update(current, this.now());
    if (next === current) {
      return;
    }
    this.openProject.set(next);
    this.unsaved = true;
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => void this.flush(), AUTOSAVE_DELAY_MS);
  }

  private async write(project: Project): Promise<void> {
    try {
      await this.repository.save(project);
      this.storageProblem.set(undefined);
    } catch (error: unknown) {
      this.unsaved = this.openProject()?.id === project.id;
      this.storageProblem.set(problemOf(error));
    }
  }
}

function problemOf(error: unknown): StorageProblem {
  return error instanceof ProjectStorageError ? error.reason : 'unavailable';
}
