# NovaWeave 100+ Node Benchmark

## Summary
- Nodes: 107
- Edges: 131
- Generated Java length: 6445 chars
- Heap used after run: 12.31 MB

## Timings
| Stage | Time |
| --- | ---: |
| Graph load / normalize | 0.24 ms |
| Parse graph | 0.77 ms |
| Resolve IR | 0.85 ms |
| Generate Java | 0.16 ms |
| React tree render proxy | 4.30 ms |

## Notes
- React timing is a server-side render proxy for a 100+ node preview tree.
- The graph intentionally mixes RANDOM / MATH / COMPARE / VARIABLE_SET / VARIABLE_GET plus flow control to exercise the full pipeline.
