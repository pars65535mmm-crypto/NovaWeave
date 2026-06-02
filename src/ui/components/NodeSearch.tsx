import { useState, useEffect, useRef } from "react";
import { NodeList } from "./NodeList";
import { NodeRegistry } from "../../editor/NodeRegistry"; // 🌟 追加

interface NodeSearchProps {
  onSelect: (type: string) => void;
  onCancel: () => void;
}

export function NodeSearch({ onSelect, onCancel }: NodeSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 🌟 ハードコードを完全撤廃し、中央レジストリから登録ノードを全取得！
  const availableNodes = NodeRegistry.getInstance().getAll().map(def => ({
    type: def.runtimeType,
    label: def.displayName,
    category: def.category
  }));

  const filteredNodes = availableNodes.filter(
    (node) =>
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredNodes.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredNodes.length) % filteredNodes.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredNodes[selectedIndex]) {
        onSelect(filteredNodes[selectedIndex].type);
      }
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search nodes... (expl / tri)"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setSelectedIndex(0); // 検索文字が変わったら選択位置をトップにリセット
        }}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          background: "#11111b",
          border: "1px solid #313244",
          borderRadius: "4px",
          padding: "6px",
          color: "#a6adc8",
          fontSize: "12px",
          outline: "none",
          boxSizing: "border-box",
          marginBottom: "4px"
        }}
      />
      {/* 描画のみを担当するリストコンポーネントへデータを流し込む */}
      <NodeList
        nodes={filteredNodes}
        selectedIndex={selectedIndex}
        onHoverItem={setSelectedIndex}
        onSelectItem={onSelect}
      />
    </>
  );
}