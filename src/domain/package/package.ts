import type { DiagramKind } from '../diagrams/diagram.types';
import type { Project } from '../project/project.types';
import { summaryOf } from '../summary/summary';
import type { DesignSummary, SummaryAnswer, SummaryField, SummaryStep, SummaryValue } from '../summary/summary.types';
import { workflowFor } from '../workflow/workflow';
import { indented, oneLine, proseLines } from './markdown';
import type { PackageFile } from './package.types';

/**
 * The design as Markdown files, derived from the model alone (ADR-0004): which steps each file
 * gathers is declared by the workflow, and what each step says is the summary's. Every step is in
 * a file whether or not it is answered, so a gap shows up as an open section instead of vanishing.
 */
export function buildPackage(project: Project): readonly PackageFile[] {
  const summary = summaryOf(project);
  const steps = new Map(summary.steps.map((step) => [step.stepId, step]));
  return workflowFor(project.mode).designPackage.map((definition) => ({
    path: definition.path,
    title: definition.title,
    markdown: fileMarkdown(
      summary,
      definition.title,
      definition.steps.flatMap((stepId) => steps.get(stepId) ?? []),
    ),
  }));
}

/** The files as one document: a title, a contents list that links to each file, then the files with their headings one level down. */
export function combinePackage(files: readonly PackageFile[], projectName: string): string {
  const contents = files.map((file, index) => `${index + 1}. [${oneLine(file.title)}](#${anchorOf(file.title)})`);
  return (
    [
      `# ${oneLine(projectName)}: design package`,
      ['## Contents', ...(contents.length > 0 ? ['', ...contents] : [])].join('\n'),
      ...files.map((file) => demoted(file.markdown).trimEnd()),
    ].join('\n\n') + '\n'
  );
}

/** A name for the combined document that any file system takes, made from the project's name. */
export function packageFileName(projectName: string): string {
  const slug = [
    ...projectName
      .normalize('NFC')
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
      .replace(/^-+/, ''),
  ]
    .slice(0, 60)
    .join('')
    .replace(/-+$/, '');
  return `${slug === '' ? '' : `${slug}-`}design-package.md`;
}

function fileMarkdown(summary: DesignSummary, title: string, steps: readonly SummaryStep[]): string {
  const answered = steps.filter((step) => step.state === 'answered').length;
  const drawnAt = new Map<DiagramKind, string>();
  for (const step of steps) {
    if (step.diagram && !drawnAt.has(step.diagram.kind)) {
      drawnAt.set(step.diagram.kind, step.stepId);
    }
  }
  const blocks = [
    `# ${oneLine(title)}`,
    `${oneLine(summary.projectName)} · ${oneLine(summary.workflowTitle)} · ${answered} of ${steps.length} ${steps.length === 1 ? 'step' : 'steps'} answered`,
    ...steps.flatMap((step) => stepBlocks(step, step.diagram !== undefined && drawnAt.get(step.diagram.kind) === step.stepId)),
  ];
  return `${blocks.join('\n\n')}\n`;
}

/** A diagram is shown where the file first draws it, not again under each later step that draws the same one. */
function stepBlocks(step: SummaryStep, showDiagram: boolean): string[] {
  return [
    `## ${step.number}. ${oneLine(step.title)}`,
    ...(step.state === 'open'
      ? [['> **Open.** Still to answer:', ...step.openPrompts.map((prompt) => `> - ${oneLine(prompt)}`)].join('\n')]
      : []),
    ...step.answers.flatMap(answerBlocks),
    ...(step.note === '' ? [] : ['**Notes**', proseLines(step.note).join('\n')]),
    ...(showDiagram && step.diagram
      ? [`**Diagram: ${oneLine(step.diagram.title)}**`, `\`\`\`mermaid\n${step.diagram.source}\n\`\`\``]
      : []),
  ];
}

function answerBlocks(answer: SummaryAnswer): string[] {
  const { body } = answer;
  const lines =
    body.kind === 'rows'
      ? body.rows.flatMap((row) => [`- **${oneLine(row.name)}**`, ...row.fields.flatMap(fieldLines)])
      : body.kind === 'entries'
        ? body.entries.flatMap((entry) => [`- **${oneLine(entry.name)}**`, ...valueLines(entry.value, '  ')])
        : valueLines(body, '');
  return [`**${oneLine(answer.prompt)}**`, lines.join('\n')];
}

function fieldLines(field: SummaryField): string[] {
  return [`  - *${oneLine(field.label)}*`, ...valueLines(field.value, '    ')];
}

function valueLines(value: SummaryValue, indent: string): string[] {
  return value.kind === 'text'
    ? indented(proseLines(value.text), indent)
    : value.items.map((item) => `${indent}- ${oneLine(item)}`);
}

function anchorOf(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** Moves every heading outside a fenced block down one level. The only fences in a file are the package's own: backtick fences at the start of a line. */
function demoted(markdown: string): string {
  let inFence = false;
  return markdown
    .split('\n')
    .map((line) => {
      if (line.startsWith('```')) {
        inFence = !inFence;
        return line;
      }
      return !inFence && /^#{1,5} /.test(line) ? `#${line}` : line;
    })
    .join('\n');
}
