import { TestBed } from '@angular/core/testing';
import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({ imports: [ShellComponent] }).compileComponents();
    const fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('names the product in the page heading', async () => {
    const shell = await render();

    expect(shell.querySelector('header h1')?.textContent).toBe('Design Coach');
  });

  it('offers a main landmark that the skip link targets', async () => {
    const shell = await render();

    const main = shell.querySelector('main');
    const skipLink = shell.querySelector('a.shell__skip-link');
    expect(main?.id).toBe('main');
    expect(skipLink?.getAttribute('href')).toBe('#main');
  });
});
