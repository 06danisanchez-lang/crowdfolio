
Implementing exactly the approved plan across 4 files. Key adjustments from the user's final message:
1. `catch` block in `loadDraft()` calls `clearDraft(uid)` before returning null
2. `latestPayloadRef` pattern for flush-safe saves (ref stores latest payload, debounce writes from ref, `flushSave()` cancels timer + writes immediately from ref)
3. ISO dates (`toISOString()` / `new Date(isoString)`) — identical to existing `initialData` hydration
4. `draftExists` and `draftRestored` as separate states
5. `draftLoadedRef` prevents AI-extracted data from being overwritten
6. `form.watch(callback)` subscription — not return value as dep
7. 4 i18n keys added to both language blocks

No other files touched. Implementation below.
