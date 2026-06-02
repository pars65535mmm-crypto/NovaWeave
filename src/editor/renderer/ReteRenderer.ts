import { NodeEditor, ClassicPreset } from "rete";
import { AreaPlugin, AreaExtensions } from "rete-area-plugin";
import { ReactPlugin, Presets } from "rete-react-plugin";
import { createRoot } from "react-dom/client";
import { editorStore } from "../state/editorStore";
import { ConnectionPlugin, Presets as ConnectionPresets } from "rete-connection-plugin";
import { NodeRegistry } from "../NodeRegistry"; 
import { buildReteNodeFromDefinition } from "../reteNodeBuilder";
import { normalizeNodeGraph } from "../../core/types/NodeGraph.js"; 

export class ReteRenderer {
  public editor!: NodeEditor<any>;
  public area!: AreaPlugin<any, any>;
  private renderPlugin!: ReactPlugin<any, any>;

  async initialize(container: HTMLElement) {
    this.editor = new NodeEditor<any>();
    this.area = new AreaPlugin<any, any>(container);
    this.renderPlugin = new ReactPlugin<any, any>({ createRoot });

    const selector = new AreaExtensions.Selector();
    
    AreaExtensions.selectableNodes(this.area, selector, {
      accumulating: { active: () => false }
    });

    // 内部イベントストリームの監視
    this.area.addPipe((context) => {
      if (context.type === "nodepicked") {
        editorStore.selectNode(context.data.id);
      }
      if (context.type === "nodetranslated") {
        editorStore.updatePosition(context.data.id, context.data.position.x, context.data.position.y);
      }

      // 🌟【最優先・ガードレール】接続が作成されようとした瞬間に、型システムをチェック！
      if (context.type === "connectioncreate") {
        const { source, sourceOutput, target, targetInput } = context.data;
        const sNode = this.editor.getNode(source);
        const tNode = this.editor.getNode(target);

        if (sNode && tNode) {
          // Reteノードインスタンスからピンの型（Socket）を取得
          const sourceSocket = (sNode.outputs as any)[sourceOutput]?.socket;
          const targetSocket = (tNode.inputs as any)[targetInput]?.socket;

          // 異なるソケット同士（例: NUMBER -> POSITION）なら、物理的に接続を拒絶する！
          if (
            sourceSocket &&
            targetSocket &&
            sourceSocket.name !== targetSocket.name &&
            sourceSocket.name !== "ANY" &&
            targetSocket.name !== "ANY"
          ) {
            console.warn(`❌ [型安全ガード] 接続を拒絶しました: ${sourceSocket.name} は ${targetSocket.name} に接続できません。`);
            return; // 虚空への接続として処理を握り潰す
          }
        }
      }

      if (context.type === "connectioncreated") {
        const edgeData = context.data;
        editorStore.addEdge({
          id: edgeData.id,
          source: edgeData.source,
          sourcePin: edgeData.sourceOutput || "flow",
          target: edgeData.target,
          targetPin: edgeData.targetInput || "flow"
        } as any);
      }

      if (context.type === "connectionremoved") {
        editorStore.removeEdge(context.data.id);
      }

      return context;
    });

    container.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".rete-node, .node") && (target === container || target.classList.contains("rete-canvas") || target.tagName === "svg")) {
        editorStore.selectNode(null);
      }
    });

    // 🎨 ソケットの見た目のカスタマイズ（指示書通りの色分けをReteに流し込む）
    this.renderPlugin.addPreset(
      Presets.classic.setup({
        customize: {
          // 💡 引数に ': any' を指定して暗黙のanyエラーを完全暗殺！
          socket() {
            // 今はRete標準のソケットコンポーネントを一律で返却（色は後日対応）
            return Presets.classic.Socket;
          },
          control() { return Presets.classic.Control as any; }
        }
      } as any)
    );

    const connection = new ConnectionPlugin<any, any>();
    connection.addPreset(ConnectionPresets.classic.setup() as any);

    this.editor.use(this.area);
    this.area.use(connection); 
    this.area.use(this.renderPlugin);

  }

  async renderNode(nodeData: any) {
    const registry = NodeRegistry.getInstance();
    
    // 💡 すべてを大文字にクレンジングしてレジストリから引っ張る
    const rawType = nodeData.title || nodeData.type;
    const runtimeType = rawType.toUpperCase();
    
    const definition = registry.get(runtimeType);

    if (!definition) {
      console.error(`❌ [ReteRenderer] 未登録のノード定義タイプです: ${rawType}`);
      return;
    }

    const node = buildReteNodeFromDefinition(definition, nodeData);

    await this.editor.addNode(node);
    await this.area.translate(node.id, { x: nodeData.x, y: nodeData.y });
    await this.area.update("node", node.id);

  }

  async renderConnection(edgeData: any) {
    const sourceId = edgeData.source || edgeData.fromNode;
    const targetId = edgeData.target || edgeData.toNode;

    const sourceNode = this.editor.getNode(sourceId);
    const targetNode = this.editor.getNode(targetId);

    if (!sourceNode || !targetNode) {
      console.warn(`⚠️ 接続ノードが見つかりません: ${sourceId} -> ${targetId}`);
      return;
    }

    const sourcePin = edgeData.fromPin || edgeData.sourcePin || "flow";
    const targetPin = edgeData.toPin || edgeData.targetPin || "flow";

    const connection = new ClassicPreset.Connection(
      sourceNode,
      sourcePin,
      targetNode,
      targetPin
    );

    connection.id = edgeData.id || `${sourceId}_${sourcePin}`;
    await this.editor.addConnection(connection);
  }

  async restoreProject(data: { nodes?: Record<string, any>; edges?: any[] }) {
    if (!data) return;
    const safeGraph = normalizeNodeGraph(data);

    for (const nodeId in safeGraph.nodes) {
      const node = safeGraph.nodes[nodeId];
      await this.renderNode({
        id: node.id,
        title: node.type,
        x: node.x ?? 150,
        y: node.y ?? 200,
        properties: node.properties || {}
      });
    }

    for (const edge of safeGraph.edges) {
      await this.renderConnection(edge);
    }
  }

  public destroy() {
    try {
      if (this.editor) this.editor.clear();
      if (this.area) this.area.destroy();
    } catch (e) {
      console.error("⚠️ クリーンアップエラー:", e);
    }
  }
}
