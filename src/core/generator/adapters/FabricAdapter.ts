import { LoaderAdapter } from "./LoaderAdapter.js";
import { ResolvedIR } from "../../types/ResolvedIR.js";
import { generateImports } from "../common/generateImports.js";
import { generateStatements } from "../common/generateStatements.js";
import { LoaderType } from "../../types/LoaderType.js";
import { editorStore } from "../../../editor/state/editorStore.js";

export class FabricAdapter implements LoaderAdapter {
  generateImports(resolved: ResolvedIR): string {
    const rawImports = generateImports(resolved.imports);
    return rawImports
      .split('\n')
      .filter(line => !line.includes('net.minecraftforge'))
      .join('\n');
  }

  generateEvents(resolved: ResolvedIR, loader: LoaderType): string {
    // 🌟 アクション内のコードを美しくインデント（スペース16個）
    const actionsCode = this.generateActions(resolved, loader)
      .split('\n')
      .map(line => line.trim() ? `                ${line}` : "")
      .join('\n');
    
    // 👑 クラス直下に配置されるため、メソッドのシグネチャから完全生成！
    return `    @Override
    public void onInitialize() {
        // 🌲 PLAYER_RIGHT_CLICK イベントへの自動インジェクション
        net.fabricmc.fabric.api.event.player.UseBlockCallback.EVENT.register((player, world, hand, hitResult) -> {
${actionsCode}
            // 👑 課長パッチ：全ルートでの戻り値を完全保証！
            return net.minecraft.util.ActionResult.PASS;
        });
    }`;
  }

  generateActions(resolved: ResolvedIR, loader: LoaderType): string {
    // ⚡ ストアから直接、今画面にある本物のノード群を引っこ抜く！
    const graphNodes = editorStore.getProjectDataForSave()?.nodes || {};
    
    // 🎯 第3引数に本物のノードデータを完全注入！！！
    return generateStatements(resolved.triggers, loader, graphNodes);
  }
}