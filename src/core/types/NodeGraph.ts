export interface NodeGraph {
  nodes: {
    [id: string]: Node; // ←ここが下の「Node」を参照しています
  };
  edges: Edge[];
}

/** 旧 project.nova など edges / nodes 欠落データを安全に補完する */
export function normalizeNodeGraph(graph?: Partial<NodeGraph> | null): NodeGraph {
  return {
    nodes: graph?.nodes && typeof graph.nodes === "object" ? graph.nodes : {},
    edges: Array.isArray(graph?.edges) ? graph.edges : []
  };
}

// ★ここ！頭に「export」を付け忘れていました！
export interface Node {
  id: string;
  type: string;
  x?: number;      // キャンバス上のX座標
  y?: number;      // キャンバス上のY座標
  properties: Record<string, any>;
}

export interface Edge {
  id?: string;     // セーブ/ロード時に接続のIDを保持するためのフィールド
  fromNode: string;
  fromPin: string;
  toNode: string;
  toPin: string;
}

// バリデーション結果の共通型
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}