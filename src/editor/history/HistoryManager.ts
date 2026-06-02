import { editorStore } from "../state/editorStore";

interface GraphSnapshot {
  nodes: Record<string, any>;
  edges: any[];
}

export class HistoryManager {
  private static instance: HistoryManager;
  
  // Undo用（過去）とRedo用（未来）のスタック
  private undoStack: GraphSnapshot[] = [];
  private redoStack: GraphSnapshot[] = [];
  
  // 最大保存履歴数（メモリ対策）
  private maxHistory = 50;
  
  // 復元処理中の連続保存をブロックするフラグ
  private isOperating = false;

  private constructor() {}

  public static getInstance(): HistoryManager {
    if (!HistoryManager.instance) {
      HistoryManager.instance = new HistoryManager();
    }
    return HistoryManager.instance;
  }

  /**
   * 🌟 現在の状態を「過去」として保存する（ノード追加/削除/移動などの直前に呼ぶ）
   */
  public pushState() {
    if (this.isOperating) return;

    // 現在の最新データをストアからディープコピーして取得
    const currentGraph = editorStore.getProjectDataForSave();
    const snapshot: GraphSnapshot = JSON.parse(JSON.stringify(currentGraph));

    // 直前の履歴と全く同じ場合は重複保存しない
    if (this.undoStack.length > 0) {
      const last = this.undoStack[this.undoStack.length - 1];
      if (JSON.stringify(last) === JSON.stringify(snapshot)) return;
    }

    this.undoStack.push(snapshot);
    
    // 新しい操作があった場合、Redo（未来）のスタックはクリアする
    this.redoStack = [];

    // 上限を超えたら古い履歴を捨てる
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    
  }

  /**
   * ⏪ Undo (元に戻す): Cmd + Z
   */
  public async undo(renderer: any) {
    if (this.undoStack.length === 0 || this.isOperating) {
      return;
    }

    this.isOperating = true;
    editorStore.isRestoring = true;

    try {
      const currentGraph = editorStore.getProjectDataForSave();
      this.redoStack.push(JSON.parse(JSON.stringify(currentGraph)));

      const previousGraph = this.undoStack.pop()!;
      // 1. 画面とデータを一度クリアして再構築
      await renderer.editor.clear();
      editorStore.loadProjectData(previousGraph);
      await renderer.restoreProject(previousGraph);

      // 🌟【ここを追加】復活したReteノードたちに、過去の数値を完全に流し込んで同期する！
      for (const node of renderer.editor.getNodes()) {
        const savedNode = previousGraph.nodes[node.id];
        if (savedNode && savedNode.properties) {
          // Reteインスタンス側のプロパティを過去の値で上書き
          node.properties = JSON.parse(JSON.stringify(savedNode.properties));
          
          // 画面（UIコンポーネント）に対して「値が変わったから再描画しろ」と強制シグナルを送る
          if (renderer.area && renderer.area.update) {
            await renderer.area.update("node", node.id);
          }
        }
      }

    } catch (e) {
      console.error("❌ Undo処理中にエラーが発生しました:", e);
    } finally {
      editorStore.isRestoring = false;
      this.isOperating = false;
    }
  }

  /**
   * ⏩ Redo (やり直し): Cmd + Shift + Z
   */
  public async redo(renderer: any) {
    if (this.redoStack.length === 0 || this.isOperating) {
      return;
    }

    this.isOperating = true;
    editorStore.isRestoring = true;

    try {
      const currentGraph = editorStore.getProjectDataForSave();
      this.undoStack.push(JSON.parse(JSON.stringify(currentGraph)));

      const nextGraph = this.redoStack.pop()!;
      // 1. 画面とデータを再構築
      await renderer.editor.clear();
      editorStore.loadProjectData(nextGraph);
      await renderer.restoreProject(nextGraph);

      // 🌟【ここを追加】進んだ未来の数値を完全に流し込んで同期する！
      for (const node of renderer.editor.getNodes()) {
        const savedNode = nextGraph.nodes[node.id];
        if (savedNode && savedNode.properties) {
          node.properties = JSON.parse(JSON.stringify(savedNode.properties));
          if (renderer.area && renderer.area.update) {
            await renderer.area.update("node", node.id);
          }
        }
      }

    } catch (e) {
      console.error("❌ Redo処理中にエラーが発生しました:", e);
    } finally {
      editorStore.isRestoring = false;
      this.isOperating = false;
    }
  }
}
