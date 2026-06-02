interface NodeItem {
  type: string;
  label: string;
  category: string;
}

interface NodeListProps {
  nodes: NodeItem[];
  selectedIndex: number;
  onHoverItem: (index: number) => void;
  onSelectItem: (type: string) => void;
}

export function NodeList({ nodes, selectedIndex, onHoverItem, onSelectItem }: NodeListProps) {
  if (nodes.length === 0) {
    return <div style={{ padding: "6px", fontSize: "11px", color: "#f38ba8" }}>No nodes found</div>;
  }

  return (
    <div style={{ maxHeight: "200px", overflowY: "auto" }}>
      {nodes.map((node, index) => (
        <div
          key={node.type}
          onClick={() => onSelectItem(node.type)}
          onMouseEnter={() => onHoverItem(index)}
          style={{
            padding: "6px 8px",
            fontSize: "12px",
            borderRadius: "4px",
            background: index === selectedIndex ? "#b4befe" : "transparent",
            color: index === selectedIndex ? "#11111b" : "#cdd6f4",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            transition: "background 0.1s ease"
          }}
        >
          <span>{node.label}</span>
          <span
            style={{
              fontSize: "9px",
              color: index === selectedIndex ? "#585b70" : "#6c7086",
              background: index === selectedIndex ? "rgba(0,0,0,0.1)" : "#181825",
              padding: "2px 4px",
              borderRadius: "3px"
            }}
          >
            {node.category}
          </span>
        </div>
      ))}
    </div>
  );
}