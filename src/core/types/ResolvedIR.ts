export interface BaseStatement {
  id?: string;
  type: string;
  nodeType?: string;
  next?: string[];
  condition?: string;
  nextTrue?: string;
  nextFalse?: string;
  code?: string;
  properties?: Record<string, any>;
  [key: string]: any; // 👑 接続ピンから動的にハイドレートされた Expression（positionやpowerなど）を何でも受け入れる無敵の拡張宣言！
}

export interface ResolvedIR {
  imports: Set<string>; 
  triggers: ResolvedTrigger[];
}

export interface ResolvedTrigger {
  eventType: string; 
  statements: Statement[]; 
}

// 🪐 連合を BaseStatement 一本に集約！これで新ノードが100個増えても型定義の修正はゼロ！
export type Statement = BaseStatement;
