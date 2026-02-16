

# Step 2 (Layer A): Patch `src/components/ui/dropdown-menu.tsx`

Single file modification. No files created or renamed.

## Step 0: Verify file

File confirmed at exact path: `src/components/ui/dropdown-menu.tsx` (already provided in current-code context).

## Change 1: Add import (line 6)

After `import { cn } from "@/lib/utils";`, add:

```ts
import { getOverlayContainer } from "@/lib/overlayContainer";
```

## Change 2: SubContent (lines 44-51)

Add `translate="no"` prop and prepend `"notranslate"` in `cn()`:

```tsx
<DropdownMenuPrimitive.SubContent
  ref={ref}
  translate="no"
  className={cn(
    "notranslate",
    "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
    className,
  )}
  {...props}
/>
```

## Change 3: Portal + Content (lines 59-70)

Portal gets `container={getOverlayContainer()}`, Content gets `translate="no"` + `"notranslate"`:

```tsx
<DropdownMenuPrimitive.Portal container={getOverlayContainer()}>
  <DropdownMenuPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    translate="no"
    className={cn(
      "notranslate",
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className,
    )}
    {...props}
  />
</DropdownMenuPrimitive.Portal>
```

## Constraints

- Only file modified: `src/components/ui/dropdown-menu.tsx`
- No files created or renamed
- All identifiers in English
- `git diff --name-only` will show only `src/components/ui/dropdown-menu.tsx`

