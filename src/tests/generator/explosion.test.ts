// src/tests/generator/explosion.test.ts の完全修正版
import { describe, it, expect } from "vitest";
import { generateStatements } from "../../core/generator/common/generateStatements.js";
import { ResolvedTrigger } from "../../core/types/ResolvedIR.js";
import { LoaderType } from "../../core/types/LoaderType.js";

describe("🌌 NovaWeave - 8パターン（2ローダー × 4タイプ）完全自動検証スイート", () => {
  const loaders = ["fabric", "forge"];
  const types = ["TNT", "NONE", "BLOCK", "MOB"];

  loaders.forEach(loader => {
    types.forEach(type => {
      it(`[${loader.toUpperCase()}] 爆発タイプ: ${type} が1.20.1のシグネチャで正しく動的置換されること`, () => {
        
        // 👑 1. エディタ上の本物のキャンバス配置を完全再現した「ノードデータハッシュ」をモック！
        const mockNodes: Record<string, any> = {
          "random_inst_1": {
            id: "random_inst_1",
            type: "RANDOM",
            properties: { min: -20.0, max: 20.0 }, // 👈 社長が設定したカオスの範囲！
            inputs: {},
            outputs: [{ id: "value", type: "NUMBER" }]
          },
          "math_inst_1": {
            id: "math_inst_1",
            type: "MATH",
            properties: { operation: "ADD" },
            inputs: {
              a: { targetNodeId: "random_inst_1", targetPinId: "value" }, // 👈 RANDOMを結線！
              b: { targetNodeId: "player_pos_inst", targetPinId: "y" }
            },
            outputs: [{ id: "result", type: "NUMBER" }]
          }
        };

        // 👑 2. 中間表現（IR）のステートメントのインプットに、MATHノードからの結線をシミュレート！
        const mockTriggers: ResolvedTrigger[] = [
          {
            triggerType: "PLAYER_RIGHT_CLICK",
            statements: [
              {
                type: "EXPLOSION",
                properties: { 
                  power: 4.0, 
                  explosionType: type // TNT, NONE, BLOCK, MOB
                },
                // ⚡ インプットの結線情報を明示！
                inputs: {
                  power: { targetNodeId: "math_inst_1", targetPinId: "result" }
                },
                position: "player.getX(), (player.getY() + 10.0F), player.getZ()"
              }
            ]
          } as any
        ];

        // 🎯 ジェネレーターを実行（第3引数に mockNodes を完全ハイドレート！）
        const javaCode = generateStatements(mockTriggers, loader.toUpperCase() as LoaderType, mockNodes);

        // 🔍 1. ローダーごとのマッピングとメソッド・引数の検証
        if (loader === "fabric") {
          expect(javaCode).toContain("world.createExplosion");
          expect(javaCode).toContain(`net.minecraft.world.World.ExplosionInteraction.${type}`);
          expect(javaCode).not.toContain("world.explode");
        } else {
          expect(javaCode).toContain("world.explode");
          expect(javaCode).toContain(`net.minecraft.world.level.Level.ExplosionInteraction.${type}`);
          expect(javaCode).not.toContain("world.createExplosion");
        }

        // 🔍 2. 呪いの7番目の引数（false）が消滅していることの検証
        expect(javaCode).not.toContain(", false,");

        // 🔍 3. 【新防衛線】0.0に化けず、RANDOMのJava式（Math.random()）が完璧に展開されているか徹底検証！！
        expect(javaCode).toContain("Math.random()");
        expect(javaCode).toContain("20.0F");
        expect(javaCode).toContain("-20.0F");
        expect(javaCode).not.toContain("0.0 +"); // ☠️ 虚無のフォールバックの痕跡がないこと！
        
      });
    });
  });
});
