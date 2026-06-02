import { NodeDefinition } from "../core/types/NodeDefinition.js";
import { Node } from "../core/types/NodeGraph.js";

export interface VirtualNode {
  id: string;
  type: string;
  displayName: string;
  color: string;
  category: string;
  inputs: { id: string; type: string }[];
  outputs: { id: string; type: string }[];
  properties: Record<string, unknown>;
}

// JSON（NodeDefinition）を読み込んで、エディタ用の仮想ノードのインスタンスを生成する工場
export function createVirtualNode(instanceId: string, definition: NodeDefinition): VirtualNode {
  const initialProperties: Record<string, unknown> = {};

  // 定義に書かれているデフォルト値をプロパティの初期値として自動セット
  if (definition.properties) {
    for (const prop of definition.properties) {
      initialProperties[prop.id] = prop.default;
    }
  }

  return {
    id: instanceId,
    type: definition.runtimeType,
    displayName: definition.displayName,
    color: definition.color,
    category: definition.category,
    inputs: definition.inputs.map(i => ({ id: i.id, type: i.type })),
    outputs: definition.outputs.map(o => ({ id: o.id, type: o.type })),
    properties: initialProperties
  };
}

// 仮想ノードから、コアコンパイラ（Engine）が解釈できる純粋な「NodeGraph用のノード」へ変換する
export function exportToGraphNode(vNode: VirtualNode): Node {
  return {
    id: vNode.id,
    type: vNode.type,
    properties: vNode.properties
  };
}