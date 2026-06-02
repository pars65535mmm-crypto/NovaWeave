import { invoke } from "@tauri-apps/api/core"; // もしエラーが出る場合は "@tauri-apps/api/core"
import { NovaProject } from "./ProjectSchema.js";
import { normalizeNodeGraph } from "../core/types/NodeGraph.js";

export async function loadProject(): Promise<NovaProject> {
  // 🌟 Rust側の自作コマンド「load_project_file」から文字列を直回収！
  const jsonString = await invoke<string>("load_project_file");
  const parsed = JSON.parse(jsonString);

  if (!parsed.version || !parsed.graph) {
    throw new Error("Invalid project file structure");
  }

  return {
    ...parsed,
    graph: normalizeNodeGraph(parsed.graph)
  } as NovaProject;
}
