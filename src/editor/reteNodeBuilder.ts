import { ClassicPreset } from "rete";
import { NodeDefinition } from "../core/types/NodeDefinition.js";

export function buildReteNodeFromDefinition(
  definition: NodeDefinition,
  nodeData: { id: string; properties?: Record<string, any> }
): ClassicPreset.Node {
  
  const flowSocket = new ClassicPreset.Socket("FLOW");
  const numberSocket = new ClassicPreset.Socket("NUMBER");
  const positionSocket = new ClassicPreset.Socket("POSITION");
  const booleanSocket = new ClassicPreset.Socket("BOOLEAN");
  const stringSocket = new ClassicPreset.Socket("STRING");
  const anySocket = new ClassicPreset.Socket("ANY");

  const node = new ClassicPreset.Node(definition.displayName);
  node.id = nodeData.id;

  // 🌟 1. インプットPinの動的自動生成
  if (definition.inputs) {
    for (const inputDef of definition.inputs) {
      const typeUpper = inputDef.type.toUpperCase();
      
      if (typeUpper === "FLOW") {
        node.addInput(inputDef.id, new ClassicPreset.Input(flowSocket, "FLOW"));
      } else if (typeUpper === "POSITION") {
        node.addInput(inputDef.id, new ClassicPreset.Input(positionSocket, inputDef.id));
      } else if (typeUpper === "BOOLEAN") {
        node.addInput(inputDef.id, new ClassicPreset.Input(booleanSocket, inputDef.id));
      } else if (typeUpper === "STRING") {
        node.addInput(inputDef.id, new ClassicPreset.Input(stringSocket, inputDef.id));
      } else if (typeUpper === "ANY") {
        node.addInput(inputDef.id, new ClassicPreset.Input(anySocket, inputDef.id));
      } else {
        node.addInput(inputDef.id, new ClassicPreset.Input(numberSocket, inputDef.id));
      }
    }
  }

  // 🌟 2. アウトプットPinの動的自動生成
  if (definition.outputs) {
    for (const outputDef of definition.outputs) {
      const typeUpper = outputDef.type.toUpperCase();
      
      if (typeUpper === "FLOW") {
        node.addOutput(outputDef.id, new ClassicPreset.Output(flowSocket, "FLOW"));
      } else if (typeUpper === "POSITION") {
        node.addOutput(outputDef.id, new ClassicPreset.Output(positionSocket, outputDef.id));
      } else if (typeUpper === "BOOLEAN") {
        node.addOutput(outputDef.id, new ClassicPreset.Output(booleanSocket, outputDef.id));
      } else if (typeUpper === "STRING") {
        node.addOutput(outputDef.id, new ClassicPreset.Output(stringSocket, outputDef.id));
      } else if (typeUpper === "ANY") {
        node.addOutput(outputDef.id, new ClassicPreset.Output(anySocket, outputDef.id));
      } else {
        node.addOutput(outputDef.id, new ClassicPreset.Output(numberSocket, outputDef.id));
      }
    }
  }

  // 👑 【社長のProperty型システムとの完全決戦】
  // ノードの見た目を壊す「余計なControl（入力ボックス）」は1行も追加しない！！！
  // その代わり、右側のインスペクターがこの値を読み書きできるように、
  // ノードの隠しフィールド（data.properties）に初期値や最新のセーブデータを完璧にハイドレートしておく！
  
  (node as any).properties = {};
  
  if (definition.properties) {
    definition.properties.forEach((propDef: any) => {
      // 画面（セーブデータ）にある値を使うか、無ければJSONのデフォルト値を代入
      (node as any).properties[propDef.id] = nodeData.properties?.[propDef.id] ?? propDef.default;
    });
  }

  // ランタイムタイプの埋め込み
  (node as any).runtimeType = definition.runtimeType;
  
  return node;
}
