import { TestBed } from '@angular/core/testing';
import type { OpenState } from '../../app/project-store';
import { OpenStateMessageComponent } from './open-state-message.component';

describe('OpenStateMessageComponent', () => {
  async function say(state: OpenState): Promise<string | undefined> {
    const fixture = TestBed.createComponent(OpenStateMessageComponent);
    fixture.componentRef.setInput('state', state);
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).querySelector('p')?.textContent?.trim();
  }

  it.each<OpenState>(['none', 'loading'])('says the project is opening while it is %s', async (state) => {
    expect(await say(state)).toBe('Opening your project…');
  });

  it('says the project is not in this browser, and why that may be', async () => {
    expect(await say('not-found')).toContain('This project is not in this browser');
  });

  it('says a project from a newer version was left untouched', async () => {
    expect(await say('unreadable')).toContain('has been left untouched');
  });

  it('says nothing once the project is open', async () => {
    expect(await say('open')).toBeUndefined();
  });
});
