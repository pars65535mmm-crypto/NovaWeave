/**
 * 🚨 コンパイル前コード検閲システム
 * 指定されたローダーに対して、禁忌とされる文字列（他ローダーのインポート等）が混入していないかスキャンする
 */
export function validateGeneratedCode(generatedCode: string, loader: "fabric" | "forge"): { success: boolean; error?: string } {
  const normalizedLoader = loader.toLowerCase();

  if (normalizedLoader === "forge") {
    // ForgeなのにFabricのコードが入っていたら一発レッドカード
    if (generatedCode.includes("net.fabricmc") || generatedCode.includes("UseBlockCallback")) {
      return {
        success: false,
        error: `❌ Generator Validation Error\nLoader: Forge\nFabric API import detected inside Forge code scope!`
      };
    }
  }

  if (normalizedLoader === "fabric") {
    // FabricなのにForgeのコードが入っていたら一発レッドカード
    if (generatedCode.includes("net.minecraftforge") || generatedCode.includes("@SubscribeEvent")) {
      return {
        success: false,
        error: `❌ Generator Validation Error\nLoader: Fabric\nForge API elements (@SubscribeEvent) detected inside Fabric code scope!`
      };
    }
  }

  return { success: true };
}