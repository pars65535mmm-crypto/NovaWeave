import { ResolvedIR } from "../../types/ResolvedIR.js";
import { LoaderType } from "../../types/LoaderType.js";

export interface LoaderAdapter {
  generateImports(resolved: ResolvedIR): string;
  // 🌟 修正ポイント: 引数に loader を追加してリレーを許可
  generateEvents(resolved: ResolvedIR, loader: LoaderType): string;
}