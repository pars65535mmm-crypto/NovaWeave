// /Users/tyamizumoti/その他/ゲーム関連/マイクラ関連/ソフト/NovaWeave/novaweave/src/core/types/NodeDefinition.ts

export type PropertyType = "number" | "text" | "boolean" | "select" | string;

export interface NodeProperty {
  id: string;
  type: PropertyType;
  default: unknown;
  label?: string;        // インスペクター表示用ラベル
  min?: number;          // 数値型用：最小値
  max?: number;          // 数値型用：最大値
  step?: number;         // 数値型用：刻み幅
  options?: string[];    // セレクトボックス用：選択肢
}

export interface PinDefinition {
  id: string;
  type: "FLOW" | "NUMBER" | "STRING" | "BOOLEAN" | "POSITION" | "ENTITY" | string;
  required: boolean;
  fallbackProperty?: string;
}

// 🪐 Day3仕様：未来のAI補完・UI強化・テンプレートを完全内包した要塞スキーマ！
export interface NodeDefinition {
  id: string;
  displayName: string;
  category: "Event" | "Action" | "Data" | "Control" | "Math" | "Adapter" | string;
  color: string;
  icon: string;
  runtimeType: string;
  inputs: PinDefinition[];
  outputs: PinDefinition[];
  properties: NodeProperty[];
  
  // 🚀 完全汎用化のためのResolver用フィールド
  resolverType?: "ACTION" | "TRIGGER" | "EXPRESSION" | "POSITION_PROVIDER" | "POSITION_COMPOSER" | "VARIABLE" | "CONDITION" | "FLOW_CONTROL" | string;
  expressionTemplate?: string;
  operations?: Record<string, string>;
  requiredImports?: string[];

  // ⚡ 拡張メタデータセクター（Day7の検索・UI強化の伏線！）
  ui?: {
    width?: number;
    accentColor?: string;
    icon?: string;
  };
  keywords?: string[];
  tags?: string[];
  documentation?: string; // ツールチップ用テキスト
  
  // 🔮 運命のテンプレート：ここにJavaコードの型（式・文どちらも対応）を定義！
  codeTemplate?: {
    fabric: string;
    forge: string;
  };
}

export interface NodeDefinitionRegistry {
  [nodeType: string]: NodeDefinition;
}