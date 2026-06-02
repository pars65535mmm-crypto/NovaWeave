import { invoke } from "@tauri-apps/api/core";

export async function exportGeneratedJava(contents: string): Promise<string> {
  return invoke<string>("export_generated_java_file", { contents });
}

export async function exportForgeProject(contents: string, modId = "my_nova_mod"): Promise<string> {
  return invoke<string>("export_forge_project", { contents, modId });
}
