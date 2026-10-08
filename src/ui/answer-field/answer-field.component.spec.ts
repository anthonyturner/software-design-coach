import { TestBed } from '@angular/core/testing';
import type { AnswerValue, Question } from '../../domain';
import { AnswerFieldComponent } from './answer-field.component';

function textareaIn(page: HTMLElement): HTMLTextAreaElement {
  const field = page.querySelector('textarea');
  if (!field) {
    throw new Error('the textarea should be there');
  }
  return field;
}

describe('AnswerFieldComponent', () => {
  const listQuestion: Question = { id: 'users', prompt: 'Who uses this?', kind: 'string-list', hint: 'One per line.' };

  function render(question: Question): {
    page: HTMLElement;
    answers: AnswerValue[];
    echo: (value: AnswerValue) => Promise<void>;
  } {
    const fixture = TestBed.createComponent(AnswerFieldComponent);
    const answers: AnswerValue[] = [];
    fixture.componentInstance.answered.subscribe((value) => answers.push(value));
    fixture.componentRef.setInput('question', question);
    fixture.detectChanges();
    return {
      page: fixture.nativeElement as HTMLElement,
      answers,
      echo: async (value) => {
        fixture.componentRef.setInput('value', value);
        await fixture.whenStable();
      },
    };
  }

  it('labels the field with the prompt and ties the hint to it', () => {
    const { page } = render(listQuestion);
    const field = textareaIn(page);

    expect(page.querySelector('label')?.textContent).toBe('Who uses this?');
    expect(page.querySelector('label')?.getAttribute('for')).toBe(field.id);
    expect(field.getAttribute('aria-describedby')).toBe(page.querySelector('.field__hint')?.id);
  });

  it('uses a single-line input for a short answer', () => {
    const { page } = render({ id: 'success', prompt: 'How will you know?', kind: 'short-text' });

    expect(page.querySelector('input[type="text"]')).toBeTruthy();
    expect(page.querySelector('textarea')).toBeNull();
  });

  it('answers a list question with one item per non-blank line', () => {
    const { page, answers } = render(listQuestion);
    const field = textareaIn(page);

    field.value = 'receptionist\n\n patient ';
    field.dispatchEvent(new Event('input'));

    expect(answers).toEqual([['receptionist', 'patient']]);
  });

  it('does not tidy away a blank line the user is in the middle of typing', async () => {
    const { page, echo } = render(listQuestion);
    const field = textareaIn(page);

    field.value = 'receptionist\n';
    field.dispatchEvent(new Event('input'));
    await echo(['receptionist']);

    expect(field.value).toBe('receptionist\n');
  });

  it('shows an answer that arrives from outside', async () => {
    const { page, echo } = render(listQuestion);

    await echo(['receptionist', 'patient']);

    expect(textareaIn(page).value).toBe('receptionist\npatient');
  });
});
