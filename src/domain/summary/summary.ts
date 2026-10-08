import { diagramDefinitions } from '../diagrams/diagram-definitions';
import { diagramFor } from '../diagrams/diagrams';
import { entityLabel, isNamed } from '../entity/entities';
import { entityDefinitions } from '../entity/entity-definitions';
import type { Entity, EntityField, EntityKind, FieldValue } from '../entity/entity.types';
import { NONE_ANSWER, noteFor, stepAnswers } from '../project/project';
import type { Project } from '../project/project.types';
import { openQuestions } from '../project/progress';
import { workflowFor } from '../workflow/workflow';
import type { Question, Step } from '../workflow/workflow.types';
import type { DesignSummary, SummaryAnswerBody, SummaryField, SummaryStep, SummaryValue } from './summary.types';

/**
 * The whole design as one page of facts, derived from the model alone (ADR-0004): every step of the
 * workflow in order, each with the answers it has, the user's note and the diagram it draws. A step
 * that is not finished is still there, marked open, so nothing the user wrote drops out of the page.
 */
export function summaryOf(project: Project): DesignSummary {
  const workflow = workflowFor(project.mode);
  const steps = workflow.steps.map((step, index) => summaryStep(project, step, index + 1));
  return {
    projectName: project.name,
    workflowTitle: workflow.title,
    answeredCount: steps.filter((step) => step.state === 'answered').length,
    stepCount: steps.length,
    steps,
  };
}

function summaryStep(project: Project, step: Step, number: number): SummaryStep {
  const open = openQuestions(project, step);
  const source = step.diagram && diagramFor(project, step.diagram);
  return {
    stepId: step.id,
    number,
    title: step.title,
    state: open.length === 0 ? 'answered' : 'open',
    openPrompts: open.map((question) => question.prompt),
    answers: step.questions.flatMap((question) => {
      const body = bodyOf(project, step, question);
      return body ? [{ questionId: question.id, prompt: question.prompt, body }] : [];
    }),
    note: noteFor(project, step.id),
    diagram:
      step.diagram && source !== undefined
        ? { kind: step.diagram, title: diagramDefinitions[step.diagram].title, source }
        : undefined,
  };
}

function bodyOf(project: Project, step: Step, question: Question): SummaryAnswerBody | undefined {
  const written = stepAnswers(project, step.id)[question.id];
  switch (question.kind) {
    case 'short-text':
    case 'long-text':
    case 'string-list':
      return valueOf(written);
    case 'choice': {
      const chosen = question.options.find((option) => option.value === written);
      return chosen && { kind: 'text', text: chosen.label };
    }
    case 'entity-choice': {
      const chosen = project.entities[question.entity].find((row) => row.id === written && isNamed(row));
      return chosen && { kind: 'text', text: entityLabel(chosen, question.entity) };
    }
    case 'entity-fields': {
      const field = definitionOf(question.entity, question.field);
      const entries = project.entities[question.entity].filter(isNamed).flatMap((row) => {
        const value = field && fieldValue(project, field, row);
        return value ? [{ name: entityLabel(row, question.entity), value }] : [];
      });
      if (entries.length > 0) {
        return { kind: 'entries', entries };
      }
      return written === NONE_ANSWER && question.noneLabel !== undefined ? { kind: 'text', text: question.noneLabel } : undefined;
    }
    case 'entity-list': {
      const fields = entityDefinitions[question.entity].fields.filter(
        (field) => question.fields === undefined || question.fields.includes(field.key),
      );
      const rows = project.entities[question.entity].filter(isNamed).map((row) => ({
        name: entityLabel(row, question.entity),
        fields: fields.flatMap((field): SummaryField[] => {
          const value = fieldValue(project, field, row);
          return value ? [{ label: field.label, value }] : [];
        }),
      }));
      return rows.length > 0 ? { kind: 'rows', rows } : undefined;
    }
  }
}

function definitionOf(kind: EntityKind, key: string): EntityField | undefined {
  return entityDefinitions[kind].fields.find((field) => field.key === key);
}

/** What a row has written in a field, with a reference shown as the name of the row it points at. */
function fieldValue(project: Project, field: EntityField, row: Entity): SummaryValue | undefined {
  const stored = row.fields[field.key];
  if (field.kind !== 'references') {
    return valueOf(stored);
  }
  const targets = project.entities[field.references];
  const names = (typeof stored === 'string' || stored === undefined ? [] : stored).flatMap((id) => {
    const target = targets.find((candidate) => candidate.id === id && isNamed(candidate));
    return target ? [entityLabel(target, field.references)] : [];
  });
  return names.length > 0 ? { kind: 'list', items: names } : undefined;
}

/** A written value tidied for reading: text trimmed, list lines trimmed and blank ones dropped; nothing when nothing is left. */
function valueOf(value: FieldValue | undefined): SummaryValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    const text = value.trim();
    return text === '' ? undefined : { kind: 'text', text };
  }
  const items = value.map((item) => item.trim()).filter((item) => item !== '');
  return items.length === 0 ? undefined : { kind: 'list', items };
}
