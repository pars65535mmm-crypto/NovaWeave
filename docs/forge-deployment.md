# NovaWeave Forge 実機投入手順

## 前提
- Minecraft 1.20.1 の Forge 開発環境を用意する
- Java 17 を使う
- NovaWeave 側で `Forge` ローダーを選ぶ

## 手順
1. NovaWeave でノードを組み、`Code Preview` で生成 Java を確認する
2. `Export Java` で `GeneratedMod.java` を保存する
3. `Export Project` で Forge 1.20.1 用の雛形プロジェクトを出力する
4. 出力先の `src/main/java/com/novaweave/generated/GeneratedMod.java` を確認する
5. Forge プロジェクト直下で `./gradlew runClient` を実行する
6. Minecraft が起動したら、右クリック系イベントなどの動作を確認する

## 生成物
- `GeneratedMod.java`
- `build.gradle`
- `settings.gradle`
- `gradle.properties`
- `src/main/resources/META-INF/mods.toml`
- `src/main/resources/pack.mcmeta`

## 期待結果
- `javac` で `GeneratedMod.java` が単体コンパイルできる
- Forge プロジェクトに配置して `runClient` が通る
- Minecraft 起動後にノード定義どおりの挙動が見える
