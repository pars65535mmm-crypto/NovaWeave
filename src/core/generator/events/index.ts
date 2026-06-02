import { ResolvedTrigger } from "../../types/ResolvedIR.js";

interface EventGeneratorResult {
  imports: string[];
  wrapper: (innerCode: string) => string;
}

export const eventGenerators: Record<
  string, 
  (trigger: ResolvedTrigger, loader: "fabric" | "forge") => EventGeneratorResult
> = {
  PLAYER_RIGHT_CLICK: (_, loader) => {
    if (loader === "forge") {
      return {
        imports: [
          "net.minecraftforge.eventbus.api.SubscribeEvent",
          "net.minecraftforge.event.entity.player.PlayerInteractEvent"
        ],
        wrapper: (innerCode) => `    @SubscribeEvent
    public static void onRightClick(PlayerInteractEvent.RightClickBlock event) {
        net.minecraft.world.entity.player.Player player = event.getEntity();
        net.minecraft.world.level.Level world = event.getLevel();
${innerCode}
    }`
      };
    } else {
      // デフォルト: fabric
      return {
        imports: [
          "net.fabricmc.fabric.api.event.player.UseBlockCallback"
        ],
        wrapper: (innerCode) => `        UseBlockCallback.EVENT.register((player, world, hand, hitResult) -> {
${innerCode}
            return net.minecraft.world.InteractionResult.PASS;
        });`
      };
    }
  }
};