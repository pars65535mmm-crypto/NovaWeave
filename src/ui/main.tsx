import ReactDOM from "react-dom/client";
import "../editor/loadBrowserNodeDefinitions";
import { App } from "./App";

async function boot() {
  const container = document.querySelector("#app");
  if (!container) throw new Error("#app がありません");

  // 社長直伝ライフサイクルガード
  await new Promise(requestAnimationFrame);

  const rect = container.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    throw new Error("#app サイズが0");
  }

  ReactDOM.createRoot(container).render(
    <App />
  );
}

boot();
