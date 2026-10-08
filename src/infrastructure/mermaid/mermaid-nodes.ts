import type { DiagramInteraction } from '../../app/diagram-renderer';

/**
 * Makes the flowchart nodes that `interaction` names operable like buttons. Mermaid's `click`
 * directive is off in `'strict'` mode (ADR-0007), so this works on the drawn SVG instead.
 *
 * Mermaid 12 draws each flowchart node as `g.node` whose id is `<svgId>-flowchart-<nodeId>-<n>`, where
 * `<n>` is a counter it appends; subgraphs are `g.cluster` and never match. That format is Mermaid's,
 * not ours, so it is read here and nowhere else.
 */
export function activateNodes(host: ParentNode, svgId: string, interaction: DiagramInteraction): void {
  const prefix = `${svgId}-flowchart-`;
  for (const group of host.querySelectorAll<SVGElement>('g.node')) {
    if (!group.id.startsWith(prefix)) {
      continue;
    }
    const nodeId = group.id.slice(prefix.length).replace(/-\d+$/, '');
    const name = interaction.nodes.get(nodeId);
    if (name !== undefined) {
      makeOperable(group, name, () => interaction.onActivate(nodeId, group));
    }
  }
}

function makeOperable(element: SVGElement, name: string, activate: () => void): void {
  element.setAttribute('tabindex', '0');
  element.setAttribute('role', 'button');
  element.setAttribute('aria-label', name);
  element.style.cursor = 'pointer';
  element.addEventListener('click', activate);
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate();
    }
  });
}
