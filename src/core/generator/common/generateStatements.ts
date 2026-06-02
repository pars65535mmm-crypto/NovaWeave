// src/core/generator/common/generateStatements.ts
import { ResolvedTrigger, Statement } from "../../types/ResolvedIR.js";
import { NodeRegistry } from "../../../editor/NodeRegistry.js";
import { LoaderType } from "../../types/LoaderType.js";
import { TemplateEngine } from "../template/TemplateEngine.js";
import { resolveExpression, GraphContext } from "../../resolver/resolveExpression.js";

// 🎯 第3引数 `graphNodes` を追加し、エディタ上の生のノードハッシュを受け取れるように拡張！
export function generateStatements(
  triggers: ResolvedTrigger[], 
  loader: LoaderType,
  graphNodes?: Record<string, any> // 👈 ✨本物のノードを受け取る引数を正式追加！
): string {
  const currentLoader = loader.toLowerCase();

  // 🪐 魂のハイドレート：数式VM（resolveExpression）の目隠しを完全に解除する！！！
  const graphContext: GraphContext = {
    nodes: graphNodes || {}, // 👈 ☠️空ハッシュだった場所に、本物のノードデータを完全注入！！！
    cache: {}
  };

  return triggers
    .map(trigger => {
      if ((trigger as any).code) {
        return (trigger as any).code;
      }

      return trigger.statements.map((statement: Statement) => {
        const statementType = String(statement.type).toUpperCase();
        const registryInstance = NodeRegistry.getInstance() as any;
        
        const actionDef = registryInstance?.get?.(statement.type) || 
                          registryInstance?.get?.(statementType) || 
                          registryInstance?.[statement.type] || 
                          registryInstance?.[statementType] ||
                          registryInstance?.nodes?.[statementType];

        let codeTemplate = actionDef?.codeTemplate || actionDef?.templates;

        if (!codeTemplate || !codeTemplate[currentLoader]) {
          return `            // ⚠ テンプレート（またはローダー [${currentLoader}] 用のコード）が未定義です: ${statement.type}`;
        }

        const template = codeTemplate[currentLoader];
        
        const resolvedInputs: Record<string, string> = {};
        if (actionDef?.inputs) {
          for (const input of actionDef.inputs) {
            if (input.id === "flow") continue;

            const resolvedValue = (statement as any)[input.id];
            if (resolvedValue !== undefined && resolvedValue !== null) {
              resolvedInputs[input.id] = String(resolvedValue);
              continue;
            }

            const legacyConnection = (statement as any).inputs?.[input.id];
            if (legacyConnection && legacyConnection.targetNodeId) {
              // 数式VMが、今度こそ本物のノードデータを辿って RANDOM や MATH を再帰パースする！
              resolvedInputs[input.id] = resolveExpression(legacyConnection.targetNodeId, legacyConnection.targetPinId, graphContext);
              continue;
            }

            if (statement.properties?.[input.id] !== undefined) {
              resolvedInputs[input.id] = String(statement.properties[input.id]);
            }
          }
        }
        
        return TemplateEngine.applyTemplate(template, {
          properties: statement.properties,
          inputs: resolvedInputs,
          definitionProperties: actionDef?.properties,
          definitionInputs: actionDef?.inputs,
          fallbackPosition: (statement as any).position
        });
      }).join("\n");
    })
    .join("\n\n");
}
