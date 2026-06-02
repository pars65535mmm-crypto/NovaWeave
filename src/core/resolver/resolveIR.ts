import { NovaIR, IRTrigger, IRAction } from "../types/NovaIR.js";
import { ResolvedIR, ResolvedTrigger, Statement } from "../types/ResolvedIR.js";
import { LoaderType } from "../types/LoaderType.js";
import { NodeRegistry } from "../../editor/NodeRegistry.js";
import { ResolverRegistry } from "./ResolverRegistry.js";
import { ExpressionResolver } from "./resolvers/ExpressionResolver.js";
import { PositionResolver } from "./resolvers/PositionResolver.js";

// Resolverの登録
ResolverRegistry.register("EXPRESSION", new ExpressionResolver());
ResolverRegistry.register("POSITION_PROVIDER", new PositionResolver());

type VariableType = "NUMBER" | "BOOLEAN" | "STRING" | "POSITION";
interface VariableInfo {
  declared: boolean;
  type: VariableType;
}

export function resolveIR(novaIR: NovaIR, loaderMode: LoaderType = "FORGE"): ResolvedIR {
  const imports = new Set<string>();
  const resolvedTriggers: ResolvedTrigger[] = [];

  for (const trigger of novaIR.triggers) {
    const resolvedTrigger = resolveTrigger(trigger, imports, loaderMode);
    resolvedTriggers.push(resolvedTrigger);
  }

  return {
    imports,
    triggers: resolvedTriggers
  };
}

function indentBlock(code: string, spaces = 16): string {
  const prefix = " ".repeat(spaces);
  return code
    .split("\n")
    .map(line => (line.trim() ? `${prefix}${line}` : line))
    .join("\n");
}

function normalizeVariableType(rawType: unknown): VariableType {
  const normalized = String(rawType ?? "NUMBER").toUpperCase();
  if (normalized === "BOOLEAN" || normalized === "STRING" || normalized === "POSITION") {
    return normalized;
  }
  return "NUMBER";
}

function toJavaVariableType(variableType: VariableType): string {
  switch (variableType) {
    case "BOOLEAN":
      return "boolean";
    case "STRING":
      return "String";
    case "POSITION":
      return "Object";
    case "NUMBER":
    default:
      return "float";
  }
}

function formatVariableValue(value: string, variableType: VariableType): string {
  if (variableType === "NUMBER") {
    if (value.includes("float") || value.endsWith("F")) return value;
    if (/^-?\d+(\.\d+)?$/.test(value.trim())) {
      return value.includes(".") ? `${value}F` : `${value}.0F`;
    }
  }
  return value;
}

function renderActionCode(
  statement: Statement,
  nodeDef: any,
  loaderMode: LoaderType
): string {
  if (!nodeDef?.codeTemplate) return "";

  let code = loaderMode === "FABRIC" ? nodeDef.codeTemplate.fabric : nodeDef.codeTemplate.forge;
  const resolvedValues: Record<string, string> = {};

  if (nodeDef.properties) {
    for (const prop of nodeDef.properties) {
      let val = statement.properties?.[prop.id] ?? prop.default;
      if (typeof val === "number" || !isNaN(Number(val))) {
        const strVal = String(val);
        val = strVal.includes(".") ? `${strVal}F` : `${strVal}.0F`;
      } else {
        val = String(val).toUpperCase();
      }
      resolvedValues[prop.id] = val as string;
    }
  }

  if (nodeDef.inputs) {
    for (const input of nodeDef.inputs) {
      if (input.id === "flow") continue;
      const paramVal = (statement as any)[input.id];
      if (paramVal !== undefined) {
        resolvedValues[input.id] = String(paramVal);
      } else if (!resolvedValues[input.id]) {
        if (input.id === "position") resolvedValues[input.id] = "player.getX(), player.getY(), player.getZ()";
        else if (input.id === "power") resolvedValues[input.id] = "4.0F";
        else resolvedValues[input.id] = "0.0";
      }
    }
  }

  for (const [key, val] of Object.entries(resolvedValues)) {
    code = code.split(`\${${key}}`).join(val);
  }

  if (nodeDef.runtimeType === "IF") {
    const trueBranch = (statement as any).trueBranchCode ? indentBlock((statement as any).trueBranchCode) : "";
    const falseBranch = (statement as any).falseBranchCode ? ` else {\n${indentBlock((statement as any).falseBranchCode)}\n}` : "";
    const condition = (statement as any).condition || "false";
    return `if (${condition}) {\n${trueBranch}\n}${falseBranch}`;
  }

  return code;
}

/**
 * 🌟【型安全版】上流ノードを遡って、Javaの引数に代入すべき「式（Expression）」を動的に生成するコアロジック
 */
function resolveParameterExpression(paramKey: string, actionNode: IRAction, trigger: IRTrigger, imports: Set<string>): string | undefined {
  const param = (actionNode.parameters?.[paramKey] ?? (actionNode as any)[paramKey]) as any;
  
  if (!param) {
    return undefined; // 未接続
  }

  // 直値の処理
  if (param.type === "NUMBER" || param.type === "number") {
    if (param.value !== undefined) {
      const rawVal = parseFloat(param.value as any) || 0.0;
      return `${rawVal.toFixed(1)}F`;
    }
  }

  if (param.type === "BOOLEAN" || param.type === "boolean") {
    if (param.value !== undefined) {
      return String(Boolean(param.value));
    }
  }

  if (param.type === "STRING" || param.type === "string") {
    if (param.value !== undefined) {
      return JSON.stringify(String(param.value));
    }
  }

  const sourceNodeId = param.sourceNodeId;
  if (!sourceNodeId) {
    return undefined; // 未接続
  }

  const upstreamNode = trigger.nodes[sourceNodeId];
  if (!upstreamNode) return undefined;

  const upperType = upstreamNode.nodeType?.toUpperCase() || (upstreamNode as any).type?.toUpperCase();
  const nodeDef = (NodeRegistry.getInstance() as any).get?.(upperType) || (NodeRegistry as any)[upperType];
  
  if (!nodeDef) return undefined;

  const resolver = ResolverRegistry.get(nodeDef.resolverType);
  if (resolver) {
    // Resolverの戻り値はstringとする。
    const resolved = resolver.resolve(param.sourcePin || paramKey, upstreamNode as IRAction, trigger, imports, 
      (k, n, t, i) => resolveParameterExpression(k, n, t, i) ?? "0.0", // 内部で再帰呼び出しする際は未接続時に0.0を渡す（計算式等のため）
      nodeDef);
    return resolved;
  }

  return undefined;
}

function resolveTriggerNode(
  nodeId: string,
  trigger: IRTrigger,
  imports: Set<string>,
  loaderMode: LoaderType,
  rendered: Set<string>,
  variableTable: Map<string, VariableInfo>
): { statements: Statement[]; code: string } {
  if (!nodeId || rendered.has(nodeId)) {
    return { statements: [], code: "" };
  }

  const irNode = trigger.nodes[nodeId];
  if (!irNode) return { statements: [], code: "" };

  rendered.add(nodeId);

  if (irNode.type === "CONTROL") {
    const controlNode = irNode as any;
    const controlType = String(controlNode.nodeType || "").toUpperCase();

    if (controlType === "IF") {
      const conditionExpr = resolveParameterExpression("condition", controlNode, trigger, imports) || "false";

      const trueBranch = resolveTriggerNode(controlNode.nextTrue || "", trigger, imports, loaderMode, new Set(rendered), variableTable);
      const falseBranch = resolveTriggerNode(controlNode.nextFalse || "", trigger, imports, loaderMode, new Set(rendered), variableTable);

      const statement: Statement = {
        id: controlNode.id,
        type: "IF",
        nodeType: "IF",
        condition: conditionExpr,
        nextTrue: controlNode.nextTrue,
        nextFalse: controlNode.nextFalse,
        trueBranchCode: trueBranch.code,
        falseBranchCode: falseBranch.code
      } as any;

      const code = renderActionCode(statement, {
        runtimeType: "IF",
        codeTemplate: {
          fabric: "if (${condition}) {\n${trueBranch}\n}",
          forge: "if (${condition}) {\n${trueBranch}\n}"
        },
        properties: [],
        inputs: []
      }, loaderMode);

      return {
        statements: [statement, ...trueBranch.statements, ...falseBranch.statements],
        code
      };
    }

    if (controlType === "FOR") {
      const variableName = String(controlNode.properties?.variableName || "i");
      const startExpr = resolveParameterExpression("start", controlNode, trigger, imports) || "0.0F";
      const endExpr = resolveParameterExpression("end", controlNode, trigger, imports) || "0.0F";
      const stepExpr = formatVariableValue(
        resolveParameterExpression("step", controlNode, trigger, imports) || "1.0F",
        "NUMBER"
      );

      const bodyBranch = resolveTriggerNode(controlNode.nextBody || "", trigger, imports, loaderMode, new Set(rendered), variableTable);
      const afterBranch = resolveTriggerNode(controlNode.nextAfter || "", trigger, imports, loaderMode, new Set(rendered), variableTable);

      const code = `for (float ${variableName} = ${startExpr}; ${variableName} < ${endExpr}; ${variableName} += ${stepExpr}) {\n${indentBlock(bodyBranch.code)}\n}`;

      const statement: Statement = {
        id: controlNode.id,
        type: "FOR",
        nodeType: "FOR",
        properties: controlNode.properties ? { ...(controlNode.properties as any) } : {},
        parameters: controlNode.parameters ? { ...(controlNode.parameters as any) } : {},
        nextBody: controlNode.nextBody,
        nextAfter: controlNode.nextAfter,
        code
      } as any;

      return {
        statements: [statement, ...bodyBranch.statements, ...afterBranch.statements],
        code: [code, afterBranch.code].filter(Boolean).join("\n")
      };
    }

    if (controlType === "WHILE") {
      const conditionExpr = resolveParameterExpression("condition", controlNode, trigger, imports) || "false";
      const guardLimit = Number(controlNode.properties?.guardLimit ?? 10000) || 10000;
      const bodyBranch = resolveTriggerNode(controlNode.nextBody || "", trigger, imports, loaderMode, new Set(rendered), variableTable);
      const afterBranch = resolveTriggerNode(controlNode.nextAfter || "", trigger, imports, loaderMode, new Set(rendered), variableTable);
      const code = `int __novaGuard = 0;\nwhile ((${conditionExpr}) && __novaGuard++ < ${guardLimit}) {\n${indentBlock(bodyBranch.code)}\n}`;

      const statement: Statement = {
        id: controlNode.id,
        type: "WHILE",
        nodeType: "WHILE",
        condition: conditionExpr,
        properties: controlNode.properties ? { ...(controlNode.properties as any) } : {},
        nextBody: controlNode.nextBody,
        nextAfter: controlNode.nextAfter,
        code
      } as any;

      return {
        statements: [statement, ...bodyBranch.statements, ...afterBranch.statements],
        code: [code, afterBranch.code].filter(Boolean).join("\n")
      };
    }
  }

  if (irNode.type === "ACTION") {
    const actionNode = irNode as IRAction;
    const nodeDef = (NodeRegistry.getInstance() as any).get?.(actionNode.nodeType || "") || (NodeRegistry as any)[actionNode.nodeType || ""];
    const resolvedParams: Record<string, string> = {};

    if (nodeDef && nodeDef.resolverType === "ACTION") {
      for (const input of nodeDef.inputs) {
        if (input.id === "flow") continue;
        let expr = resolveParameterExpression(input.id, actionNode, trigger, imports);
        if (expr !== undefined) {
          if (expr === "PLAYER_POSITION_BLOCK" || expr === "0.0") {
            if (input.id === "position") {
              expr = "player.getX(), player.getY(), player.getZ()";
            }
          }
          if (input.id === "power" && !expr.endsWith("F") && !expr.includes("float")) {
            expr = `(float)(${expr})`;
          }
          resolvedParams[input.id] = expr;
        }
      }
    }

    const statement: Statement = {
      id: actionNode.id,
      type: actionNode.nodeType,
      nodeType: actionNode.nodeType,
      ...resolvedParams,
      properties: actionNode.properties ? { ...(actionNode.properties as any) } : {},
      next: actionNode.next
    } as any;

    if ((actionNode.nodeType || "").toUpperCase() === "VARIABLE_SET") {
      const variableName = String(
        actionNode.properties?.variableName ??
        actionNode.properties?.varName ??
        (statement as any).variableName ??
        "damage"
      );
      const variableType = normalizeVariableType(actionNode.properties?.valueType);
      const currentInfo = variableTable.get(variableName);
      const isDeclaration = !currentInfo?.declared;
      const valueExpr = formatVariableValue(resolvedParams.value ?? "0.0F", variableType);
      const javaType = toJavaVariableType(variableType);
      const code = isDeclaration
        ? `${javaType} ${variableName} = ${valueExpr};`
        : `${variableName} = ${valueExpr};`;

      variableTable.set(variableName, { declared: true, type: variableType });
      (statement as any).code = code;
      (statement as any).variableName = variableName;
      (statement as any).variableType = variableType;

      const nextId = actionNode.next[0] || "";
      const nextResult = resolveTriggerNode(nextId, trigger, imports, loaderMode, rendered, variableTable);
      return {
        statements: [statement, ...nextResult.statements],
        code: [code, nextResult.code].filter(Boolean).join("\n")
      };
    }

    const code = nodeDef
      ? renderActionCode(statement, nodeDef, loaderMode)
      : "";

    const nextId = actionNode.next[0] || "";
    const nextResult = resolveTriggerNode(nextId, trigger, imports, loaderMode, rendered, variableTable);

    return {
      statements: [statement, ...nextResult.statements],
      code: [code, nextResult.code].filter(Boolean).join("\n")
    };
  }

  return { statements: [], code: "" };
}

/**
 * トリガーを解析し、選択中の Mod Loader (Forge/Fabric) に最適化したコードを組み立てる内部関数
 */
function resolveTrigger(trigger: IRTrigger, imports: Set<string>, loaderMode: LoaderType): ResolvedTrigger {
  if (trigger.type === "PLAYER_RIGHT_CLICK") {
    if (loaderMode === "FABRIC") {
      imports.add("net.fabricmc.fabric.api.event.player.UseBlockCallback");
      imports.add("net.minecraft.world.InteractionResult");
      imports.add("net.minecraft.world.World");
    } else {
      imports.add("net.minecraftforge.event.entity.player.PlayerInteractEvent");
      imports.add("net.minecraft.world.entity.player.Player");
      imports.add("net.minecraft.world.level.Level");
    }
  }

  const traversal = resolveTriggerNode(trigger.entry || "", trigger, imports, loaderMode, new Set<string>(), new Map<string, VariableInfo>());
  const statements = traversal.statements;
  const actionsCode = traversal.code
    .split("\n")
    .map((line: string) => (line.trim() ? `                    ${line}` : ""))
    .join("\n");

  let finalCodeBlock = "";

  if (trigger.type === "PLAYER_RIGHT_CLICK") {
    if (loaderMode === "FABRIC") {
      finalCodeBlock = `        // 🌲 PLAYER_RIGHT_CLICK イベントへの自動パイルインジェクション (Fabric)
        net.fabricmc.fabric.api.event.player.UseBlockCallback.EVENT.register((player, world, hand, hitResult) -> {
${actionsCode}
            return net.minecraft.world.InteractionResult.PASS;
        });`;
    } else {
      finalCodeBlock = actionsCode;
    }
  } else {
    finalCodeBlock = actionsCode;
  }

  return {
    eventType: trigger.type,
    statements,
    code: finalCodeBlock
  } as ResolvedTrigger & { code: string };
}
