import type { AnswerValue, TextQuestion } from '../../domain';

export function textOfAnswer(value: AnswerValue | undefined): string {
  if (value === undefined) {
    return '';
  }
  return typeof value === 'string' ? value : value.join('\n');
}

export function answerFromText(kind: TextQuestion['kind'], text: string): AnswerValue {
  if (kind !== 'string-list') {
    return text;
  }
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}
