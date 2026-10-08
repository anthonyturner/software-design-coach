import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { JourneyStop, StepState } from '../../domain';

const MARKERS: Readonly<Record<StepState, string>> = {
  done: '✓',
  current: '▶',
  'in-progress': '◐',
  'not-started': '○',
};

const STATE_NAMES: Readonly<Record<StepState, string>> = {
  done: 'done',
  current: '',
  'in-progress': 'in progress',
  'not-started': 'not started',
};

@Component({
  selector: 'sdc-journey-rail',
  templateUrl: './journey-rail.component.html',
  styleUrl: './journey-rail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JourneyRailComponent {
  readonly stops = input.required<readonly JourneyStop[]>();
  readonly selected = output<string>();

  protected readonly items = computed(() =>
    this.stops().map((stop) => ({
      stepId: stop.stepId,
      label: `${stop.number}. ${stop.title}`,
      marker: MARKERS[stop.state],
      stateName: STATE_NAMES[stop.state],
      classes: `rail__step rail__step--${stop.state}`,
      current: stop.state === 'current',
    })),
  );
}
