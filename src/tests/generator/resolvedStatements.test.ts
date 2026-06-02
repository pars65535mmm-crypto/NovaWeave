import { describe, it, expect } from "vitest";
import { generateStatements } from "../../core/generator/common/generateStatements.js";
import { LoaderType } from "../../core/types/LoaderType.js";
import { ResolvedTrigger } from "../../core/types/ResolvedIR.js";

describe("generateStatements uses resolved parameters from resolveIR", () => {
  it("keeps Explosion.power from the resolved statement without re-reading graph inputs", () => {
    const resolvedTriggers: ResolvedTrigger[] = [
      {
        triggerType: "PLAYER_RIGHT_CLICK",
        statements: [
          {
            type: "EXPLOSION",
            power: "(float)((10.0F + ((float)(java.lang.Math.random() * (5.0F - 1.0F) + 1.0F))))",
            properties: {
              power: 4,
              explosionType: "TNT"
            }
          } as any
        ]
      } as any
    ];

    const javaCode = generateStatements(resolvedTriggers, "FORGE" as LoaderType, {
      explosion_1: {
        id: "explosion_1",
        type: "EXPLOSION",
        properties: {
          power: 4,
          explosionType: "TNT"
        }
      }
    });

    expect(javaCode).toContain("java.lang.Math.random()");
    expect(javaCode).toContain("world.explode");
    expect(javaCode).not.toContain("4.0F");
  });
});
