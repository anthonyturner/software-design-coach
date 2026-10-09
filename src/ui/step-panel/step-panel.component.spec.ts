import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { emptyEntities, workflowFor } from '../../domain';
import type { Step } from '../../domain';
import { StepPanelComponent } from './step-panel.component';

const [problem, users] = workflowFor('new-project').steps;

const solo: Step = {
  id: 'solo',
  title: 'Solo',
  think: 'One thing to settle.',
  why: 'Because.',
  questions: [{ id: 'only', prompt: 'What is the one thing?', kind: 'short-text' }],
  example: 'An example.',
  challenges: ['Is it really one thing?'],
};

describe('StepPanelComponent', () => {
  let fixture: ComponentFixture<StepPanelComponent>;
  let emitted: string[];

  function render(step: Step, options: { canGoBack?: boolean; canContinue?: boolean } = {}): void {
    fixture = TestBed.createComponent(StepPanelComponent);
    emitted = [];
    fixture.componentInstance.back.subscribe(() => emitted.push('back'));
    fixture.componentInstance.next.subscribe(() => emitted.push('next'));
    fixture.componentInstance.answered.subscribe((answer) => emitted.push(`answered:${answer.questionId}`));
    fixture.componentRef.setInput('answers', {});
    fixture.componentRef.setInput('entities', emptyEntities());
    fixture.componentRef.setInput('note', '');
    fixture.componentRef.setInput('stepNumber', 1);
    fixture.componentRef.setInput('stepCount', 19);
    fixture.componentRef.setInput('openCount', 0);
    fixture.componentRef.setInput('canGoBack', options.canGoBack ?? true);
    fixture.componentRef.setInput('canContinue', options.canContinue ?? true);
    fixture.componentRef.setInput('step', step);
    fixture.detectChanges();
  }

  async function show(step: Step): Promise<void> {
    fixture.componentRef.setInput('step', step);
    await settle();
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const question = (): HTMLElement => {
    const found = page().querySelector<HTMLElement>('.step__question');
    if (!found) {
      throw new Error('the step should show a question');
    }
    return found;
  };
  const prompts = (): (string | undefined)[] =>
    [...page().querySelectorAll('.step__question .field__label')].map((label) => label.textContent?.trim());
  const position = (): string | undefined => page().querySelector('.step__question-position')?.textContent?.replace(/\s+/g, ' ').trim();
  const buttons = (): (string | undefined)[] =>
    [...page().querySelectorAll('.step__nav button')].map((button) => button.textContent?.trim());

  async function press(name: string): Promise<void> {
    const button = [...page().querySelectorAll<HTMLButtonElement>('.step__nav button')].find(
      (found) => found.textContent?.trim() === name,
    );
    if (!button) {
      throw new Error(`No button named "${name}"`);
    }
    button.click();
    await settle();
  }

  describe('a step with several questions', () => {
    it('shows the first question alone, with its place in the step and a way on', () => {
      render(problem);

      expect(prompts()).toEqual([problem.questions[0].prompt]);
      expect(position()).toBe('Question 1 of 3');
      expect(buttons()).toEqual(['Back', 'Next']);
    });

    it('moves to the next question with Next and back again with Back, without leaving the step', async () => {
      render(problem);

      await press('Next');
      expect(prompts()).toEqual([problem.questions[1].prompt]);
      expect(position()).toBe('Question 2 of 3');

      await press('Back');
      expect(prompts()).toEqual([problem.questions[0].prompt]);
      expect(emitted).toEqual([]);
    });

    it('turns Next into Continue on the last question, and Continue goes to the next step', async () => {
      render(problem);
      await press('Next');
      await press('Next');

      expect(prompts()).toEqual([problem.questions[2].prompt]);
      expect(position()).toBe('Question 3 of 3');
      expect(buttons()).toEqual(['Back', 'Continue']);

      await press('Continue');

      expect(emitted).toEqual(['next']);
    });

    it('goes to the previous step with Back on the first question', async () => {
      render(problem);

      await press('Back');

      expect(emitted).toEqual(['back']);
    });

    it('offers no Back on the first question of the first step', () => {
      render(problem, { canGoBack: false });

      expect(buttons()).toEqual(['Next']);
    });

    it('ends on the last question of the last step with a message instead of Continue', async () => {
      render(problem, { canContinue: false });
      await press('Next');
      await press('Next');

      expect(buttons()).toEqual(['Back']);
      expect(page().querySelector('.step__end')?.textContent).toContain('last step');
    });

    it('marks an optional question as optional, and a required one not', async () => {
      render(users);
      expect(page().querySelector('.step__optional')).toBeNull();

      await press('Next');

      expect(prompts()).toEqual([users.questions[1].prompt]);
      expect(position()).toBe('Question 2 of 2 Optional');
      expect(page().querySelector('.step__optional')?.textContent).toBe('Optional');
    });

    it('reports an answer against the question that is showing', async () => {
      render(problem);
      await press('Next');

      const box = page().querySelector<HTMLTextAreaElement>('.step__question textarea');
      box?.dispatchEvent(new Event('input'));

      expect(emitted).toEqual([`answered:${problem.questions[1].id}`]);
    });

    it('goes back to the first question when the step changes', async () => {
      render(problem);
      await press('Next');
      await press('Next');

      await show(users);

      expect(prompts()).toEqual([users.questions[0].prompt]);
      expect(position()).toBe('Question 1 of 2');
    });

    it('goes back to the first question when a step is opened again', async () => {
      render(problem);
      await press('Next');
      await show(users);
      await press('Next');

      await show(problem);

      expect(prompts()).toEqual([problem.questions[0].prompt]);
    });
  });

  describe('a step with one question', () => {
    it('shows no position, and goes straight to Continue', async () => {
      render(solo);

      expect(prompts()).toEqual(['What is the one thing?']);
      expect(position()).toBeUndefined();
      expect(buttons()).toEqual(['Back', 'Continue']);

      await press('Continue');

      expect(emitted).toEqual(['next']);
    });

    it('still shows an optional mark when the question is optional', () => {
      render({ ...solo, questions: [{ ...solo.questions[0], optional: true }] });

      expect(position()).toBe('Optional');
    });
  });

  describe('challenges', () => {
    it('are behind a disclosure that is closed by default, on every step', async () => {
      render(problem);
      const closed = (): boolean[] =>
        [...page().querySelectorAll('details')].filter((found) => found.querySelector('.step__challenges')).map((found) => found.open);

      expect(closed()).toEqual([false]);
      expect(page().querySelector('.step__challenges')?.closest('details')?.querySelector('summary')?.textContent).toBe(
        'Challenge my thinking',
      );
      expect([...page().querySelectorAll('.step__challenges li')].map((item) => item.textContent)).toEqual([...problem.challenges]);

      await show(users);
      expect(closed()).toEqual([false]);
    });
  });

  describe('focus', () => {
    it('does not move on first render', () => {
      render(problem);

      expect(page().contains(document.activeElement)).toBe(false);
    });

    it('moves to the new question, named by its position and prompt, when the question changes', async () => {
      render(problem);

      await press('Next');

      expect(document.activeElement).toBe(question());
      expect(question().getAttribute('role')).toBe('group');
      expect(question().getAttribute('aria-label')).toBe(`Question 2 of 3, ${problem.questions[1].prompt}`);

      await press('Back');

      expect(document.activeElement).toBe(question());
      expect(question().getAttribute('aria-label')).toBe(`Question 1 of 3, ${problem.questions[0].prompt}`);
    });

    it('includes the optional mark in the name of an optional question', async () => {
      render(users);

      await press('Next');

      expect(question().getAttribute('aria-label')).toBe(`Question 2 of 2, ${users.questions[1].prompt}, optional`);
    });

    it('moves to the step heading, not the question, when the step changes', async () => {
      render(problem);
      await press('Next');

      await show(users);

      expect(document.activeElement).toBe(page().querySelector('.step__title'));
    });
  });
});
