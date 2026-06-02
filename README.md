# NovaWeave

NovaWeave is a visual node-based Minecraft Mod generator.

Build logic with nodes, convert it into Java code, and export Forge projects directly.

## Features

- Visual node editor
- JSON-driven node system
- Automatic Java code generation
- Forge 1.20.1 project export
- Variables
- Math operations
- Conditions (IF)
- Loops (FOR / WHILE)
- Compare operators
- Explosion node
- Player position node

## Example

text Player Right Click     ↓ IF     ↓ Explosion 

Generates:

java if (condition) {     world.explode(...); } 

## Current Status

Experimental

The project is under active development.

## Roadmap

- [x] JSON node system
- [x] IF
- [x] FOR
- [x] WHILE
- [x] Variables
- [x] Forge export
- [ ] Fabric export
- [ ] Particle nodes
- [ ] Chat message nodes
- [ ] Entity nodes
- [ ] Full Minecraft event library

## License

MIT License