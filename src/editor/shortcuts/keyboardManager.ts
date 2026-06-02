import { editorStore } from "../state/editorStore";
import { saveProject } from "../../project/saveProject";
import { NovaProject } from "../../project/ProjectSchema";
import { HistoryManager } from "../history/HistoryManager"; // 🌟 追加

export class KeyboardManager {
  private boundHandler: (e: KeyboardEvent) => void;
  private renderer: any;
  private history: HistoryManager; // 🌟 追加

  constructor(renderer: any) {
    this.renderer = renderer;
    this.history = HistoryManager.getInstance(); // 🌟 追加
    this.boundHandler = this.handleKeyDown.bind(this);
  }

  public start() {
    window.addEventListener("keydown", this.boundHandler as EventListener);
  }

  public stop() {
    // 💡 第一引数を "keydown" に修正し、型安全のために as EventListener を付与しました
    window.removeEventListener("keydown", this.boundHandler as EventListener);
  }

  private async handleKeyDown(event: KeyboardEvent) {
    if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
      return;
    }

    const isModKey = event.ctrlKey || event.metaKey; // Windows(Ctrl) / Mac(Cmd) 両対応

    // 1. ⏪ Undo (Ctrl / Cmd + Z)
    if (isModKey && !event.shiftKey && event.key.toLowerCase() === "z") {
      event.preventDefault();
      await this.history.undo(this.renderer);
      return;
    }

    // 2. ⏩ Redo (Ctrl / Cmd + Shift + Z または Ctrl + Y)
    if (
      (isModKey && event.shiftKey && event.key.toLowerCase() === "z") ||
      (event.ctrlKey && event.key.toLowerCase() === "y")
    ) {
      event.preventDefault();
      await this.history.redo(this.renderer);
      return;
    }

    // 3. 💾 手動保存 (Ctrl / Cmd + S)
    if (isModKey && event.key.toLowerCase() === "s") {
      event.preventDefault();
      this.executeManualSave();
      return;
    }

    // 4. 🗑️ ノード削除 (Delete / Backspace)
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      this.executeNodeDelete();
      return;
    }
  }

  private async executeManualSave() {
    try {
      const rawGraph = editorStore.getProjectDataForSave();
      const fullProject: NovaProject = {
        version: "0.1",
        modId: "my_nova_mod",
        minecraftVersion: "1.20.1",
        loader: (editorStore.currentLoader === "FORGE" ? "forge" : "fabric") as NovaProject["loader"],
        graph: rawGraph,
        metadata: {
          name: "Saved Project",
          author: "tyamizumoti",
          description: "手動保存されたデータ",
          createdAt: Date.now(),
          modifiedAt: Date.now()
        }
      };
      await saveProject(fullProject);
    } catch (saveError) {
      console.error("❌ 手動保存中にエラーが発生しました:", saveError);
    }
  }

  private async executeNodeDelete() {
    const targetId = (editorStore as any).selectedNodeId;
    if (!targetId) return;

    // 🌟【最重要】消す「直前」の今の健全な状態を、歴史の1ページとしてスタックに保存！
    this.history.pushState();

    try {
      const connections = this.renderer.editor.getConnections();
      for (const conn of connections) {
        if (conn.source === targetId || conn.target === targetId) {
          await this.renderer.editor.removeConnection(conn.id);
        }
      }
      await this.renderer.editor.removeNode(targetId);
      editorStore.removeNode(targetId);
    } catch (err) {
      console.error("❌ ノード削除中にエラーが発生しました:", err);
    }
  }
}
