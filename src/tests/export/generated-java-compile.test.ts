import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { parseGraph } from "../../core/parser/parseGraph.js";
import { resolveIR } from "../../core/resolver/resolveIR.js";
import { generateJava } from "../../core/generator/common/generateJava.js";

function writeFile(filePath: string, contents: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
}

describe("GeneratedMod.java export", () => {
  it("compiles with javac against Forge stubs", () => {
    const graph = {
      nodes: {
        event_1: { id: "event_1", type: "PLAYER_RIGHT_CLICK", properties: {} },
        explosion_1: { id: "explosion_1", type: "EXPLOSION", properties: { power: 4, explosionType: "TNT" } }
      },
      edges: [
        { id: "e1", fromNode: "event_1", fromPin: "flow", toNode: "explosion_1", toPin: "flow" }
      ]
    };

    const javaCode = generateJava(resolveIR(parseGraph(graph as any), "FORGE"), "FORGE");
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "novaweave-javac-"));
    const sourceRoot = path.join(tempRoot, "src");
    const classesRoot = path.join(tempRoot, "classes");

    writeFile(path.join(sourceRoot, "com/novaweave/generated/GeneratedMod.java"), javaCode);
    writeFile(
      path.join(sourceRoot, "net/minecraftforge/fml/common/Mod.java"),
      `package net.minecraftforge.fml.common;
public @interface Mod {
  String value();
  @interface EventBusSubscriber {
    String modid();
    Bus bus();
    enum Bus { FORGE, MOD }
  }
}`
    );
    writeFile(
      path.join(sourceRoot, "net/minecraftforge/eventbus/api/SubscribeEvent.java"),
      `package net.minecraftforge.eventbus.api;
public @interface SubscribeEvent {}`
    );
    writeFile(
      path.join(sourceRoot, "net/minecraftforge/event/entity/player/PlayerInteractEvent.java"),
      `package net.minecraftforge.event.entity.player;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
public class PlayerInteractEvent {
  public static class RightClickBlock {
    public Player getEntity() { return null; }
    public Level getLevel() { return null; }
  }
}`
    );
    writeFile(
      path.join(sourceRoot, "net/minecraft/world/entity/player/Player.java"),
      `package net.minecraft.world.entity.player;
public class Player {
  public double getX() { return 0.0; }
  public double getY() { return 0.0; }
  public double getZ() { return 0.0; }
}`
    );
    writeFile(
      path.join(sourceRoot, "net/minecraft/world/level/Level.java"),
      `package net.minecraft.world.level;
public class Level {
  public enum ExplosionInteraction { TNT }
  public boolean isClientSide() { return false; }
  public void explode(Object entity, double x, double y, double z, float power, ExplosionInteraction interaction) {}
}`
    );

    const sources = [
      path.join(sourceRoot, "com/novaweave/generated/GeneratedMod.java"),
      path.join(sourceRoot, "net/minecraftforge/fml/common/Mod.java"),
      path.join(sourceRoot, "net/minecraftforge/eventbus/api/SubscribeEvent.java"),
      path.join(sourceRoot, "net/minecraftforge/event/entity/player/PlayerInteractEvent.java"),
      path.join(sourceRoot, "net/minecraft/world/entity/player/Player.java"),
      path.join(sourceRoot, "net/minecraft/world/level/Level.java")
    ];

    const result = spawnSync("javac", ["--release", "17", "-d", classesRoot, ...sources], {
      encoding: "utf8"
    });

    if (result.status !== 0) {
      throw new Error(`javac failed:\n${result.stdout}\n${result.stderr}`);
    }

    expect(fs.existsSync(path.join(classesRoot, "com/novaweave/generated/GeneratedMod.class"))).toBe(true);
  });
});
