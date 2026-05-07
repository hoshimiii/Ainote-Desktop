## 1. Board note navigation

- [x] 1.1 Add shared note-navigation helpers that resolve the owning mission for a linked note and expose a single open-linked-note flow for task / subtask affordances.
- [x] 1.2 Update `BoardView` task cards and subtask rows so explicit note links jump to the linked note, and `Ctrl/Cmd + Click` on a linked title triggers the same navigation without breaking normal expand/collapse behavior.
- [x] 1.3 Extend linked subtask navigation so valid `blockId` values deep-link into the opened note and invalid targets fall back to note-level navigation.

## 2. Note detail drag rail and layout

- [x] 2.1 Refactor `NoteView` block rows so the left drag/link rail lives in a reserved gutter, shifting the block body and insert handles right together instead of using negative offsets.
- [x] 2.2 Improve block drag activation and feedback across `WorkPage`, `SortableItem`, and note block rendering so dragging no longer feels like text selection and provides a visible block preview.

## 3. Regression coverage and verification

- [x] 3.1 Add focused regression tests for the new note-navigation helper logic and any extracted drag-overlay or label helpers introduced by this change.
- [x] 3.2 Run targeted validation for task/subtask note jumps, block dragging feedback, and note-detail left-rail spacing.
- [x] 3.3 Add regression coverage for block-target resolution and run runtime smoke validation for the updated subtask deep-link path.
