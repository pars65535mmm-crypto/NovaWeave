import { Statement } from "../../types/ResolvedIR.js";

// 🌟 interface ではなく type と交差型（&）を使って、元の汎用型を 100% 安全に拡張！
type ExplosionStatement = Statement & {
  position?: string;
  properties?: {
    power?: number | string;
    explosionType?: string;
  };
};

export const actionGenerators: Record<string, (statement: Statement) => string> = {
  EXPLOSION: (statement: Statement) => {
    // 汎用型から explosion 専用型へ安全にダウンキャスト！
    const expStmt = statement as ExplosionStatement;

    // ① 特別長さんの座標パースロジックを安全に吸収
    const pos = expStmt.position || "player.getX(), (player.getY() + 10.0F), player.getZ()";
    
    // ② パワーの取得とフォーマット
    const power = expStmt.properties?.power ?? "4.0F";
    const formattedPower = String(power).endsWith('F') ? power : power + 'F';

    // ⚡️ インスペクターから届いた explosionType を大文字化（無ければ "TNT"）
    const rawType = expStmt.properties?.explosionType || "TNT";
    const type = rawType.toUpperCase(); 

    return `            if (!world.isClientSide()) {
                world.explode(
                    null,
                    ${pos},
                    ${formattedPower},
                    net.minecraft.world.level.Level.ExplosionInteraction.${type}
                );
            }`;
  }
};