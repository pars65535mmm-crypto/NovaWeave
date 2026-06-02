import { invoke } from "@tauri-apps/api/core"; // もしエラーが出る場合は "@tauri-apps/api/core" 
import { NovaProject } from "./ProjectSchema.js";

export async function saveProject(project: NovaProject): Promise<void> {
  try {
    project.metadata.modifiedAt = Date.now();
    const jsonString = JSON.stringify(project, null, 2);

    // 🌟 Rust側の自作コマンド「save_project_file」に文字列を丸ごと投げる！
    await invoke("save_project_file", { contents: jsonString });

  } catch (error) {
    console.error("❌ [Disk Save Error] Rust経由の書き込みに失敗しました:", error);
  }
}
