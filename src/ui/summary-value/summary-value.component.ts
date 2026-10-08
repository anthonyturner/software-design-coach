import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { SummaryValue } from '../../domain';

/** A written value on the summary: a paragraph that keeps its line breaks, or a bulleted list. */
@Component({
  selector: 'sdc-summary-value',
  templateUrl: './summary-value.component.html',
  styleUrl: './summary-value.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryValueComponent {
  readonly value = input.required<SummaryValue>();
}
