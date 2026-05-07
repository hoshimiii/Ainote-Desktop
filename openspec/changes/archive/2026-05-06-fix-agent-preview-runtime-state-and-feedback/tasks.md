## 1. Mixed Tool-Call Preview State

- [x] 1.1 Make sequential structured tool calls observe preview mutations produced by earlier write tools in the same request.
- [x] 1.2 Add regression tests covering create-then-read mixed tool chains.

## 2. Commit Messaging

- [x] 2.1 Generate accepted preview success responses from committed execution details instead of preview summaries.
- [x] 2.2 Add regression tests proving accepted responses no longer say “预览”.

## 3. Renderer Preview Cleanup

- [x] 3.1 Clear stale chat `previewAction` state after confirm/cancel inputs are sent.
- [x] 3.2 Add regression tests for preview-action cleanup.

## 4. Validation

- [x] 4.1 Run focused assistant runtime/chatbot tests.
- [x] 4.2 Run the full test suite and build.
