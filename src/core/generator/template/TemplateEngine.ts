export interface TemplateContext {
  properties?: Record<string, any>;
  inputs?: Record<string, any>;
  definitionProperties?: any[];
  definitionInputs?: any[];
  fallbackPosition?: string;
}

export class TemplateEngine {
  /**
   * テンプレート文字列に対して、プロパティ、インプット、型フォーマット、フォールバックを適用してJavaコードを生成する
   */
  public static applyTemplate(template: string, context: TemplateContext): string {
    if (!template) return "";
    let resultCode = template;

    // 1. プロパティ（インスペクター入力値）のクローンとデフォルト値マージ
    const mergedProperties = { ...context.properties };
    if (context.definitionProperties) {
      context.definitionProperties.forEach((prop: any) => {
        if (mergedProperties[prop.id] === undefined && prop.default !== undefined) {
          mergedProperties[prop.id] = prop.default;
        }
      });
    }

    // 2. ⚡【最優先】インプット結線データ（MATHノードの計算式など）によるプロパティの上書き解決
    // 結線がある場合は、インスペクターの固定値ではなく、結線先から流れてきたコード（例: "(4.0F + 2.0F)"）を最優先する！
    if (context.definitionInputs) {
      context.definitionInputs.forEach((input: any) => {
        if (input.type === "FLOW") return;

        // inputs側、または親のstatementから直接流れてきている翻訳済コードを検知
        let connectedVar = context.inputs?.[input.id] ?? context.properties?.[input.id];

        // 特例：positionピンが未結線の場合のデフォルト挙動
        if ((connectedVar === undefined || connectedVar === null) && input.id === "position") {
          connectedVar = context.fallbackPosition || "player.getX(), (player.getY() + 10.0F), player.getZ()";
        }

        if (connectedVar !== undefined && connectedVar !== null) {
          // 文字列、またはオブジェクトなら文字列化してマージ用プロパティを上書き
          mergedProperties[input.id] = String(connectedVar);
          
          // テンプレート内の ${input.id} タグ（例: ${power}, ${position}）を直接書き換え
          const regex = new RegExp('\\$\\$?{' + input.id + '}', 'g');
          resultCode = resultCode.replace(regex, String(connectedVar));
        }
      });
    }

    // 3. 残りのプロパティの型安全フォーマット ＆ 置換
    Object.entries(mergedProperties).forEach(([key, val]) => {
      if (val === undefined || val === null) return;

      const propDefinition = context.definitionProperties?.find((p: any) => p.id === key);
      let formattedStr = String(val);

      // すでにJavaコード（数式やメソッド呼び出し）として解決されている場合は、末尾にFを付けるなどの成形をスキップする
      const isAlreadyCode = formattedStr.includes('(') || formattedStr.includes(')') || formattedStr.includes(' ');

      // 型成形（Formatter）
      if (propDefinition && !isAlreadyCode) {
        if (propDefinition.type === "number") {
          formattedStr = formattedStr.includes('F') 
            ? formattedStr 
            : (formattedStr.includes('.') ? `${formattedStr}F` : `${formattedStr}.0F`);
        } else if (propDefinition.type === "boolean") {
          formattedStr = val ? "true" : "false";
        } else if (propDefinition.type === "select" || propDefinition.type === "enum") {
          formattedStr = String(val).toUpperCase();
        }
      }

      // 🎯 ${key} と $${key} を確実に捕獲してインライン展開
      const regex = new RegExp('\\$\\$?{' + key + '}', 'g');
      resultCode = resultCode.replace(regex, formattedStr);
    });

    // 4. 【互換性維持】旧コード用の ${position} タグがもし残っていれば個別に救済
    const posFallback = context.fallbackPosition || "player.getX(), (player.getY() + 10.0F), player.getZ()";
    resultCode = resultCode.replace(/\${position}/g, posFallback);

    // 5. 【UNDEFINED保護】すべての置換が終わった後、なお残ってしまった未定義タグのみをお掃除
    resultCode = resultCode.replace(/\$\{[a-zA-Z0-9_]+\}/g, "/* ⚠ UNDEFINED_PROPERTY */ null");

    return resultCode;
  }
}