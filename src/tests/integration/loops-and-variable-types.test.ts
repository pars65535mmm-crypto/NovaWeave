import { describe, it, expect } from "vitest";
import { parseGraph } from "../../core/parser/parseGraph.js";
import { resolveIR } from "../../core/resolver/resolveIR.js";
import { generateJava } from "../../core/generator/common/generateJava.js";
import { NovaIR } from "../../core/types/NovaIR.js";

describe("Loop and variable type support", () => {
  it("generates a FOR loop with body and next flow", () => {
    const graph = {
      nodes: {
        event_1: { id: "event_1", type: "PLAYER_RIGHT_CLICK", properties: {} },
        for_1: { id: "for_1", type: "FOR", properties: { variableName: "i", valueType: "NUMBER" } },
        number_0: { id: "number_0", type: "NUMBER", properties: { value: 0 } },
        number_10: { id: "number_10", type: "NUMBER", properties: { value: 10 } },
        number_1: { id: "number_1", type: "NUMBER", properties: { value: 1 } },
        explosion_body: { id: "explosion_body", type: "EXPLOSION", properties: { power: 4, explosionType: "TNT" } },
        explosion_after: { id: "explosion_after", type: "EXPLOSION", properties: { power: 4, explosionType: "TNT" } }
      },
      edges: [
        { id: "e1", fromNode: "event_1", fromPin: "flow", toNode: "for_1", toPin: "flow" },
        { id: "e2", fromNode: "number_0", fromPin: "value", toNode: "for_1", toPin: "start" },
        { id: "e3", fromNode: "number_10", fromPin: "value", toNode: "for_1", toPin: "end" },
        { id: "e4", fromNode: "number_1", fromPin: "value", toNode: "for_1", toPin: "step" },
        { id: "e5", fromNode: "for_1", fromPin: "bodyFlow", toNode: "explosion_body", toPin: "flow" },
        { id: "e6", fromNode: "for_1", fromPin: "flow", toNode: "explosion_after", toPin: "flow" }
      ]
    };

    const javaCode = generateJava(resolveIR(parseGraph(graph as any), "FORGE"), "FORGE");

    expect(javaCode).toContain("for (float i = 0.0F; i < 10.0F; i += 1.0F)");
    expect(javaCode).toContain("world.explode");
  });

  it("generates a WHILE loop with a guard", () => {
    const graph = {
      nodes: {
        event_1: { id: "event_1", type: "PLAYER_RIGHT_CLICK", properties: {} },
        while_1: { id: "while_1", type: "WHILE", properties: { guardLimit: 10000 } },
        compare_1: { id: "compare_1", type: "COMPARE", properties: { operation: "GREATER" } },
        number_10: { id: "number_10", type: "NUMBER", properties: { value: 10 } },
        number_5: { id: "number_5", type: "NUMBER", properties: { value: 5 } },
        explosion_body: { id: "explosion_body", type: "EXPLOSION", properties: { power: 4, explosionType: "TNT" } }
      },
      edges: [
        { id: "e1", fromNode: "event_1", fromPin: "flow", toNode: "while_1", toPin: "flow" },
        { id: "e2", fromNode: "compare_1", fromPin: "value", toNode: "while_1", toPin: "condition" },
        { id: "e3", fromNode: "number_10", fromPin: "value", toNode: "compare_1", toPin: "a" },
        { id: "e4", fromNode: "number_5", fromPin: "value", toNode: "compare_1", toPin: "b" },
        { id: "e5", fromNode: "while_1", fromPin: "bodyFlow", toNode: "explosion_body", toPin: "flow" }
      ]
    };

    const javaCode = generateJava(resolveIR(parseGraph(graph as any), "FORGE"), "FORGE");

    expect(javaCode).toContain("int __novaGuard = 0;");
    expect(javaCode).toContain("while ((");
    expect(javaCode).toContain("(10.0F > 5.0F)");
  });

  it("supports boolean and string variable declarations", () => {
    const novaIR: NovaIR = {
      triggers: [
        {
          id: "trigger_1",
          type: "PLAYER_RIGHT_CLICK",
          entry: "set_bool",
          nodes: {
            set_bool: {
              id: "set_bool",
              type: "ACTION",
              nodeType: "VARIABLE_SET",
              parameters: {
                value: {
                  type: "BOOLEAN",
                  sourceNodeId: "compare_1",
                  sourcePin: "value"
                }
              },
              properties: {
                variableName: "flag",
                valueType: "BOOLEAN"
              },
              next: []
            } as any,
            compare_1: {
              id: "compare_1",
              type: "ACTION",
              nodeType: "COMPARE",
              parameters: {
                a: { type: "NUMBER", value: 10 },
                b: { type: "NUMBER", value: 5 }
              },
              properties: {
                operation: "GREATER"
              },
              next: []
            } as any
          }
        }
      ]
    };

    const booleanCode = generateJava(resolveIR(novaIR, "FORGE"), "FORGE");
    expect(booleanCode).toContain("boolean flag = (10.0F > 5.0F);");

    const stringIR: NovaIR = {
      triggers: [
        {
          id: "trigger_2",
          type: "PLAYER_RIGHT_CLICK",
          entry: "set_string",
          nodes: {
            set_string: {
              id: "set_string",
              type: "ACTION",
              nodeType: "VARIABLE_SET",
              parameters: {
                value: {
                  type: "STRING",
                  value: "hello"
                }
              },
              properties: {
                variableName: "name",
                valueType: "STRING"
              },
              next: []
            } as any
          }
        }
      ]
    };

    const stringCode = generateJava(resolveIR(stringIR, "FORGE"), "FORGE");
    expect(stringCode).toContain('String name = "hello";');
  });
});
