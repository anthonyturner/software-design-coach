import { answerFromText, textOfAnswer } from './answer-text';

describe('answerFromText', () => {
  it('keeps text answers exactly as typed', () => {
    expect(answerFromText('long-text', ' two\n\nlines ')).toBe(' two\n\nlines ');
    expect(answerFromText('short-text', 'one')).toBe('one');
  });

  it('turns each non-blank line of a list answer into an item', () => {
    expect(answerFromText('string-list', ' receptionist \n\npatient\n')).toEqual(['receptionist', 'patient']);
  });
});

describe('textOfAnswer', () => {
  it('shows nothing for an unanswered question', () => {
    expect(textOfAnswer(undefined)).toBe('');
  });

  it('shows a list answer one item per line', () => {
    expect(textOfAnswer(['receptionist', 'patient'])).toBe('receptionist\npatient');
  });

  it('shows a text answer as it is', () => {
    expect(textOfAnswer('text')).toBe('text');
  });
});
