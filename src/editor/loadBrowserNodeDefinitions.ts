import type { NodeDefinition } from "../core/types/NodeDefinition.js";

declare global {
  var __NOVAWEAVE_NODE_DEFINITIONS__: Record<string, NodeDefinition> | undefined;
}

const modules = import.meta.glob("../nodes/**/*.json", { eager: true });
const definitions: Record<string, NodeDefinition> = {};

for (const modulePath in modules) {
  const definition = (modules[modulePath] as any).default || modules[modulePath];
  if (definition?.runtimeType) {
    definitions[String(definition.runtimeType).toUpperCase()] = definition as NodeDefinition;
  }
}

globalThis.__NOVAWEAVE_NODE_DEFINITIONS__ = definitions;
