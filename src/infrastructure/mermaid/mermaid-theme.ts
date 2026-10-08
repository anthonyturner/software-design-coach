/** The part of `CSSStyleDeclaration` a theme needs, so a test can supply tokens without a page. */
export type TokenSource = Pick<CSSStyleDeclaration, 'getPropertyValue'>;

/** Which design token (ADR-0006) colours which part of a Mermaid drawing. */
const TOKEN_FOR_VARIABLE: Readonly<Record<string, string>> = {
  background: '--sdc-color-bg',
  primaryColor: '--sdc-color-surface-raised',
  primaryTextColor: '--sdc-color-text',
  primaryBorderColor: '--sdc-color-accent',
  secondaryColor: '--sdc-color-surface',
  tertiaryColor: '--sdc-color-surface',
  textColor: '--sdc-color-text',
  lineColor: '--sdc-color-text-muted',
  clusterBkg: '--sdc-color-surface',
  clusterBorder: '--sdc-color-border-strong',
  edgeLabelBackground: '--sdc-color-surface',
  fontFamily: '--sdc-font-sans',
};

/**
 * Mermaid `themeVariables` read from the page's tokens, so a change to a token changes the diagrams.
 * A token the page does not define is left out and Mermaid keeps its own value for that part.
 */
export function themeVariablesFrom(tokens: TokenSource): Readonly<Record<string, string | boolean>> {
  const variables: Record<string, string | boolean> = { darkMode: true };
  for (const [variable, token] of Object.entries(TOKEN_FOR_VARIABLE)) {
    const value = tokens.getPropertyValue(token).trim();
    if (value !== '') {
      variables[variable] = value;
    }
  }
  return variables;
}
