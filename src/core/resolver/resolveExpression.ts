// src/core/resolver/resolveExpression.ts
import { NodeRegistry } from "../../editor/NodeRegistry.js";

export interface GraphContext {
  nodes: Record<string, any>;
  cache?: Record<string, Record<string, string>>;
}

/**
 * グラフ構造を逆方向に再帰解決し、任意のピンから出力される「Javaの式文字列」を生成する
 */
export function resolveExpression(
  nodeId: string, 
  outputPinId: string, 
  graphContext: GraphContext
): string {
  // 1. 【Day 6先取り】キャッシュ機構による多重パースの防止
  if (graphContext.cache?.[nodeId]?.[outputPinId]) {
    return graphContext.cache[nodeId][outputPinId];
  }

  const node = graphContext.nodes?.[nodeId];
  if (!node) return "0.0F"; // フォールバック

  //const registryInstance = NodeRegistry.getInstance() as any;
  // ⚡ TS6133対策：未使用の nodeDef の宣言行をまるごと削除、レジストリのインスタンス確保だけに
  NodeRegistry.getInstance();

  let expression = "";

  // 2. ノードタイプごとの式解決（Expression Routing）
  switch (node.type.toUpperCase()) {
    case "NUMBER": {
      const rawVal = node.properties?.value ?? "0";
      expression = String(rawVal);
      break;
    }

    case "MATH": {
      // 結線されている上流ノードから再帰的に式を回収
      const leftNodeId = node.inputs?.a?.targetNodeId;
      const leftPinId = node.inputs?.a?.targetPinId;
      const rightNodeId = node.inputs?.b?.targetNodeId;
      const rightPinId = node.inputs?.b?.targetPinId;

      const leftExpr = leftNodeId ? resolveExpression(leftNodeId, leftPinId, graphContext) : "0.0F";
      const rightExpr = rightNodeId ? resolveExpression(rightNodeId, rightPinId, graphContext) : "0.0F";
      
      const opType = node.properties?.operation || "ADD";
      let opSign = "+";
      if (opType === "SUBTRACT") opSign = "-";
      if (opType === "MULTIPLY") opSign = "*";
      if (opType === "DIVIDE") opSign = "/";

      expression = `(${leftExpr} ${opSign} ${rightExpr})`;
      break;
    }

    case "RANDOM": {
      // インスペクターの固定設定、または将来的に結線されるかもしれない場合のフォールバック
      const minRaw = node.properties?.min ?? 1.0;
      const maxRaw = node.properties?.max ?? 10.0;

      // マイクラのJava（環境）に適合するよう、綺麗な浮動小数点数（F）の式として組み立て
      const minStr = String(minRaw).includes('.') ? `${minRaw}F` : `${minRaw}.0F`;
      const maxStr = String(maxRaw).includes('.') ? `${maxRaw}F` : `${maxRaw}.0F`;

      // 🎯 社長直伝の Java 乱数生成式をインライン展開！
      expression = `((float)(Math.random() * (${maxStr} - ${minStr}) + ${minStr}))`;
      break;
    }


    default:
      // 特例：プロパティから直接引ける固定値があればそれを使う
      if (node.properties?.[outputPinId] !== undefined) {
        expression = String(node.properties[outputPinId]);
      } else {
        expression = "/* ⚠ UNRESOLVED_EXPR */ 0.0F";
      }
      break;
  }

  // キャッシュに書き込み
  if (!graphContext.cache) graphContext.cache = {};
  if (!graphContext.cache[nodeId]) graphContext.cache[nodeId] = {};
  graphContext.cache[nodeId][outputPinId] = expression;

  return expression;
}