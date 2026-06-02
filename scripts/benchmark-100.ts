import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import React from "react";
import { renderToString } from "react-dom/server";
import type { Edge, NodeGraph } from "../src/core/types/NodeGraph.js";

type BenchResult = {
  graphLoadMs: number;
  parseMs: number;
  resolveMs: number;
  generateMs: number;
  reactRenderMs: number;
  heapUsedMb: number;
  nodeCount: number;
  edgeCount: number;
  javaLength: number;
};

function addNode(nodes: NodeGraph["nodes"], id: string, type: string, properties: Record<string, any> = {}) {
  nodes[id] = { id, type, properties, x: 0, y: 0 };
}

function addEdge(edges: Edge[], fromNode: string, fromPin: string, toNode: string, toPin: string) {
  edges.push({ id: `${fromNode}_${fromPin}__${toNode}_${toPin}`, fromNode, fromPin, toNode, toPin });
}

function buildStressGraph(): NodeGraph {
  const nodes: NodeGraph["nodes"] = {};
  const edges: Edge[] = [];

  addNode(nodes, "event_1", "PLAYER_RIGHT_CLICK", {});

  for (let index = 1; index <= 15; index += 1) {
    addNode(nodes, `set_${index}`, "VARIABLE_SET", {
      variableName: "damage",
      valueType: "NUMBER"
    });
    addNode(nodes, `get_${index}`, "VARIABLE_GET", {
      variableName: "damage"
    });
    addNode(nodes, `random_${index}`, "RANDOM", { min: 1, max: 100 });
    addNode(nodes, `math_${index}`, "MATH", { operation: "ADD" });
    addNode(nodes, `compare_${index}`, "COMPARE", { operation: "GREATER" });
  }

  for (let index = 16; index <= 25; index += 1) {
    const pairIndex = index - 15;
    addNode(nodes, `random_${index}`, "RANDOM", { min: pairIndex, max: pairIndex + 100 });
    addNode(nodes, `math_${index}`, "MATH", { operation: index % 2 === 0 ? "ADD" : "MULTIPLY" });
  }

  for (let index = 16; index <= 20; index += 1) {
    addNode(nodes, `compare_${index}`, "COMPARE", {
      operation: index % 2 === 0 ? "LESS_EQUAL" : "GREATER_EQUAL"
    });
  }

  for (let index = 1; index <= 5; index += 1) {
    addNode(nodes, `if_${index}`, "IF", {});
  }

  addNode(nodes, "explosion_1", "EXPLOSION", {
    power: 4,
    explosionType: "TNT"
  });

  addEdge(edges, "event_1", "flow", "set_1", "flow");
  for (let index = 1; index <= 14; index += 1) {
    addEdge(edges, `set_${index}`, "flow", `set_${index + 1}`, "flow");
  }
  addEdge(edges, "set_15", "flow", "if_1", "flow");
  for (let index = 1; index <= 4; index += 1) {
    addEdge(edges, `if_${index}`, "trueFlow", `if_${index + 1}`, "flow");
  }
  addEdge(edges, "if_5", "trueFlow", "explosion_1", "flow");

  for (let index = 1; index <= 15; index += 1) {
    addEdge(edges, `random_${index}`, "value", `math_${index}`, "a");
    addEdge(edges, `get_${index}`, "value", `math_${index}`, "b");
    addEdge(edges, `math_${index}`, "result", `compare_${index}`, "a");
    const compareTarget = index < 15 ? `math_${index + 1}` : "math_16";
    addEdge(edges, compareTarget, "result", `compare_${index}`, "b");
    addEdge(edges, `compare_${index}`, "value", `set_${index}`, "value");
  }

  for (let index = 16; index <= 20; index += 1) {
    const pairIndex = index - 15;
    const leftMath = `math_${15 + pairIndex * 2 - 1}`;
    const rightMath = `math_${15 + pairIndex * 2}`;
    addEdge(edges, `random_${index}`, "value", leftMath, "a");
    addEdge(edges, `random_${index + 1}`, "value", leftMath, "b");
    addEdge(edges, leftMath, "result", rightMath, "a");
    addEdge(edges, `random_${index + 1}`, "value", rightMath, "b");
    addEdge(edges, leftMath, "result", `compare_${index}`, "a");
    addEdge(edges, rightMath, "result", `compare_${index}`, "b");
    addEdge(edges, `compare_${index}`, "value", `if_${pairIndex}`, "condition");
  }

  return normalizeNodeGraph({ nodes, edges });
}

function normalizeNodeGraph(graph?: Partial<NodeGraph> | null): NodeGraph {
  return {
    nodes: graph?.nodes && typeof graph.nodes === "object" ? graph.nodes : {},
    edges: Array.isArray(graph?.edges) ? graph.edges : []
  };
}

function renderReactPreview(nodeCount: number): number {
  const preview = React.createElement(
    "div",
    { style: { display: "grid", gridTemplateColumns: "repeat(10, minmax(0, 1fr))", gap: "4px" } },
    Array.from({ length: nodeCount }, (_, index) =>
      React.createElement(
        "div",
        {
          key: index,
          style: {
            padding: "4px 6px",
            border: "1px solid #444",
            borderRadius: "4px",
            fontSize: "10px"
          }
        },
        `Node ${index + 1}`
      )
    )
  );

  const start = performance.now();
  renderToString(preview);
  return performance.now() - start;
}

function runBenchmark(
  parseGraphFn: typeof import("../src/core/parser/parseGraph.js").parseGraph,
  resolveIRFn: typeof import("../src/core/resolver/resolveIR.js").resolveIR,
  generateJavaFn: typeof import("../src/core/generator/common/generateJava.js").generateJava
): BenchResult {
  const graphLoadStart = performance.now();
  const stressGraph = buildStressGraph();
  const graphLoadMs = performance.now() - graphLoadStart;

  const parseStart = performance.now();
  const novaIR = parseGraphFn(stressGraph);
  const parseMs = performance.now() - parseStart;

  const resolveStart = performance.now();
  const resolved = resolveIRFn(novaIR, "FORGE");
  const resolveMs = performance.now() - resolveStart;

  const generateStart = performance.now();
  const javaCode = generateJavaFn(resolved, "FORGE");
  const generateMs = performance.now() - generateStart;

  const reactRenderMs = renderReactPreview(Object.keys(stressGraph.nodes).length);
  const heapUsedMb = process.memoryUsage().heapUsed / 1024 / 1024;

  return {
    graphLoadMs,
    parseMs,
    resolveMs,
    generateMs,
    reactRenderMs,
    heapUsedMb,
    nodeCount: Object.keys(stressGraph.nodes).length,
    edgeCount: stressGraph.edges.length,
    javaLength: javaCode.length
  };
}

function toMarkdown(result: BenchResult): string {
  return `# NovaWeave 100+ Node Benchmark

## Summary
- Nodes: ${result.nodeCount}
- Edges: ${result.edgeCount}
- Generated Java length: ${result.javaLength} chars
- Heap used after run: ${result.heapUsedMb.toFixed(2)} MB

## Timings
| Stage | Time |
| --- | ---: |
| Graph load / normalize | ${result.graphLoadMs.toFixed(2)} ms |
| Parse graph | ${result.parseMs.toFixed(2)} ms |
| Resolve IR | ${result.resolveMs.toFixed(2)} ms |
| Generate Java | ${result.generateMs.toFixed(2)} ms |
| React tree render proxy | ${result.reactRenderMs.toFixed(2)} ms |

## Notes
- React timing is a server-side render proxy for a 100+ node preview tree.
- The graph intentionally mixes RANDOM / MATH / COMPARE / VARIABLE_SET / VARIABLE_GET plus flow control to exercise the full pipeline.
`;
}

function loadNodeDefinitions(): Record<string, any> {
  const nodesRoot = path.resolve("src/nodes");
  const definitions: Record<string, any> = {};

  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }

      if (!entry.name.endsWith(".json")) continue;
      const definition = JSON.parse(fs.readFileSync(entryPath, "utf8"));
      if (definition?.runtimeType) {
        definitions[String(definition.runtimeType).toUpperCase()] = definition;
      }
    }
  };

  walk(nodesRoot);
  return definitions;
}

async function main() {
  (globalThis as any).__NOVAWEAVE_NODE_DEFINITIONS__ = loadNodeDefinitions();

  const { parseGraph } = await import("../src/core/parser/parseGraph.js");
  const { resolveIR } = await import("../src/core/resolver/resolveIR.js");
  const { generateJava } = await import("../src/core/generator/common/generateJava.js");

  const result = runBenchmark(parseGraph, resolveIR, generateJava);
  const report = toMarkdown(result);
  const docsDir = path.resolve("docs");
  fs.mkdirSync(docsDir, { recursive: true });
  const reportPath = path.join(docsDir, "benchmark-100-node.md");
  fs.writeFileSync(reportPath, report, "utf8");
  console.log(report);
  console.log(`\nSaved benchmark report to ${reportPath}`);
}

void main();
