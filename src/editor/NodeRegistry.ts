// /Users/tyamizumoti/その他/ゲーム関連/マイクラ関連/ソフト/NovaWeave/novaweave/src/editor/NodeRegistry.ts
import { NodeDefinition } from "../core/types/NodeDefinition.js"; // 👈 一本化した型をインポート！

export class NodeRegistry {
  private static instance: NodeRegistry;
  private registry: Map<string, NodeDefinition> = new Map();

  private constructor() {
    this.loadAllNodes();
  }

  private loadAllNodes() {
    const globalDefinitions = (globalThis as any).__NOVAWEAVE_NODE_DEFINITIONS__ as Record<string, NodeDefinition> | undefined;

    if (globalDefinitions) {
      for (const definition of Object.values(globalDefinitions)) {
        if (definition && definition.id && definition.runtimeType) {
          this.register(definition as NodeDefinition);
        }
      }
    }
  }

  public static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  public register(definition: NodeDefinition) {
    const upperKey = definition.runtimeType.toUpperCase();
    this.registry.set(upperKey, definition);
  }

  public get(runtimeType: string): NodeDefinition | undefined {
    return this.registry.get(runtimeType.toUpperCase());
  }

  public getAll(): NodeDefinition[] {
    return Array.from(this.registry.values());
  }

  public getDefaultProperties(runtimeType: string): Record<string, any> {
    const def = this.get(runtimeType);
    const defaults: Record<string, any> = {};
    if (def && def.properties) {
      for (const p of def.properties) {
        defaults[p.id] = p.default;
      }
    }
    return defaults;
  }
}
