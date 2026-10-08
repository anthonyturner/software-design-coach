import { entityLabel, isNamed, listField, textField } from '../entity/entities';
import type { Entity } from '../entity/entity.types';
import type { Project } from '../project/project.types';

/** What the drawer shows of one module: its own words, and its neighbours by name. */
export interface ModuleDetails {
  readonly id: string;
  readonly name: string;
  readonly purpose: string;
  readonly responsibilities: readonly string[];
  readonly hides: string;
  readonly interfaceSketch: string;
  /** The named modules it needs, in the order the user listed them. */
  readonly dependencies: readonly string[];
  /** The named modules that need it, in the order the modules are listed. */
  readonly dependents: readonly string[];
}

/**
 * The details of the module with this id, or `undefined` when there is no such module or it has no
 * name yet. An unnamed row is not drawn in any diagram, so nothing can ask for it, and an id that
 * has since been removed is not an error either: the answer is simply that there is nothing to show.
 */
export function moduleDetails(project: Project, moduleId: string): ModuleDetails | undefined {
  const modules = project.entities.module;
  const module = modules.find((candidate) => candidate.id === moduleId);
  if (!module || !isNamed(module)) {
    return undefined;
  }
  const needed = listField(module, 'dependsOn');
  return {
    id: module.id,
    name: entityLabel(module, 'module'),
    purpose: textField(module, 'purpose').trim(),
    responsibilities: listField(module, 'responsibilities').map((line) => line.trim()).filter((line) => line !== ''),
    hides: textField(module, 'hides').trim(),
    interfaceSketch: textField(module, 'interface').trim(),
    dependencies: needed.map((id) => modules.find((found) => found.id === id)).filter(isNamedModule).map(nameOf),
    dependents: modules.filter((other) => isNamed(other) && listField(other, 'dependsOn').includes(module.id)).map(nameOf),
  };
}

function isNamedModule(entity: Entity | undefined): entity is Entity {
  return entity !== undefined && isNamed(entity);
}

function nameOf(entity: Entity): string {
  return entityLabel(entity, 'module');
}
