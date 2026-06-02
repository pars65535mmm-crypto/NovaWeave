import { describe, it, expect } from "vitest";
import { parseGraph } from "../../core/parser/parseGraph.js";
import { resolveIR } from "../../core/resolver/resolveIR.js";
import { generateJava } from "../../core/generator/common/generateJava.js";

describe("Variable pipeline", () => {
  it("declares on first set and reuses on later reads", () => {
    const graph = {
      nodes: {
        event_1: { id: "event_1", type: "PLAYER_RIGHT_CLICK", properties: {} },
        set_1: { id: "set_1", type: "VARIABLE_SET", properties: { variableName: "damage", valueType: "NUMBER" } },
        get_1: { id: "get_1", type: "VARIABLE_GET", properties: { variableName: "damage" } },
        math_1: { id: "math_1", type: "MATH", properties: { operation: "ADD" } },
        number_20: { id: "number_20", type: "NUMBER", properties: { value: 20 } },
        number_5: { id: "number_5", type: "NUMBER", properties: { value: 5 } },
        explosion_1: { id: "explosion_1", type: "EXPLOSION", properties: { power: 4, explosionType: "TNT" } }
      },
      edges: [
        { id: "e1", fromNode: "event_1", fromPin: "flow", toNode: "set_1", toPin: "flow" },
        { id: "e2", fromNode: "number_20", fromPin: "value", toNode: "set_1", toPin: "value" },
        { id: "e3", fromNode: "set_1", fromPin: "flow", toNode: "explosion_1", toPin: "flow" },
        { id: "e4", fromNode: "get_1", fromPin: "value", toNode: "math_1", toPin: "a" },
        { id: "e5", fromNode: "number_5", fromPin: "value", toNode: "math_1", toPin: "b" },
        { id: "e6", fromNode: "math_1", fromPin: "result", toNode: "explosion_1", toPin: "power" }
      ]
    };

    const novaIR = parseGraph(graph as any);
    const resolved = resolveIR(novaIR, "FORGE");
    const javaCode = generateJava(resolved, "FORGE");

    expect(javaCode).toContain("float damage = 20.0F;");
    expect(javaCode).toContain("damage");
    expect(javaCode).toContain("world.explode");
    expect(javaCode).toContain("(damage + 5.0F)");
  });
});
