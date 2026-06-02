import { EditorNode } from "../types/EditorNode.js";

// Rete.jsの最小限の構造をモック/定義として扱い、後ほど画面と結合しやすくします
export class ReteNodeMock {
  title: string;
  inputs: Map<string, string> = new Map();
  outputs: Map<string, string> = new Map();

  constructor(title: string) {
    this.title = title;
  }

  addInput(id: string, name: string) {
    this.inputs.set(id, name);
  }

  addOutput(id: string, name: string) {
    this.outputs.set(id, name);
  }
}

export function editorNodeToRete(editorNode: EditorNode): ReteNodeMock {
  // 本番環境では new Rete.Node(editorNode.title) になる部分
  const node = new ReteNodeMock(editorNode.title);

  for (const input of editorNode.inputs) {
    node.addInput(input.id, input.name);
  }

  for (const output of editorNode.outputs) {
    node.addOutput(output.id, output.name);
  }

  return node;
}