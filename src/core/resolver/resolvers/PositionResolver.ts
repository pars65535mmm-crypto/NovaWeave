import { IResolver } from "../ResolverRegistry.js";
import { IRAction, IRTrigger } from "../../types/NovaIR.js";
import { NodeDefinition } from "../../types/NodeDefinition.js";

export class PositionResolver implements IResolver {
  resolve(
    paramKey: string | null,
    actionNode: IRAction,
    trigger: IRTrigger,
    imports: Set<string>,
    resolveParameterExpression: (key: string, node: IRAction, trig: IRTrigger, imp: Set<string>) => string,
    nodeDef: NodeDefinition
  ): string {
    const type = nodeDef.runtimeType.toUpperCase();

    if (type === "PLAYER_POSITION") {
      if (paramKey === "x") return "player.getX()";
      if (paramKey === "y") return "player.getY()";
      if (paramKey === "z") return "player.getZ()";
      return "PLAYER_POSITION_BLOCK";
    }

    if (type === "BREAK_POSITION") {
      const posExpr = resolveParameterExpression("position", actionNode, trigger, imports);
      if (posExpr === "PLAYER_POSITION_BLOCK") {
        if (paramKey === "x") return "player.getX()";
        if (paramKey === "y") return "player.getY()";
        if (paramKey === "z") return "player.getZ()";
      }
      return "0.0";
    }

    if (type === "MAKE_POSITION") {
      const xExpr = resolveParameterExpression("x", actionNode, trigger, imports);
      const yExpr = resolveParameterExpression("y", actionNode, trigger, imports);
      const zExpr = resolveParameterExpression("z", actionNode, trigger, imports);
      return `${xExpr}, ${yExpr}, ${zExpr}`;
    }

    return "0.0";
  }
}
