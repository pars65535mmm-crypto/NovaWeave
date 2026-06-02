import { Edge, normalizeNodeGraph } from "../../core/types/NodeGraph.js";
import { parseGraph } from "../../core/parser/parseGraph.js";
import { resolveIR } from "../../core/resolver/resolveIR.js";
import { generateJava } from "../../core/generator/common/generateJava.js";
import { NodeRegistry } from "../NodeRegistry.js";
import { LoaderType } from "../../core/types/LoaderType.js";

interface EditorNode {
  id: string;
  title: string;
  x: number;
  y: number;
  properties: any;
}

interface EditorEdge {
  id: string;
  source: string;
  sourcePin: string;
  target: string;
  targetPin: string;
}

export class EditorStore {
  public isRestoring = false; 
  private selectedNodeId: string | null = null;
  public generatedCode: string = "";
  
  // 🌟【新規追加】画面（React）がStoreの更新を検知して再レンダリングするためのリスナー集
  private listeners = new Set<() => void>();

  private nodes = new Map<string, EditorNode>([
    [
      "node_inst_1",
      { id: "node_inst_1", title: "Explosion", x: 300, y: 200, properties: { power: 5 } }
    ]
  ]);

  private edges = new Map<string, EditorEdge>();
  private pendingUpdates = new Map<string, { x: number; y: number }>();

  constructor() {
    setInterval(() => {
      if (this.pendingUpdates.size === 0) return;

      for (const [id, pos] of this.pendingUpdates) {
        const node = this.nodes.get(id);
        if (!node) continue;

        node.x = Math.round(pos.x);
        node.y = Math.round(pos.y);

      }

      if (!this.isRestoring) {
        this.compileToJava();
      }

      this.pendingUpdates.clear();
      this.notify(); // 🌟 座標移動の周期確定時にも、React側に画面更新を通知！
    }, 50);
  }

  // 🌟【新規追加】画面（React側）から、現在選ばれているノードのIDを安全にゲッチュする関数
  public getSelectedNodeId(): string | null {
    return this.selectedNodeId;
  }

  // 🌟【新規追加】右側インスペクターが、選択されたノードの詳しい中身（properties等）を覗くための関数
  public getNode(nodeId: string): EditorNode | undefined {
    return this.nodes.get(nodeId);
  }

  // 🌟【新規追加】ReactコンポーネントがStoreの「値の動き」を監視（購読）するための仕組み
  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // 🌟【新規追加】データが変わった瞬間に、監視中のReact画面を「一斉再レンダリングしろ！」と叩く号令
  private notify() {
    this.listeners.forEach(l => l());
  }

  // 🏎️ 昨日開通させた、本物の Fabric 1.20.1 向け Java 生成パイプライン
  public compileToJava() {
    try {
      const projectData = this.getProjectDataForSave();

      const sanitizedGraph = {
        nodes: Object.fromEntries(
          Object.entries(projectData.nodes).map(([id, node]: [string, any]) => [
            id,
            {
              ...node,
              type: node.type.toUpperCase()
            }
          ])
        ),
        edges: projectData.edges.map((edge: any) => ({
          ...edge,
          fromPin: (edge.fromPin && edge.fromPin.startsWith("flow")) ? "flow" : (edge.fromPin || "flow"),
          toPin: (edge.toPin && edge.toPin.startsWith("flow")) ? "flow" : (edge.toPin || "flow")
        }))
      };

      const novaIR = parseGraph(sanitizedGraph as any);
      const resolvedIR = resolveIR(novaIR, this.currentLoader);
      const javaCode = generateJava(resolvedIR, this.currentLoader);

      this.generatedCode = javaCode;
    } catch (error) {
      console.error("❌ [Pipeline] Javaコンパイル中にパイプラインが破綻しました:", error);
    }
  }

  public selectNode(nodeId: string | null) {
    this.selectedNodeId = nodeId;
    this.notify(); // 🌟 ノードが選択されたぞ！とReact画面に通知して右側パネルを切り替えさせる！
  }

  public updatePosition(nodeId: string, x: number, y: number) {
    this.pendingUpdates.set(nodeId, { x, y });
  }

  public addEdge(edge: EditorEdge) {
    this.edges.set(edge.id, edge);

    if (!this.isRestoring) {
      this.compileToJava();
    }
    this.notify(); // 🌟 線が繋がった時も画面を再描画！
  }

  public updateNodeProperty(nodeId: string, key: string, value: any) {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.properties = node.properties || {};
      node.properties[key] = value; // 🌟 1. Store側の生データに「NONE」を確実に保存！
      
      if (!this.isRestoring) {
        // 👑 画面側（NodeCanvas）にプロパティ変更を通知して、Reteノード側の同期と再生成をReact側に委ねる！
        this.compileToJava(); 
      }
      this.notify();
    }
  }

  public loadProjectData(graph: { nodes?: any; edges?: any[] }) {
    const safeGraph = normalizeNodeGraph(graph);
    this.isRestoring = true;
    this.nodes.clear();
    this.edges.clear();

    for (const id in safeGraph.nodes) {
      // 👑 対策：n を明示的に any としてキャストし、型推論のバグを完全粉砕！
      const n = safeGraph.nodes[id] as any;
      this.nodes.set(id, {
        id: n.id,
        title: n.type || n.title, 
        x: n.x ?? 0,
        y: n.y ?? 0,
        properties: n.properties || {}
      });
    }
    
    for (const e of safeGraph.edges) {
      this.edges.set(e.id || `${e.fromNode}_${e.fromPin}`, {
        id: e.id || `${e.fromNode}_${e.fromPin}`,
        source: e.fromNode,
        sourcePin: e.fromPin,
        target: e.toNode,
        targetPin: e.toPin
      });
    }
    this.isRestoring = false;
    this.compileToJava();
    this.notify(); // 🌟 ロード完了を画面に通知！
  }

  public removeEdge(id: string) {
    if (this.edges.has(id)) {
      this.edges.delete(id);
      this.compileToJava();
      this.notify(); // 🌟 線が消えた時も画面を再描画！
    }
  }

  public getAllEdges(): EditorEdge[] {
    return Array.from(this.edges.values());
  }

  public getAllNodesForSave() {
    return Array.from(this.nodes.values()).map((n: any) => ({ // 👈 明示的に : any を付与して型エラーを完全無効化！
      id: n.id,
      title: n.title,
      x: n.x,
      y: n.y
    }));
  }

  public getProjectDataForSave() {
    const nodesObj: Record<string, any> = {};
    for (const node of this.nodes.values()) {
      nodesObj[node.id] = {
        id: node.id,
        type: node.title,
        x: node.x, 
        y: node.y, 
        properties: node.properties || {}
      };
    }

    const pureEdges: Edge[] = Array.from(this.edges.values()).map(e => ({
      id: e.id,
      fromNode: e.source,
      fromPin: e.sourcePin,
      toNode: e.target,
      toPin: e.targetPin
    }));

    return {
      nodes: nodesObj,
      edges: pureEdges
    };
  }

  public removeNode(nodeId: string) {
    if (!this.nodes.has(nodeId)) return;

    for (const [edgeId, edge] of this.edges.entries()) {
      if (edge.source === nodeId || edge.target === nodeId) {
        this.edges.delete(edgeId);
      }
    }

    this.nodes.delete(nodeId);

    if (this.selectedNodeId === nodeId) {
      this.selectedNodeId = null;
    }
    this.compileToJava();
    this.notify(); // 🌟 ノードが削除された時も通知！
  }

  public addNode(type: string, x: number, y: number) {
    const upperType = type.toUpperCase();
    const newId = `${upperType.toLowerCase()}_${Date.now()}`; 
    
    // 👑 究極のデータ駆動：NodeRegistry からプロパティ定義のデフォルト値を全自動ハイドレート
    const initialProperties: Record<string, any> = {};
    const definition = (NodeRegistry.getInstance() as any).get?.(upperType) || (NodeRegistry as any)[upperType];
    
    if (definition?.properties) {
      definition.properties.forEach((prop: any) => {
        initialProperties[prop.id] = prop.default;
      });
    }

    this.nodes.set(newId, {
      id: newId,
      title: upperType,
      x: x,
      y: y,
      properties: initialProperties
    });

    this.compileToJava();
    this.notify();
    return newId;
  }

  // 🌟 マルチローダー用の状態（既存のクラス内に滑り込ませる）
  public currentLoader: LoaderType = "FABRIC";

  // 🌟 余計なメタデータを触らず、ただ安全にローダーを書き換えるだけの関数！
  public setModLoader(loader: LoaderType) {
    this.currentLoader = loader;
    if (!this.isRestoring) {
      this.compileToJava();
    }
    this.notify();
  }
}

export const editorStore = new EditorStore();
