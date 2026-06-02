import { IRAction, IRTrigger } from "../types/NovaIR.js";
import { NodeDefinition } from "../types/NodeDefinition.js";

export interface IResolver {
  resolve(
    paramKey: string | null,
    actionNode: IRAction,
    trigger: IRTrigger,
    imports: Set<string>,
    resolveParameterExpression: (key: string, node: IRAction, trig: IRTrigger, imp: Set<string>) => string,
    nodeDef: NodeDefinition
  ): string;
}

export class ResolverRegistry {
  private static resolvers: Map<string, IResolver> = new Map();

  static register(resolverType: string, resolver: IResolver) {
    this.resolvers.set(resolverType, resolver);
  }

  static get(resolverType: string): IResolver | undefined {
    return this.resolvers.get(resolverType);
  }
}
