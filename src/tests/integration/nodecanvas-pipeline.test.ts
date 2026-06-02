import { describe, it, expect } from "vitest";
import { parseGraph } from "../../core/parser/parseGraph.js";
import { resolveIR } from "../../core/resolver/resolveIR.js";
import { generateJava } from "../../core/generator/common/generateJava.js";

describe("NodeCanvas pipeline", () => {
  it("keeps Compare -> If condition through the full graph pipeline", () => {
    const graph = {
      nodes: {
        event_1: { id: "event_1", type: "PLAYER_RIGHT_CLICK", properties: {} },
        if_1: { id: "if_1", type: "IF", properties: {} },
        compare_1: { id: "compare_1", type: "COMPARE", properties: { operation: "GREATER" } },
        number_10: { id: "number_10", type: "NUMBER", properties: { value: 10 } },
        number_5: { id: "number_5", type: "NUMBER", properties: { value: 5 } },
        explosion_1: { id: "explosion_1", type: "EXPLOSION", properties: { power: 4, explosionType: "TNT" } }
      },
      edges: [
        { id: "e1", fromNode: "event_1", fromPin: "flow", toNode: "if_1", toPin: "flow" },
        { id: "e2", fromNode: "number_10", fromPin: "value", toNode: "compare_1", toPin: "a" },
        { id: "e3", fromNode: "number_5", fromPin: "value", toNode: "compare_1", toPin: "b" },
        { id: "e4", fromNode: "compare_1", fromPin: "value", toNode: "if_1", toPin: "condition" },
        { id: "e5", fromNode: "if_1", fromPin: "trueFlow", toNode: "explosion_1", toPin: "flow" }
      ]
    };

    const novaIR = parseGraph(graph as any);
    const resolved = resolveIR(novaIR, "FORGE");
    const javaCode = generateJava(resolved, "FORGE");

    expect(JSON.stringify(novaIR)).toContain("condition");
    expect(JSON.stringify(resolved)).toContain("(10.0F > 5.0F)");
    expect(javaCode).toContain("if ((");
    expect(javaCode).toContain("(10.0F > 5.0F)");
  });
});
