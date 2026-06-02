import { NodeGraph, ValidationResult } from "../types/NodeGraph.js";
import { NodeDefinitionRegistry } from "../types/NodeDefinition.js";

const VisitState = {
  Unvisited: 0,
  Visiting: 1,
  Visited: 2,
} as const;
type VisitState = typeof VisitState[keyof typeof VisitState];

// 引数に definitions（ノード定義集）を追加！
export function validateGraph(graph: NodeGraph, definitions: NodeDefinitionRegistry): ValidationResult {
  const errors: string[] = [];
  const maxNodeCount = 2000;
  const maxDepth = 100;

  const nodeIds = Object.keys(graph.nodes);
  if (nodeIds.length > maxNodeCount) {
    errors.push(`エラー: ノード数が多すぎます (上限 ${maxNodeCount})。`);
    return { isValid: false, errors };
  }

  // 接続チェック＆隣接リスト構築
  const adjacencyList: Record<string, string[]> = {};
  for (const id of nodeIds) {
    adjacencyList[id] = [];
  }

  for (const edge of graph.edges) {
    if (!graph.nodes[edge.fromNode] || !graph.nodes[edge.toNode]) {
      errors.push(`エラー: 存在しないノードへの接続があります。 (${edge.fromNode} -> ${edge.toNode})`);
      return { isValid: false, errors };
    }
    adjacencyList[edge.fromNode].push(edge.toNode);
  }

  // 循環参照チェック
  const state = new Map<string, VisitState>();
  for (const id of nodeIds) state.set(id, VisitState.Unvisited);

  function detectCycleAndDepth(id: string, depth: number): boolean {
    if (depth > maxDepth) {
      errors.push(`エラー: ノードのネスト階層が深すぎます (最大 ${maxDepth})。`);
      return false;
    }
    state.set(id, VisitState.Visiting);
    for (const nextId of adjacencyList[id]) {
      const nextState = state.get(nextId);
      if (nextState === VisitState.Visiting) {
        errors.push(`エラー: 循環参照（無限ループ）が検出されました。 (ノードID: ${id})`);
        return false;
      }
      if (nextState === VisitState.Unvisited) {
        if (!detectCycleAndDepth(nextId, depth + 1)) return false;
      }
    }
    state.set(id, VisitState.Visited);
    return true;
  }

  for (const id of nodeIds) {
    if (state.get(id) === VisitState.Unvisited) {
      if (!detectCycleAndDepth(id, 1)) return { isValid: false, errors };
    }
  }

  // ==========================================
  // ★ 新機能 1: 型一致チェック (validatePinTypes)
  // ==========================================
  for (const edge of graph.edges) {
    const fromNodeObj = graph.nodes[edge.fromNode];
    const toNodeObj = graph.nodes[edge.toNode];

    const fromDef = definitions[fromNodeObj.type];
    const toDef = definitions[toNodeObj.type];

    if (!fromDef || !toDef) {
      errors.push(`エラー: ノードタイプ [${fromNodeObj.type}] または [${toNodeObj.type}] の定義が見つかりません。`);
      continue;
    }

    // 出力ピンと入力ピンの型を取得
    const outputPin = fromDef.outputs.find(p => p.id === edge.fromPin);
    const inputPin = toDef.inputs.find(p => p.id === edge.toPin);

    if (!outputPin) {
      errors.push(`エラー: ノード [${edge.fromNode}] に出力ピン [${edge.fromPin}] は存在しません。`);
      continue;
    }
    if (!inputPin) {
      errors.push(`エラー: ノード [${edge.toNode}] に入力ピン [${edge.toPin}] は存在しません。`);
      continue;
    }

    // 型が一致しているか検証
    if (outputPin.type !== inputPin.type) {
      errors.push(`Error: 型ミスマッチです。 (Expected ${inputPin.type}, Received ${outputPin.type})`);
    }
  }

  // ==========================================
  // ★ 新機能 2: 必須入力チェック (validateRequiredInputs)
  // ==========================================
  for (const nodeId of nodeIds) {
    const nodeObj = graph.nodes[nodeId];
    const def = definitions[nodeObj.type];
    if (!def) continue;

    // このノードに向かって繋がっているすべての入力ピンをリスト化
    const connectedInputPins = graph.edges
      .filter(edge => edge.toNode === nodeId)
      .map(edge => edge.toPin);

    // 必須入力なのに繋がっていないピンがないかチェック
    for (const inputPin of def.inputs) {
      const isConnected = connectedInputPins.includes(inputPin.id);
      const hasPropertyValue = nodeObj.properties[inputPin.fallbackProperty || inputPin.id] !== undefined;

      // 社長の三原則:
      // 「必須なのに」「線が来てなくて」「プロパティへの逃げ道も許可されておらず、またはプロパティに値もない」
      if (inputPin.required && !isConnected) {
        if (!inputPin.fallbackProperty || !hasPropertyValue) {
          errors.push(`エラー: ノード [${nodeId}] の必須入力ピン [${inputPin.id}] が接続されておらず、プロパティ値もありません。`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}