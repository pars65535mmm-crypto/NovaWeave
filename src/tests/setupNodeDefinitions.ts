import fs from "node:fs";
import path from "node:path";
import type { NodeDefinition } from "../core/types/NodeDefinition.js";

declare global {
  var __NOVAWEAVE_NODE_DEFINITIONS__: Record<string, NodeDefinition> | undefined;
}

function loadDefinitions(): Record<string, NodeDefinition> {
  const root = path.resolve("src/nodes");
  const definitions: Record<string, NodeDefinition> = {};

  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }

      if (!entry.name.endsWith(".json")) continue;
      const parsed = JSON.parse(fs.readFileSync(entryPath, "utf8")) as NodeDefinition;
      if (parsed?.runtimeType) {
        definitions[String(parsed.runtimeType).toUpperCase()] = parsed;
      }
    }
  };

  walk(root);
  return definitions;
}

globalThis.__NOVAWEAVE_NODE_DEFINITIONS__ = loadDefinitions();
