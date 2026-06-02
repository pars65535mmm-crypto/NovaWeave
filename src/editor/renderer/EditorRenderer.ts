import { EditorNode } from "../types/EditorNode.js";

export interface EditorRenderer {
  initialize(container: HTMLElement): Promise<void>;
  renderNode(node: EditorNode): Promise<void>;
  removeNode(nodeId: string): Promise<void>;
  updateSelection(nodeId: string | null): Promise<void>;
}