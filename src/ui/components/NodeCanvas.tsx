import { useEffect, useRef, useState } from "react";
import { ReteRenderer } from "../../editor/renderer/ReteRenderer";
// 💡 エラー2724対策：小文字の instance ではなく大文字のクラスとして扱えるようフォールバック付きで対応
import { editorStore } from "../../editor/state/editorStore";
import { saveProject } from "../../project/saveProject";
import { loadProject } from "../../project/loadProject";
import { NovaProject } from "../../project/ProjectSchema";
import { normalizeNodeGraph } from "../../core/types/NodeGraph";
import { ContextMenu } from "./ContextMenu";
import { KeyboardManager } from "../../editor/shortcuts/keyboardManager";
import { NodeRegistry } from "../../editor/NodeRegistry"; 
import { NodeProperty } from "../../core/types/NodeDefinition.js"; 
import { LoaderType } from "../../core/types/LoaderType.js";
import { exportForgeProject, exportGeneratedJava } from "../../project/exportArtifacts";

const createInitialProject = (): NovaProject => ({
  version: "0.1",
  modId: "my_nova_mod",
  minecraftVersion: "1.20.1",
  loader: "fabric",
  graph: {
    nodes: {
      "trigger_1": { id: "trigger_1", type: "PLAYER_RIGHT_CLICK", properties: {} },
      "node_inst_1": { id: "node_inst_1", type: "EXPLOSION", properties: { power: 5.0, explosionType: "TNT" } }
    },
    edges: []
  },
  metadata: {
    name: "Default Project",
    author: "tyamizumoti",
    description: "新規生成されたプロジェクト",
    createdAt: Date.now(),
    modifiedAt: Date.now()
  }
});

export function NodeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const rendererRef = useRef<ReteRenderer | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const [menuMenu, setMenuMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [generatedCode, setGeneratedCode] = useState(editorStore.generatedCode);
  const [exportStatus, setExportStatus] = useState<string>("");
  
  // 🌟 全画面およびインスペクターを連動させるためのグローバルリフレッシュトリガー
  const [globalRefreshTrigger, setGlobalRefreshTrigger] = useState(0);
  const [currentLoaderValue, setCurrentLoaderValue] = useState(editorStore.currentLoader);

  // インスペクターの再描画・最新状態への同期用ヘルパー
  const refreshSelectedNode = (nodeId: string) => {
    const currentGraph = editorStore.getProjectDataForSave();
    const nodeData = currentGraph.nodes[nodeId];
    if (nodeData) {
      setSelectedNode({
        id: nodeId,
        type: (nodeData.type || "").toUpperCase(),
        properties: { ...(nodeData.properties || {}) }
      });
    }
  };

  // Store の選択・プロパティ・ローダー変更を右パネルへ反映
  useEffect(() => {
    const syncFromStore = () => {
      setCurrentLoaderValue(editorStore.currentLoader);
      const id = editorStore.getSelectedNodeId();
      setGeneratedCode(editorStore.generatedCode);
      if (id) {
        refreshSelectedNode(id);
      } else {
        setSelectedNode(null);
      }
      setGlobalRefreshTrigger((prev) => prev + 1);

      if (!editorStore.isRestoring) {
        if (saveTimerRef.current !== null) {
          window.clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = window.setTimeout(() => {
          const currentActiveLoader = editorStore.currentLoader || "fabric";
          const rawGraph = editorStore.getProjectDataForSave();

          const fullProject: NovaProject = {
            version: "0.1",
            modId: "my_nova_mod",
            minecraftVersion: "1.20.1",
            loader: (currentActiveLoader === "FORGE" ? "forge" : "fabric") as NovaProject["loader"],
            graph: rawGraph,
            metadata: {
              name: "Saved Project",
              author: "tyamizumoti",
              description: "自動保存されたデータ",
              createdAt: Date.now(),
              modifiedAt: Date.now()
            }
          };
          saveProject(fullProject);
        }, 150);
      }
    };
    return editorStore.subscribe(syncFromStore);
  }, []);

  const handleCopyGeneratedCode = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setExportStatus("Java code copied to clipboard.");
    } catch (error) {
      setExportStatus(`Copy failed: ${(error as Error).message}`);
    }
  };

  const handleExportJava = async () => {
    try {
      const exportedPath = await exportGeneratedJava(generatedCode || "");
      setExportStatus(`Exported GeneratedMod.java → ${exportedPath}`);
    } catch (error) {
      setExportStatus(`Export Java failed: ${(error as Error).message}`);
    }
  };

  const handleExportForgeProject = async () => {
    try {
      const exportedPath = await exportForgeProject(generatedCode || "", "my_nova_mod");
      setExportStatus(`Exported Forge project → ${exportedPath}`);
    } catch (error) {
      setExportStatus(`Export Project failed: ${(error as Error).message}`);
    }
  };

  useEffect(() => {
    if (!containerRef.current || isInitialized.current) return;
    isInitialized.current = true;

    let km: KeyboardManager | null = null;

    async function initRete() {
      const renderer = new ReteRenderer();
      await renderer.initialize(containerRef.current!);
      rendererRef.current = renderer;

      (renderer as any).area.addPipe((context: any) => {
        if (context.type === "nodepicked") {
          editorStore.selectNode(context.data.id);
        } 
        else if (context.type === "nodeunpicked" || context.type === "unselectnode" || (context.type === "nodeselected" && !context.data)) {
          editorStore.selectNode(null);
        }
        else if (context.type === "connectioncreated" || context.type === "connectionremoved") {
          setGlobalRefreshTrigger(prev => prev + 1);
        }
        return context;
      });

      let projectData: NovaProject;

      try {
        projectData = await loadProject();
        if (projectData.loader) {
          editorStore.setModLoader(projectData.loader.toUpperCase() as LoaderType);
          setCurrentLoaderValue(editorStore.currentLoader);
        }
      } catch (e) {
        projectData = createInitialProject();
      }

      try {
        const graph = normalizeNodeGraph(projectData.graph);
        projectData.graph = graph;
        editorStore.loadProjectData(graph);
        await renderer.restoreProject(graph);
        editorStore.isRestoring = false;
        setGlobalRefreshTrigger(prev => prev + 1);
      } catch (restoreError) {
        editorStore.isRestoring = false;
        console.error("❌ 描画復元中にエラーが発生しました:", restoreError);
      }

      km = new KeyboardManager(renderer);
      km.start();
    }

    initRete();

    return () => {
      isInitialized.current = false;
      if (km) km.stop();
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setMenuMenu({ x: event.clientX, y: event.clientY });
  };

  const handleNodeAdded = async (type: string, screenX: number, screenY: number) => {
    if (!rendererRef.current || !containerRef.current) return;

    import("../../editor/history/HistoryManager").then(({ HistoryManager }) => {
      HistoryManager.getInstance().pushState();
    });

    const rect = containerRef.current.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    const area = (rendererRef.current as any).area;
    const transform = area.area.transform;
    const clickX = (canvasX - transform.x) / transform.k;
    const clickY = (canvasY - transform.y) / transform.k;

    const nodeTypeUpper = type.toUpperCase();
    const newId = editorStore.addNode(nodeTypeUpper, clickX, clickY);

    try {
      await rendererRef.current.renderNode({
        id: newId,
        title: nodeTypeUpper,
        x: clickX,
        y: clickY,
        properties: {}
      });

      editorStore.selectNode(newId);
    } catch (e) {
      console.error("❌ ノード追加エラー:", e);
    }
  };

  // 🌟【インスペクター自動生成エンジン - スキーマ拡張完全対応版】
  const renderDynamicInspector = () => {
    if (!selectedNode) return null;

    const definition = NodeRegistry.getInstance().get(selectedNode.type);
    const currentGraph = editorStore.getProjectDataForSave();
    const activeLoader = editorStore.currentLoader || "fabric";

    const checkConnection = (pinId: string) => {
      const edges = currentGraph.edges || [];
      const incomingEdge = edges.find((e: any) => {
        const isTargetNode = e.toNode === selectedNode.id;
        const targetPinName = (e.toPin || "").toLowerCase();
        const currentPinName = (pinId || "").toLowerCase();
        return isTargetNode && (targetPinName === currentPinName || targetPinName.includes(currentPinName));
      });

      if (incomingEdge) {
        const fromNode = currentGraph.nodes[incomingEdge.fromNode];
        const sourceProperties = fromNode?.properties || {};
        const connectedValue = sourceProperties[incomingEdge.fromPin] ?? Object.values(sourceProperties)[0] ?? undefined;

        return {
          connected: true,
          label: `🔗 Connected (${fromNode?.type || "UNKNOWN"}.${incomingEdge.fromPin})`,
          value: connectedValue
        };
      }
      return { connected: false, label: "Disconnected", value: undefined };
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* TOP METADATA CARD */}
        <div>
          <div style={{ fontSize: "11px", color: "#858585", marginBottom: "4px" }}>ID: {selectedNode.id}</div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: "bold", color: "#e0e0e0" }}>
            {definition?.displayName || selectedNode.type}
          </h2>
          <div style={{ fontSize: "11px", color: "#007acc", textTransform: "uppercase", fontWeight: "bold" }}>
            Type: {definition?.category || "Utility Node"}
          </div>
        </div>

        {/* PROPERTIES SECTION */}
        <div>
          <h4 style={{ fontSize: "11px", color: "#b5cea8", margin: "0 0 12px 0", letterSpacing: "0.5px" }}>PROPERTIES</h4>
          {definition?.properties && definition.properties.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {definition.properties.map((prop: NodeProperty) => { // 👑 型安全にバインド！
                const conn = checkConnection(prop.id);
                const currentVal = conn.connected && conn.value !== undefined 
                  ? conn.value 
                  : (selectedNode.properties?.[prop.id] ?? prop.default);

                const handlePropertyChange = (val: any) => {
                  // ストア更新
                  editorStore.updateNodeProperty(selectedNode.id, prop.id, val);
                  
                  // Reteキャンバスの実体にダイレクト同期
                  if (rendererRef.current) {
                    const editor = (rendererRef.current as any).editor; 
                    if (editor) {
                      const reteNode = editor.getNode(selectedNode.id);
                      if (reteNode) {
                        reteNode.properties = reteNode.properties || {};
                        reteNode.properties[prop.id] = val;
                      }
                    }
                  }
                  
                  refreshSelectedNode(selectedNode.id);
                  setGlobalRefreshTrigger(prev => prev + 1);
                };

                const renderInputComponent = () => {
                  switch (prop.type) {
                    case "boolean":
                      return (
                        <input
                          type="checkbox"
                          disabled={conn.connected}
                          checked={!!currentVal}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePropertyChange(e.target.checked)}
                          style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#007acc" }}
                        />
                      );

                    case "select":
                      return (
                        <select
                          disabled={conn.connected}
                          value={currentVal as string}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handlePropertyChange(e.target.value)}
                          style={{ backgroundColor: "#3c3c3c", color: "#ffffff", border: "1px solid #6b6b6b", padding: "6px", borderRadius: "4px", outline: "none", opacity: conn.connected ? 0.5 : 1, width: "100%" }}
                        >
                          {/* 👑 prop.options を型安全に展開！ fallback も完璧に用意 */}
                          {(prop.options || ["DEFAULT"]).map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      );

                    case "number":
                      // 👑 スキーマ拡張：もし min / max が定義されていたら、超直感的なスライダーUIをハイブリッド展開！
                      if (prop.min !== undefined && prop.max !== undefined) {
                        return (
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                            <input
                              type="range"
                              min={prop.min}
                              max={prop.max}
                              step={prop.step ?? 0.1}
                              disabled={conn.connected}
                              value={Number(currentVal) || prop.min}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePropertyChange(parseFloat(e.target.value) || 0)}
                              style={{ flex: 1, accentColor: "#007acc", cursor: "pointer" }}
                            />
                            <span style={{ fontSize: "12px", color: "#b5cea8", minWidth: "35px", textAlign: "right", fontFamily: "monospace" }}>
                              {Number(currentVal).toFixed(1)}
                            </span>
                          </div>
                        );
                      }
                      // min / max がなければ通常の数値入力
                      return (
                        <input
                          type="number"
                          step={prop.step ?? "0.5"}
                          disabled={conn.connected}
                          value={currentVal as string | number}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePropertyChange(parseFloat(e.target.value) || 0)}
                          style={{ backgroundColor: "#3c3c3c", color: "#ffffff", border: "1px solid #6b6b6b", padding: "6px 8px", borderRadius: "4px", outline: "none", opacity: conn.connected ? 0.6 : 1, width: "100%" }}
                        />
                      );

                    case "text":
                    default:
                      return (
                        <input
                          type="text"
                          disabled={conn.connected}
                          value={currentVal as string}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePropertyChange(e.target.value)}
                          style={{ backgroundColor: "#3c3c3c", color: "#ffffff", border: "1px solid #6b6b6b", padding: "6px 8px", borderRadius: "4px", outline: "none", opacity: conn.connected ? 0.6 : 1, width: "100%" }}
                        />
                      );
                  }
                };

                return (
                  <div key={prop.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#9cdcfe", fontSize: "13px", fontWeight: "500" }}>
                        {prop.label || (prop.id.charAt(0).toUpperCase() + prop.id.slice(1))}:
                      </span>
                      {conn.connected && (
                        <span style={{ color: "#4ec9b0", fontSize: "11px", fontStyle: "italic" }}>{conn.label}</span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {renderInputComponent()}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: "#858585", fontSize: "12px", fontStyle: "italic" }}>設定可能な内部プロパティはありません。</div>
          )}
        </div>

        {/* INPUT PINS SECTION */}
        <div>
          <h4 style={{ fontSize: "11px", color: "#b5cea8", margin: "0 0 12px 0", letterSpacing: "0.5px" }}>INPUT PINS</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {definition?.inputs?.filter((i: any) => i.type !== "FLOW").map((input: any) => {
              const conn = checkConnection(input.id);
              return (
                <div key={input.id} style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#2d2d2d", padding: "6px 10px", borderRadius: "4px", fontSize: "12px" }}>
                  <span style={{ color: "#ce9178" }}>{input.id}</span>
                  <span style={{ color: conn.connected ? "#4ec9b0" : "#858585" }}>{conn.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ADVANCED SECTION */}
        <div style={{ borderTop: "1px solid #3c3c3c", paddingTop: "12px" }}>
          <h4 style={{ fontSize: "11px", color: "#858585", margin: "0 0 4px 0" }}>ADVANCED</h4>
          <div style={{ fontSize: "11px", color: "#6a9955" }}>Target Loader: <span style={{ color: "#e0e0e0", fontWeight: "bold" }}>{activeLoader.toUpperCase()}</span></div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#1e1e1e", overflow: "hidden" }} onContextMenu={handleContextMenu}>
      
      {/* ⚙️ PROJECT SETTINGS HEADER PANEL */}
      <div style={{ width: "100%", height: "48px", backgroundColor: "#252526", borderBottom: "1px solid #3c3c3c", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px", fontWeight: "bold", color: "#007acc", letterSpacing: "0.5px" }}>NovaWeave IDE</span>
          <span style={{ color: "#5a5a5a", fontSize: "12px" }}>|</span>
          <span style={{ fontSize: "12px", color: "#ce9178", fontWeight: "500" }}>PROJECT SETTINGS</span>
        </div>
        
        {/* 🚀 中央の独立したトグルスイッチエリア */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", backgroundColor: "#1e1e1e", padding: "6px 16px", borderRadius: "20px", border: "1px solid #2d2d2d" }}>
          <span style={{ fontSize: "12px", color: "#858585", fontWeight: "bold" }}>Target Mod Loader:</span>
          
          <div style={{ display: "flex", gap: "14px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", color: currentLoaderValue === "FABRIC" ? "#4ec9b0" : "#858585", fontSize: "12px", cursor: "pointer", fontWeight: currentLoaderValue === "FABRIC" ? "bold" : "normal" }}>
              <input
                type="radio"
                name="globalModLoader"
                value="FABRIC"
                checked={currentLoaderValue === "FABRIC"}
                onChange={() => {
                  editorStore.setModLoader("FABRIC");
                  setCurrentLoaderValue("FABRIC");
                }}
                style={{ cursor: "pointer", accentColor: "#4ec9b0" }}
              />
              Fabric
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "6px", color: currentLoaderValue === "FORGE" ? "#4ec9b0" : "#858585", fontSize: "12px", cursor: "pointer", fontWeight: currentLoaderValue === "FORGE" ? "bold" : "normal" }}>
              <input
                type="radio"
                name="globalModLoader"
                value="FORGE"
                checked={currentLoaderValue === "FORGE"}
                onChange={() => {
                  editorStore.setModLoader("FORGE");
                  setCurrentLoaderValue("FORGE");
                }}
                style={{ cursor: "pointer", accentColor: "#4ec9b0" }}
              />
              Forge
            </label>
          </div>
        </div>

        <div style={{ fontSize: "11px", color: "#b5cea8" }}>MC Version: <span style={{ textDecoration: "underline" }}>1.20.1</span></div>
      </div>

      {/* 下段：キャンバス ＆ インスペクターの横並び領域 */}
      <div style={{ flex: 1, display: "flex", width: "100%", height: "calc(100% - 48px)" }}>
        {/* 🌌 左側：無限ノードキャンバス領域 */}
        <div style={{ flex: 1, height: "100%", position: "relative" }}>
          <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
          {menuMenu && <ContextMenu x={menuMenu.x} y={menuMenu.y} onClose={() => setMenuMenu(null)} onNodeAdded={handleNodeAdded} />}
        </div>

        {/* 📝 右側：本格インスペクターパネル */}
        <div style={{ width: "460px", height: "100%", backgroundColor: "#252526", borderLeft: "1px solid #3c3c3c", padding: "20px", color: "#ffffff", boxSizing: "border-box", fontFamily: "sans-serif", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ flex: "1 1 0", overflowY: "auto", minHeight: 0 }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "11px", color: "#007acc", letterSpacing: "1px" }}>INSPECTOR</h3>
            {selectedNode ? (
              // 💡 エラー2304解決：存在しない edgeUpdateTrigger を廃止し、グローバルリフレッシュキーをハイドレート！
              <div key={globalRefreshTrigger}>{renderDynamicInspector()}</div>
            ) : (
              <div style={{ color: "#858585", fontSize: "13px", marginTop: "40px", textAlign: "center" }}>
                キャンバス上のノードをクリックすると、ここにプロパティが表示されます。
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid #3c3c3c", paddingTop: "16px", flex: "0 0 320px", display: "flex", flexDirection: "column", minHeight: 0, gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "11px", color: "#007acc", letterSpacing: "1px" }}>CODE PREVIEW</h3>
              <span style={{ fontSize: "11px", color: "#858585" }}>{editorStore.currentLoader}</span>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={handleCopyGeneratedCode} disabled={!generatedCode} style={{ backgroundColor: "#3c3c3c", color: "#ffffff", border: "1px solid #555", borderRadius: "4px", padding: "6px 10px", cursor: generatedCode ? "pointer" : "not-allowed" }}>
                Copy
              </button>
              <button onClick={handleExportJava} disabled={!generatedCode} style={{ backgroundColor: "#007acc", color: "#ffffff", border: "none", borderRadius: "4px", padding: "6px 10px", cursor: generatedCode ? "pointer" : "not-allowed" }}>
                Export Java
              </button>
              <button onClick={handleExportForgeProject} disabled={!generatedCode} style={{ backgroundColor: "#6a9955", color: "#ffffff", border: "none", borderRadius: "4px", padding: "6px 10px", cursor: generatedCode ? "pointer" : "not-allowed" }}>
                Export Project
              </button>
            </div>
            <textarea
              readOnly
              value={generatedCode}
              placeholder="Generated Java code will appear here."
              style={{
                flex: 1,
                width: "100%",
                resize: "none",
                backgroundColor: "#1e1e1e",
                color: "#d4d4d4",
                border: "1px solid #3c3c3c",
                borderRadius: "6px",
                padding: "12px",
                boxSizing: "border-box",
                fontFamily: "Consolas, Monaco, 'Courier New', monospace",
                fontSize: "12px",
                lineHeight: 1.5,
                whiteSpace: "pre",
                overflow: "auto"
              }}
            />
            <div style={{ minHeight: "18px", fontSize: "11px", color: exportStatus ? "#b5cea8" : "#858585" }}>
              {exportStatus || "Generated code updates automatically from the current graph and loader."}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
