## ADDED Requirements

### Requirement: Agent SHALL support learning-note chain workflow
The system SHALL parse learning-note intents and generate a formal command chain to create/reuse workspace, mission, board, task (optional subtask), and note, then initialize note blocks and link task-note.

#### Scenario: Build learning-note chain
- **WHEN** user asks to create a learning note for a topic
- **THEN** planner returns a handled plan including `create_note`, `rewrite_note`, and `link_task_note`

### Requirement: Agent SHALL support wrong-answer review workflow with fixed 7-block template
The system SHALL generate wrong-answer notes with exactly seven blocks in this order: title, stem, solution, critique, knowledge summary, code example, practice exercises.

#### Scenario: Generate wrong-answer template blocks
- **WHEN** user asks to organize a wrong-answer question
- **THEN** planner builds a handled plan that rewrites note with exactly 7 blocks in the required order

### Requirement: Wrong-answer workflow SHALL remain executable under confirmation modes
The system SHALL respect `writeConfirmationMode` for wrong-answer workflow and execute through existing formal command boundary.

#### Scenario: Confirmation required mode
- **WHEN** config is `writeConfirmationMode=always` and wrong-answer workflow is planned
- **THEN** planner returns pending plan and asks user to confirm before execution

#### Scenario: Direct execution mode
- **WHEN** config is `writeConfirmationMode=never` and wrong-answer workflow is planned
- **THEN** planner returns `commandsToExecute` directly
