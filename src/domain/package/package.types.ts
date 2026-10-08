/** One file of the design package, ready to save: where it goes, what it is called, and what it says. */
export interface PackageFile {
  /** The file name, such as `module-design.md`. */
  readonly path: string;
  /** The file's own heading, which names it in the combined document's contents. */
  readonly title: string;
  readonly markdown: string;
}
