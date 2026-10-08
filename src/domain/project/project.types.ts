import type { ProjectEntities } from '../entity/entity.types';
import type { ProjectMode } from '../workflow/workflow.types';

export type AnswerValue = string | readonly string[];

export type StepAnswers = Readonly<Record<string, AnswerValue>>;

export interface Project {
  readonly schemaVersion: number;
  readonly id: string;
  readonly name: string;
  readonly mode: ProjectMode;
  readonly answers: Readonly<Record<string, StepAnswers>>;
  readonly notes: Readonly<Record<string, string>>;
  readonly entities: ProjectEntities;
  readonly currentStepId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProjectSummary {
  readonly id: string;
  readonly name: string;
  readonly mode: ProjectMode;
  readonly updatedAt: string;
}
