import { TestBed } from '@angular/core/testing';
import type { ChoiceQuestion } from '../../domain';
import { ChoiceFieldComponent } from './choice-field.component';

describe('ChoiceFieldComponent', () => {
  const question: ChoiceQuestion = {
    id: 'kind',
    prompt: 'What kind of thing are you building?',
    kind: 'choice',
    hint: 'Pick the closest.',
    options: [
      { value: 'application', label: 'An application' },
      { value: 'service', label: 'A service' },
    ],
  };

  function render(value?: string): { page: HTMLElement; answers: string[] } {
    const fixture = TestBed.createComponent(ChoiceFieldComponent);
    const answers: string[] = [];
    fixture.componentInstance.answered.subscribe((answer) => answers.push(answer));
    fixture.componentRef.setInput('question', question);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
    return { page: fixture.nativeElement as HTMLElement, answers };
  }

  const radios = (page: HTMLElement): HTMLInputElement[] =>
    Array.from(page.querySelectorAll<HTMLInputElement>('input[type="radio"]'));

  it('groups the options under the prompt, each labelled', () => {
    const { page } = render();

    expect(page.querySelector('legend')?.textContent).toBe(question.prompt);
    expect([...page.querySelectorAll('label')].map((label) => label.textContent?.trim())).toEqual([
      'An application',
      'A service',
    ]);
    expect(new Set(radios(page).map((radio) => radio.name)).size).toBe(1);
  });

  it('says more under an option that has a detail, as part of the same label', () => {
    const fixture = TestBed.createComponent(ChoiceFieldComponent);
    fixture.componentRef.setInput('question', {
      ...question,
      options: [{ value: 'application', label: 'An application', detail: 'People use it directly.' }, question.options[1]],
    });
    fixture.detectChanges();

    const labels = [...(fixture.nativeElement as HTMLElement).querySelectorAll('label')];
    expect(labels.map((label) => label.querySelector('.choice__detail')?.textContent)).toEqual(['People use it directly.', undefined]);
    expect(labels[0].textContent).toContain('An application');
  });

  it('checks the option that is the current answer', () => {
    const { page } = render('service');

    expect(radios(page).map((radio) => radio.checked)).toEqual([false, true]);
  });

  it('answers with the value of the option picked', () => {
    const { page, answers } = render();

    radios(page)[1].click();

    expect(answers).toEqual(['service']);
  });
});
