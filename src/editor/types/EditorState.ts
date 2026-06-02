import { EditorNode } from "./EditorNode.js";

export interface EditorState {
  nodes: EditorNode[];
  selectedNodeId?: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
}