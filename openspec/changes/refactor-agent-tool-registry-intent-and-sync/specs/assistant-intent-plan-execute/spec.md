## ADDED Requirements

### Requirement: Pattern matches only produce routing candidates
The system SHALL treat regex or pattern matches as candidate-generation signals for tools and workflows rather than as direct bindings to a single fixed behavior.

#### Scenario: Workspace mention no longer forces a fixed workflow
- **WHEN** a user message mentions a workspace and also contains another actionable request
- **THEN** the planner uses the workspace-related match as a routing signal
- **AND** it keeps the other requested actions in the candidate set for later intent resolution
- **AND** it does not immediately commit to a single hard-coded workflow only because the workspace pattern matched

### Requirement: Planner performs intent-aware plan selection before execution
The system SHALL resolve complex structured requests by selecting among candidate tools and workflows, producing a plan, and only then executing the chosen structured action path.

#### Scenario: Multi-intent input preserves all requested goals during planning
- **WHEN** the assistant receives a structured request containing both context references and task goals
- **THEN** the planner first builds candidate tools and workflows from registries
- **AND** it uses intent analysis to determine the most appropriate plan
- **AND** the resulting plan reflects the user’s requested task goal instead of silently dropping it

#### Scenario: Chosen workflow reports its planned steps before execution
- **WHEN** the planner selects a workflow that performs structured writes
- **THEN** it returns a structured plan or pending plan describing the steps to be executed
- **AND** execution follows the existing confirmation policy for structured writes

### Requirement: Intent routing degrades safely when LLM classification is unavailable
The system SHALL fall back to deterministic candidate resolution or clarification when LLM-based intent analysis is unavailable, fails, or returns invalid structured data.

#### Scenario: Classifier failure does not discard the request
- **WHEN** the planner cannot obtain a valid intent classification result
- **THEN** it falls back to deterministic candidate handling or asks a clarification question
- **AND** it does not ignore the user’s non-workspace task requirements merely because one routing signal matched
