import { IResolver } from "../ResolverRegistry.js";
import { IRAction, IRTrigger } from "../../types/NovaIR.js";
import { NodeDefinition } from "../../types/NodeDefinition.js";

export class ExpressionResolver implements IResolver {
  private normalizeOperation(op: string): string {
    const raw = op.toUpperCase();
    const aliases: Record<string, string> = {
      "==": "EQUAL",
      "EQUALS": "EQUAL",
      "!=": "NOT_EQUAL",
      "NOT_EQUALS": "NOT_EQUAL",
      ">": "GREATER",
      "GREATER_THAN": "GREATER",
      "<": "LESS",
      "LESS_THAN": "LESS",
      ">=": "GREATER_EQUAL",
      "GREATER_THAN_OR_EQUAL": "GREATER_EQUAL",
      "GREATER_EQUAL": "GREATER_EQUAL",
      "<=": "LESS_EQUAL",
      "LESS_THAN_OR_EQUAL": "LESS_EQUAL",
      "LESS_EQUAL": "LESS_EQUAL"
    };
    return aliases[raw] || raw;
  }

  resolve(
    _paramKey: string | null,
    actionNode: IRAction,
    trigger: IRTrigger,
    imports: Set<string>,
    resolveParameterExpression: (key: string, node: IRAction, trig: IRTrigger, imp: Set<string>) => string,
    nodeDef: NodeDefinition
  ): string {
    // 必須インポートの解決
    if (nodeDef.requiredImports) {
      nodeDef.requiredImports.forEach(imp => imports.add(imp));
    }

    // オペレーション型 (MATHノードなど)
    if (nodeDef.operations) {
      const op = this.normalizeOperation(String((actionNode as any).properties?.operation || "ADD"));
      let template = nodeDef.operations[op] || nodeDef.operations["ADD"];
      if (!template && op !== "ADD") {
        template = nodeDef.operations["ADD"] || Object.values(nodeDef.operations)[0];
      }
      // 入力ピンの解決
      for (const input of nodeDef.inputs) {
        const val = resolveParameterExpression(input.id, actionNode, trigger, imports) ?? "0.0";
        template = template.split(`\${${input.id}}`).join(val);
      }
      return template;
    }

    // テンプレート型 (RANDOMノード、NUMBERノードなど)
    if (nodeDef.expressionTemplate) {
      let template = nodeDef.expressionTemplate;
      
      // 入力ピンの解決
      for (const input of nodeDef.inputs) {
        const val = resolveParameterExpression(input.id, actionNode, trigger, imports) ?? "0.0";
        template = template.split(`\${${input.id}}`).join(val);
      }
      
      // プロパティの解決 (min, max, value など)
      if (nodeDef.properties) {
        for (const prop of nodeDef.properties) {
          let propVal = (actionNode as any).properties?.[prop.id];
          if (propVal === undefined) {
             propVal = prop.default;
          }
          let propStr = String(propVal);
          
          // Javaのfloatとして扱えるようにする小技
          // 値が数値文字列であり、かつドットを含まない場合 .0F を付ける。ドットがあれば F だけ付ける。
          if (typeof propVal === "number" || !isNaN(Number(propStr))) {
            propStr = propStr.includes('.') ? `${propStr}F` : `${propStr}.0F`;
          }

          template = template.split(`\${${prop.id}}`).join(propStr);
        }
      }
      return template;
    }

    return "0.0";
  }
}
