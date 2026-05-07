## ADDED Requirements

### Requirement: Markdown reading view has differentiated content hierarchy
The system SHALL render markdown blocks with clear visual differentiation between headings, paragraphs, lists, quotes, links, inline code, and fenced code so that semantic structure is readable without entering edit mode.

#### Scenario: Structured markdown is visually distinguishable
- **WHEN** a markdown block contains multiple markdown element types such as headings, lists, quotes, and code
- **THEN** the rendered block displays each element type with visibly distinct typography or container styling
- **THEN** the content is not presented as a flat paragraph stream

### Requirement: Markdown block editing remains block-oriented without WYSIWYG rewrite
The system SHALL improve markdown block editing interactions while preserving a block-based edit/read model rather than introducing a single-surface WYSIWYG editor.

#### Scenario: User edits and returns to reading view without losing block context
- **WHEN** a user enters markdown block editing and then exits back to reading view
- **THEN** the updated content is preserved
- **THEN** the block remains within the same block-level selection and action model used by the note editor

#### Scenario: First phase excludes Typora-style single-surface editing
- **WHEN** the first phase markdown experience is implemented
- **THEN** the system does not require a document-wide single-surface editor that merges edit and read states into one Typora-like surface
- **THEN** future WYSIWYG or media-editor work remains deferred to a later phase
