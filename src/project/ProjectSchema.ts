import { NodeGraph } from "../core/types/NodeGraph.js";

export interface NovaProject {
  version: string;          // エディタのプロジェクトバージョン (例: "0.1")
  modId: string;            // マイクラModとしての識別ID (例: "explosion_sword")
  minecraftVersion: string; // 対象のマイクラバージョン (例: "1.21")
  loader: "fabric" | "forge" | "neoforge";
  graph: NodeGraph;         // コアエンジンが処理するノードグラフ本体
  metadata: {
    name: string;
    author: string;
    description: string;
    createdAt: number;
    modifiedAt: number;
  };
}