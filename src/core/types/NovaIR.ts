export interface NovaIR {
  triggers: IRTrigger[];
}

export interface IRTrigger {
  id: string;
  type: "PLAYER_RIGHT_CLICK" | "BLOCK_BREAK";
  entry: string; // 最初に実行するアクションノードのID
  nodes: Record<string, IRNode>; // このイベント内で動く全ノードの辞書
}

export type IRNode = IRAction | IRControl;

export interface IRAction {
  id: string;
  type: "ACTION"; // 判別用
  nodeType: string; // "EXPLOSION" など
  parameters: Record<string, IRData>;
  properties?: Record<string, any>;
  next: string[]; // 次に繋がるノードIDのリスト
}

export interface IRControl {
  id: string;
  type: "CONTROL"; // 判別用
  nodeType: "IF" | "FOR" | "WHILE" | "LOOP";
  condition?: IRData;
  parameters?: Record<string, IRData>;
  properties?: Record<string, any>;
  nextTrue?: string;
  nextFalse?: string;
  nextBody?: string;
  nextAfter?: string;
}

export interface IRData {
  type: string; // "NUMBER" | "POSITION" など
  value?: unknown;
  inputs?: IRData[];
}
