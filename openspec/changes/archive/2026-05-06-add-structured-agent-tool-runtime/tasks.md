## 1. Runtime Boundary

- [x] 1.1 Add assistant tool-call trace types and optional planner response metadata.
- [x] 1.2 Add a structured assistant tool runtime with registry, candidate collection, single-tool invocation, and tool-node orchestration functions.

## 2. Planner Integration

- [x] 2.1 Refactor `AssistantWorkflowPlanner` to delegate candidate selection and descriptor invocation to the tool runtime node.
- [x] 2.2 Preserve pending-plan confirmation and formal command execution behavior.

## 3. Validation

- [x] 3.1 Add tests for registry lookup, explicit tool invocation, runtime node trace metadata, and planner integration.
- [x] 3.2 Run focused assistant tests and project build.
