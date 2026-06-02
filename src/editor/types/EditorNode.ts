export interface EditorNode {
  id: string;
  title: string;
  color: string;
  inputs: EditorPin[];
  outputs: EditorPin[];
  properties: EditorProperty[];
}

export interface EditorPin {
  id: string;
  name: string;
  type: string;
}

export interface EditorProperty {
  id: string;
  type: string;
  value: any;
}