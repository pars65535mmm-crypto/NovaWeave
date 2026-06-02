import { ResolvedIR } from "../../types/ResolvedIR.js";
import { LoaderAdapter } from "../adapters/LoaderAdapter.js";
import { FabricAdapter } from "../adapters/FabricAdapter.js";
import { ForgeAdapter } from "../adapters/ForgeAdapter.js";
import { LoaderType } from "../../types/LoaderType.js";

function getAdapter(loader: LoaderType): LoaderAdapter {
  switch (loader) {
    case "FORGE":
      return new ForgeAdapter();
    case "FABRIC":
    default:
      return new FabricAdapter();
  }
}

export function generateJava(resolved: ResolvedIR, loader: LoaderType = "FABRIC"): string {
  const adapter = getAdapter(loader);
  const isForge = loader === "FORGE";

  const imports = adapter.generateImports(resolved);
  // 🌟 アダプター側へ loader 文字列をパス回しして、完璧なイベント外枠を生成してもらう
  const events = adapter.generateEvents(resolved, loader);

  return `package com.novaweave.generated;

${imports}

/**
 * NovaWeave によって自動生成された ${isForge ? "Forge" : "Fabric"} 1.20.1 用のModソースコードです。
 */
${isForge ? '@net.minecraftforge.fml.common.Mod("my_nova_mod")\n' : ''}public class GeneratedMod${!isForge ? " implements net.fabricmc.api.ModInitializer" : ""} {
    
${events}
}`;
}