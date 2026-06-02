import { NodeGraph, Node } from "../types/NodeGraph.js";
import { NovaIR, IRTrigger, IRNode, IRAction, IRData } from "../types/NovaIR.js";

export function parseGraph(graph: NodeGraph): NovaIR {
  const triggers: IRTrigger[] = [];

  // 1. グラフ内からイベントノード（起点）を探し出す
  const eventNodes = Object.values(graph.nodes).filter(
    (node) => node.type === "PLAYER_RIGHT_CLICK" || node.type === "BLOCK_BREAK"
  );

  for (const eventNode of eventNodes) {
    const trigger = parseTrigger(graph, eventNode);
    triggers.push(trigger);
  }

  return { triggers };
}

function parseTrigger(graph: NodeGraph, eventNode: Node): IRTrigger {
  const nodesRegistry: Record<string, IRNode> = {};
  
  // イベントノードからの最初のFLOW接続を探す
  const firstEdge = graph.edges.find(
    (e) => e.fromNode === eventNode.id && e.fromPin === "flow"
  );
  
  const entryNodeId = firstEdge ? firstEdge.toNode : "";
  const queue: string[] = [];
  if (entryNodeId) {
    queue.push(entryNodeId);
  }

  // 🌟【修正の要：その1】データノードを漏れなく登録するため、グラフ内の全ノードを走査対象にする
  // フローが繋がっているアクションノードを起点に、データ線で繋がっている上流ノードもすべて芋づる式に収集します
  const visited = new Set<string>();
  const allCollectedNodeIds = new Set<string>();
  if (entryNodeId) allCollectedNodeIds.add(entryNodeId);

  // フローノードの探索ループ
  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    if (visited.has(currentNodeId)) continue;
    visited.add(currentNodeId);

    const nodeObj = graph.nodes[currentNodeId];
    if (!nodeObj) continue;

    const currentType = nodeObj.type.toUpperCase();
    const flowPins = currentType === "IF"
      ? new Set(["trueFlow", "falseFlow"])
      : currentType === "FOR" || currentType === "WHILE"
        ? new Set(["bodyFlow", "flow", "trueFlow", "falseFlow"])
        : new Set(["flow"]);

    // 次のFLOW接続先をQueueに叩き込む
    const nextEdges = graph.edges.filter((e) => e.fromNode === currentNodeId && flowPins.has(e.fromPin));
    const nextNodeIds = nextEdges.map((e) => e.toNode);

    for (const nextId of nextNodeIds) {
      allCollectedNodeIds.add(nextId);
      if (!visited.has(nextId)) {
        queue.push(nextId);
      }
    }
  }

  // 🌟【修正の要：その2】データ線だけで浮いているノード（MathやNumber等）も全頭検査して収集！
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const edge of graph.edges) {
      // 収集済みのノードに入力されているデータ線があれば、その送信元ノードも収集対象にする
      if (allCollectedNodeIds.has(edge.toNode) && !allCollectedNodeIds.has(edge.fromNode)) {
        allCollectedNodeIds.add(edge.fromNode);
        expanded = true;
      }
    }
  }

  // 🌟【修正の要：その3】収集したすべてのノードについて、IRNode（Action型）を美しくビルド！
  for (const nodeId of allCollectedNodeIds) {
    const nodeObj = graph.nodes[nodeId];
    if (!nodeObj) continue;

    const parameters: Record<string, IRData> = {};
    
    // このノードに入力されているデータ線をスキャン
    const dataEdges = graph.edges.filter((e) => e.toNode === nodeId && e.toPin !== "flow");
    
    for (const edge of dataEdges) {
      const fromNodeObj = graph.nodes[edge.fromNode];
      if (fromNodeObj) {
        // 💡【最重要】resolveIR.ts が上流を遡れるように、sourceNodeId と sourcePin を100%ハイドレート！
        parameters[edge.toPin] = {
          type: fromNodeObj.type.toUpperCase(),
          value: fromNodeObj.properties?.value ?? undefined,
          sourceNodeId: edge.fromNode, // これが抜けていた！
          sourcePin: edge.fromPin       // これも抜けていた！
        } as any;
      }
    }

    // インスペクターの値をプロパティとしてフォールバック・保持する処理
    const properties: Record<string, any> = {};
    if (nodeObj.properties) {
      for (const [key, val] of Object.entries(nodeObj.properties)) {
        properties[key] = val;
        // 線が繋がっていないパラメータへのフォールバック
        if (!parameters[key]) {
          const inferredType =
            typeof val === "boolean" ? "BOOLEAN" :
            typeof val === "string" ? "STRING" :
            typeof val === "number" ? "NUMBER" :
            "NUMBER";
          parameters[key] = {
            type: inferredType,
            value: val
          };
        }
      }
    }

    const currentType = nodeObj.type.toUpperCase();
    const flowPins = currentType === "IF"
      ? new Set(["trueFlow", "falseFlow"])
      : currentType === "FOR" || currentType === "WHILE"
        ? new Set(["bodyFlow", "flow", "trueFlow", "falseFlow"])
        : new Set(["flow"]);
    const nextEdges = graph.edges.filter((e) => e.fromNode === nodeId && flowPins.has(e.fromPin));

    if (currentType === "IF") {
      const conditionParam = parameters["condition"];

      const irControl: IRNode = {
        id: nodeObj.id,
        type: "CONTROL",
        nodeType: "IF",
        condition: conditionParam,
        nextTrue: nextEdges.find((e) => e.fromPin === "trueFlow")?.toNode,
        nextFalse: nextEdges.find((e) => e.fromPin === "falseFlow")?.toNode
      } as any;

      nodesRegistry[nodeId] = irControl;
      continue;
    }

    if (currentType === "FOR" || currentType === "WHILE") {
      const irControl: IRNode = {
        id: nodeObj.id,
        type: "CONTROL",
        nodeType: currentType as "FOR" | "WHILE",
        condition: parameters["condition"],
        parameters,
        properties,
        nextBody: nextEdges.find((e) => e.fromPin === "bodyFlow" || e.fromPin === "trueFlow")?.toNode,
        nextAfter: nextEdges.find((e) => e.fromPin === "flow" || e.fromPin === "falseFlow")?.toNode
      } as any;

      nodesRegistry[nodeId] = irControl;
      continue;
    }

    // アクション、演算、アダプター、データ、すべてのノードをACTION形式の器に落とし込む
    const irAction: IRAction = {
      id: nodeObj.id,
      type: "ACTION",
      nodeType: nodeObj.type.toUpperCase(),
      parameters,
      properties, // MATHのoperation等を引き継ぐために追加！
      next: nextEdges.map((e) => e.toNode)
    } as any;

    nodesRegistry[nodeId] = irAction;
  }

  return {
    id: eventNode.id,
    type: eventNode.type as any,
    entry: entryNodeId,
    nodes: nodesRegistry
  };
}
