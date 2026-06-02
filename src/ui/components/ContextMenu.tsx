import { useEffect } from "react";
import { NodeSearch } from "./NodeSearch";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onNodeAdded: (type: string, x: number, y: number) => void;
}

export function ContextMenu({ x, y, onClose, onNodeAdded }: ContextMenuProps) {
  useEffect(() => {
    // 枠外クリックでメニューを閉じるイベントリスナー
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".context-menu-root")) {
        onClose();
      }
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  return (
    <div
      className="context-menu-root"
      style={{
        position: "fixed",
        top: y,
        left: x,
        zIndex: 999,
        background: "#1e1e2e",
        border: "1px solid #45475a",
        borderRadius: "6px",
        padding: "4px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        width: "220px",
        color: "#cdd6f4",
        fontFamily: "monospace"
      }}
    >
      {/* 検索・選択ロジックを内包したコアコンポーネントへ処理を委譲 */}
      <NodeSearch 
        onSelect={(type) => {
          onNodeAdded(type, x, y);
          onClose();
        }} 
        onCancel={onClose} 
      />
    </div>
  );
}