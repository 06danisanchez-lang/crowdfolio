

# Fix: View Stacking Bug - Views Not Unmounting on Navigation

## Root Cause

The `Index.tsx` page renders views as multiple adjacent conditional blocks:

```text
{currentView === 'dashboard' && <div>...</div>}
{currentView === 'investments' && <div>...</div>}
{currentView === 'opportunities' && <div>...</div>}
{currentView === 'tax' && <div>...</div>}
...
```

Two problems:

1. **React reconciliation by position**: When sibling conditional blocks toggle, React reconciles by index position rather than identity. Complex subtrees (charts, tables with internal state) can survive reconciliation incorrectly, leaving DOM remnants of the previous view.
2. **No scroll reset**: The `<main>` element retains scroll position across view changes, making stacked content visible.

## Solution (2 files, minimal changes)

### 1. `src/pages/Index.tsx` - Keyed view container + render function

Replace the multiple `{condition && ...}` blocks with a single `key={currentView}` wrapper using a render function. The `key` forces React to completely destroy and recreate the subtree on every view change — eliminating any possibility of stacking.

```text
// Before (multiple conditional siblings):
{currentView === 'dashboard' && <div>...</div>}
{currentView === 'investments' && <div>...</div>}
...

// After (single keyed container):
<div key={currentView}>
  {renderCurrentView()}
</div>
```

The `renderCurrentView()` function uses a switch statement to return only the active view component. The FounderWelcomeModal and UpgradeModal remain outside the keyed container (they are global modals, not view content).

### 2. `src/components/layout/AppLayout.tsx` - Scroll reset on view change

Add a `useEffect` + `useRef` on the `<main>` element to scroll to top whenever `currentView` changes:

```text
const mainRef = useRef<HTMLElement>(null);

useEffect(() => {
  mainRef.current?.scrollTo(0, 0);
}, [currentView]);

<main ref={mainRef} className="flex-1 overflow-auto">
```

## Why this is bulletproof

- `key={currentView}`: React guarantees full unmount + remount when key changes. No reconciliation tricks, no leftover DOM.
- `scrollTo(0, 0)`: Even if a view is shorter than the previous one, the user always sees the top of the new view.
- No behavioral changes: modals, error boundaries, and all existing functionality remain identical.

## Files modified

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Replace conditional siblings with keyed container + `renderCurrentView()` switch |
| `src/components/layout/AppLayout.tsx` | Add `mainRef` + `useEffect` to scroll to top on view change |

