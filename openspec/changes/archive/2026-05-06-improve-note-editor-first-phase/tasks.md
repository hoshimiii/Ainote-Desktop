## 1. Block and page chrome

- [x] 1.1 Refactor NoteView, MarkdownBlock, and CodeBlockEditor so drag/link controls use a dedicated left rail while delete actions move to a non-overlapping block-local action area.
- [x] 1.2 Rework note detail page chrome so WindowTitlebar, the note page header, and the content body share a consistent alignment and spacing system without merging window-level and page-level responsibilities.

## 2. Markdown first-phase experience

- [x] 2.1 Implement a first-phase markdown reading presentation with clearly differentiated styling for headings, paragraphs, lists, quotes, links, inline code, and fenced code.
- [x] 2.2 Improve markdown block edit/read interactions so block selection, focus transitions, and content persistence remain stable while preserving the existing block-based dual-state model.

## 3. Verification and regression safety

- [x] 3.1 Add focused regression coverage for any extracted note-layout or markdown-render helpers introduced by the first-phase implementation.
- [x] 3.2 Run targeted validation for drag reachability, page chrome alignment, and markdown hierarchy after the renderer changes are in place.