import { describe, it, expect } from "vitest";
import { resolveIR } from "../../core/resolver/resolveIR.js";
import { NovaIR } from "../../core/types/NovaIR.js";

describe("resolveIR nested expression chains", () => {
  it("resolves a connected math/random chain into Explosion power", () => {
    const novaIR: NovaIR = {
      triggers: [
        {
          id: "trigger_1",
          type: "PLAYER_RIGHT_CLICK",
          entry: "explosion_1",
          nodes: {
            explosion_1: {
              id: "explosion_1",
              type: "ACTION",
              nodeType: "EXPLOSION",
              parameters: {
                power: {
                  type: "NUMBER",
                  sourceNodeId: "math_2",
                  sourcePin: "result"
                }
              },
              properties: {
                power: 4,
                explosionType: "TNT"
              },
              next: []
            } as any,
            math_2: {
              id: "math_2",
              type: "ACTION",
              nodeType: "MATH",
              parameters: {
                a: {
                  type: "NUMBER",
                  sourceNodeId: "math_1",
                  sourcePin: "result"
                },
                b: {
                  type: "NUMBER",
                  sourceNodeId: "number_2",
                  sourcePin: "value"
                }
              },
              properties: {
                operation: "ADD"
              },
              next: []
            } as any,
            math_1: {
              id: "math_1",
              type: "ACTION",
              nodeType: "MATH",
              parameters: {
                a: {
                  type: "NUMBER",
                  sourceNodeId: "random_1",
                  sourcePin: "value"
                },
                b: {
                  type: "NUMBER",
                  sourceNodeId: "number_1",
                  sourcePin: "value"
                }
              },
              properties: {
                operation: "MODULO"
              },
              next: []
            } as any,
            random_1: {
              id: "random_1",
              type: "ACTION",
              nodeType: "RANDOM",
              parameters: {},
              properties: {
                min: 10,
                max: 15
              },
              next: []
            } as any,
            number_1: {
              id: "number_1",
              type: "ACTION",
              nodeType: "NUMBER",
              parameters: {
                value: {
                  type: "NUMBER",
                  value: 5
                }
              },
              properties: {
                value: 5
              },
              next: []
            } as any,
            number_2: {
              id: "number_2",
              type: "ACTION",
              nodeType: "NUMBER",
              parameters: {
                value: {
                  type: "NUMBER",
                  value: 2
                }
              },
              properties: {
                value: 2
              },
              next: []
            } as any
          }
        }
      ]
    };

    const resolved = resolveIR(novaIR, "FORGE");
    const explosion = resolved.triggers[0].statements[0] as any;

    expect(explosion.power).toContain("Math.random()");
    expect(explosion.power).not.toBe("(float)(4.0F)");
    expect(explosion.power).not.toBe("4.0F");
  });

  it("resolves COMPARE into an IF condition and emits branch code", () => {
    const novaIR: NovaIR = {
      triggers: [
        {
          id: "trigger_2",
          type: "PLAYER_RIGHT_CLICK",
          entry: "if_1",
          nodes: {
            if_1: {
              id: "if_1",
              type: "CONTROL",
              nodeType: "IF",
              condition: {
                type: "BOOLEAN",
                sourceNodeId: "compare_1",
                sourcePin: "value"
              },
              nextTrue: "explosion_1",
              nextFalse: ""
            } as any,
            compare_1: {
              id: "compare_1",
              type: "ACTION",
              nodeType: "COMPARE",
              parameters: {
                a: {
                  type: "NUMBER",
                  sourceNodeId: "random_1",
                  sourcePin: "value"
                },
                b: {
                  type: "NUMBER",
                  value: 5
                }
              },
              properties: {
                operation: "GREATER"
              },
              next: []
            } as any,
            random_1: {
              id: "random_1",
              type: "ACTION",
              nodeType: "RANDOM",
              parameters: {},
              properties: {
                min: 1,
                max: 10
              },
              next: []
            } as any,
            explosion_1: {
              id: "explosion_1",
              type: "ACTION",
              nodeType: "EXPLOSION",
              parameters: {
                power: {
                  type: "NUMBER",
                  value: 4
                }
              },
              properties: {
                power: 4,
                explosionType: "TNT"
              },
              next: []
            } as any
          }
        }
      ]
    };

    const resolved = resolveIR(novaIR, "FORGE");
    const trigger = resolved.triggers[0] as any;

    expect(trigger.code).toContain("if ((");
    expect(trigger.code).toContain("> 5.0F");
    expect(trigger.code).toContain("world.explode");
  });

  it("resolves a standalone numeric COMPARE expression as expected", () => {
    const novaIR: NovaIR = {
      triggers: [
        {
          id: "trigger_6",
          type: "PLAYER_RIGHT_CLICK",
          entry: "if_1",
          nodes: {
            if_1: {
              id: "if_1",
              type: "CONTROL",
              nodeType: "IF",
              condition: {
                type: "BOOLEAN",
                sourceNodeId: "compare_1",
                sourcePin: "value"
              },
              nextTrue: "explosion_1",
              nextFalse: ""
            } as any,
            compare_1: {
              id: "compare_1",
              type: "ACTION",
              nodeType: "COMPARE",
              parameters: {
                a: {
                  type: "NUMBER",
                  sourceNodeId: "number_10",
                  sourcePin: "value"
                },
                b: {
                  type: "NUMBER",
                  sourceNodeId: "number_5",
                  sourcePin: "value"
                }
              },
              properties: {
                operation: "GREATER"
              },
              next: []
            } as any,
            number_10: {
              id: "number_10",
              type: "ACTION",
              nodeType: "NUMBER",
              parameters: {
                value: {
                  type: "NUMBER",
                  value: 10
                }
              },
              properties: {
                value: 10
              },
              next: []
            } as any,
            number_5: {
              id: "number_5",
              type: "ACTION",
              nodeType: "NUMBER",
              parameters: {
                value: {
                  type: "NUMBER",
                  value: 5
                }
              },
              properties: {
                value: 5
              },
              next: []
            } as any,
            explosion_1: {
              id: "explosion_1",
              type: "ACTION",
              nodeType: "EXPLOSION",
              parameters: {
                power: {
                  type: "NUMBER",
                  value: 4
                }
              },
              properties: {
                power: 4,
                explosionType: "TNT"
              },
              next: []
            } as any
          }
        }
      ]
    };

    const resolved = resolveIR(novaIR, "FORGE");
    expect((resolved.triggers[0] as any).code).toContain("(10.0F > 5.0F)");
  });

  it("formats Number values as Java floats", () => {
    const exactNumberIR: NovaIR = {
      triggers: [
        {
          id: "trigger_3",
          type: "PLAYER_RIGHT_CLICK",
          entry: "explosion_1",
          nodes: {
            explosion_1: {
              id: "explosion_1",
              type: "ACTION",
              nodeType: "EXPLOSION",
              parameters: {
                power: {
                  type: "NUMBER",
                  sourceNodeId: "number_1",
                  sourcePin: "value"
                }
              },
              properties: {
                power: 4,
                explosionType: "TNT"
              },
              next: []
            } as any,
            number_1: {
              id: "number_1",
              type: "ACTION",
              nodeType: "NUMBER",
              parameters: {
                value: {
                  type: "NUMBER",
                  value: 20
                }
              },
              properties: {
                value: 20
              },
              next: []
            } as any
          }
        }
      ]
    };

    const decimalIR: NovaIR = {
      triggers: [
        {
          id: "trigger_4",
          type: "PLAYER_RIGHT_CLICK",
          entry: "explosion_1",
          nodes: {
            explosion_1: {
              id: "explosion_1",
              type: "ACTION",
              nodeType: "EXPLOSION",
              parameters: {
                power: {
                  type: "NUMBER",
                  sourceNodeId: "number_1",
                  sourcePin: "value"
                }
              },
              properties: {
                power: 4,
                explosionType: "TNT"
              },
              next: []
            } as any,
            number_1: {
              id: "number_1",
              type: "ACTION",
              nodeType: "NUMBER",
              parameters: {
                value: {
                  type: "NUMBER",
                  value: 123.456
                }
              },
              properties: {
                value: 123.456
              },
              next: []
            } as any
          }
        }
      ]
    };

    const resolvedExact = resolveIR(exactNumberIR, "FORGE");
    const resolvedDecimal = resolveIR(decimalIR, "FORGE");

    expect((resolvedExact.triggers[0] as any).code).toContain("20.0F");
    expect((resolvedDecimal.triggers[0] as any).code).toContain("123.456F");
  });

  it("resolves Player Position Y into a Java accessor", () => {
    const novaIR: NovaIR = {
      triggers: [
        {
          id: "trigger_5",
          type: "PLAYER_RIGHT_CLICK",
          entry: "explosion_1",
          nodes: {
            explosion_1: {
              id: "explosion_1",
              type: "ACTION",
              nodeType: "EXPLOSION",
              parameters: {
                power: {
                  type: "NUMBER",
                  sourceNodeId: "player_pos_1",
                  sourcePin: "y"
                }
              },
              properties: {
                power: 4,
                explosionType: "TNT"
              },
              next: []
            } as any,
            player_pos_1: {
              id: "player_pos_1",
              type: "ACTION",
              nodeType: "PLAYER_POSITION",
              parameters: {},
              properties: {},
              next: []
            } as any
          }
        }
      ]
    };

    const resolved = resolveIR(novaIR, "FORGE");
    expect((resolved.triggers[0] as any).code).toContain("player.getY()");
  });
});
