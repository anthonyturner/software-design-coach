import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, signal, untracked, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectStore } from '../../app/project-store';
import { adjacentSteps, diagramFor, moduleDetails, moduleNodes, stepAnswers } from '../../domain';
import type { AnswerValue, DiagramKind, ModuleNode, Project } from '../../domain';
import { DiagramPanelComponent } from '../diagram-panel/diagram-panel.component';
import { JourneyRailComponent } from '../journey-rail/journey-rail.component';
import { ModuleDrawerComponent } from '../module-drawer/module-drawer.component';
import { StepPanelComponent } from '../step-panel/step-panel.component';
import { StorageNoticeComponent } from '../storage-notice/storage-notice.component';

interface DiagramView {
  readonly kind: DiagramKind;
  readonly source: string | undefined;
  /** The modules the diagram draws, to map an activated node back to its row. */
  readonly nodes: readonly ModuleNode[];
  readonly names: ReadonlyMap<string, string>;
}

function diagramView(project: Project, kind: DiagramKind): DiagramView {
  const nodes = moduleNodes(project, kind);
  return { kind, source: diagramFor(project, kind), nodes, names: new Map(nodes.map((node) => [node.nodeId, node.name])) };
}

@Component({
  selector: 'sdc-wizard',
  imports: [DiagramPanelComponent, JourneyRailComponent, ModuleDrawerComponent, RouterLink, StepPanelComponent, StorageNoticeComponent],
  templateUrl: './wizard.component.html',
  styleUrl: './wizard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'dismissDrawer($event)' },
})
export class WizardComponent {
  readonly id = input.required<string>();

  protected readonly store = inject(ProjectStore);

  protected readonly view = computed(() => {
    const project = this.store.project();
    const workflow = this.store.workflow();
    const step = this.store.currentStep();
    if (!project || !workflow || !step) {
      return undefined;
    }
    const { previous, next } = adjacentSteps(workflow, step.id);
    return {
      projectName: project.name,
      workflowTitle: workflow.title,
      step,
      answers: stepAnswers(project, step.id),
      entities: project.entities,
      diagram: step.diagram && diagramView(project, step.diagram),
      stepNumber: workflow.steps.indexOf(step) + 1,
      stepCount: workflow.steps.length,
      previousId: previous?.id,
      nextId: next?.id,
    };
  });

  private readonly openModuleId = signal<string | undefined>(undefined);
  private readonly panel = viewChild(DiagramPanelComponent);
  private readonly side = viewChild<ElementRef<HTMLElement>>('side');

  /** The module whose drawer is open, while the diagram shown still draws it. */
  protected readonly drawer = computed(() => {
    const id = this.openModuleId();
    const project = this.store.project();
    const drawn = this.view()?.diagram?.nodes.some((node) => node.moduleId === id);
    return id !== undefined && project && drawn ? moduleDetails(project, id) : undefined;
  });

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => {
        void this.store.open(id);
      });
    });
    // A module that is renamed to nothing, removed, or no longer drawn closes its drawer for good, so it does not come back, taking focus, when the module does.
    effect(() => {
      if (this.openModuleId() !== undefined && this.drawer() === undefined) {
        untracked(() => this.openModuleId.set(undefined));
      }
    });
  }

  protected openModule(nodeId: string): void {
    const node = this.view()?.diagram?.nodes.find((candidate) => candidate.nodeId === nodeId);
    if (node) {
      this.openModuleId.set(node.moduleId);
    }
  }

  /** Escape closes the drawer from inside it or from the diagram, never from a step field, and never when something else already took the key. */
  protected dismissDrawer(event: Event): void {
    const inside = event.target instanceof Node && this.side()?.nativeElement.contains(event.target);
    if (this.openModuleId() !== undefined && inside && !event.defaultPrevented) {
      event.preventDefault();
      this.closeDrawer();
    }
  }

  protected closeDrawer(): void {
    this.openModuleId.set(undefined);
    this.panel()?.focusLastNode();
  }

  protected answer(event: { readonly questionId: string; readonly value: AnswerValue }): void {
    const step = this.view()?.step;
    if (step) {
      this.store.answer(step.id, event.questionId, event.value);
    }
  }

  protected goTo(stepId: string | undefined): void {
    if (stepId) {
      this.store.goTo(stepId);
    }
  }
}
