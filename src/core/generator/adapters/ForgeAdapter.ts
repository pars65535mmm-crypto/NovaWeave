import { LoaderAdapter } from "./LoaderAdapter.js";
import { ResolvedIR } from "../../types/ResolvedIR.js";
import { generateStatements } from "../common/generateStatements.js";
import { LoaderType } from "../../types/LoaderType.js";
import { editorStore } from "../../../editor/state/editorStore.js";

export class ForgeAdapter implements LoaderAdapter {
  generateImports(_resolved: ResolvedIR): string {
    return `import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.event.entity.player.PlayerInteractEvent;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;`;
  }

  // 🌟 修正ポイント: 第2引数で loader を受け取る
  generateEvents(resolved: ResolvedIR, loader: LoaderType): string {
    // 🌟 修正ポイント: generateActionsに loader を引き渡す
    const actionsCode = this.generateActions(resolved, loader)
      .split('\n')
      .map(line => line.trim() ? `            ${line}` : "")
      .join('\n');
    
    return `    @Mod.EventBusSubscriber(modid = "my_nova_mod", bus = Mod.EventBusSubscriber.Bus.FORGE)
    public static class NovaForgeEvents {
        @SubscribeEvent
        public static void onRightClick(PlayerInteractEvent.RightClickBlock event) {
            Player player = event.getEntity();
            Level world = event.getLevel();
            
${actionsCode}
        }
    }`;
  }

  // 🌟 修正ポイント: loader を受け取って generateStatements へ
  generateActions(resolved: ResolvedIR, loader: LoaderType): string {
    // ⚡ ストアから直接、今画面にある本物のノード群を引っこ抜く！
    const graphNodes = editorStore.getProjectDataForSave()?.nodes || {};
    
    // 🎯 第3引数に本物のノードデータを完全注入！！！
    return generateStatements(resolved.triggers, loader, graphNodes);
  }
}