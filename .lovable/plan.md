
# Fix: Build Error in translations.ts

## Root Cause (Confirmed)

The file `src/lib/i18n/translations.ts` has a structural break at **lines 540-541**. The `es` block closes normally at line 540 (`},`), but then line 541 has `};` which **closes the entire `translations` object prematurely**. The entire `en` block (lines 542–1079) is therefore floating outside the object, causing ~150+ TypeScript syntax errors.

```
// CURRENT BROKEN STRUCTURE:
export const translations = {
  es: {
    ...                    ← line 540: closes es
  },
};                         ← line 541: PREMATURE close of whole object ← BUG
    // en keys floating outside... ← lines 542-1079: SYNTAX ERRORS
```

```
// CORRECT STRUCTURE:
export const translations = {
  es: {
    ...
  },
  en: {                    ← needs to open here
    ...
  },
};                         ← closes at line 1079 (already correct)
```

## The Fix: 2 Line Edit

**In `src/lib/i18n/translations.ts`, lines 540–543:**

Replace:
```
    'subscription.cancelAnytime': 'Cancela cuando quieras. Sin compromisos.',
  },
};
    // Header / Landing nav
    'header.signIn': 'Sign In',
```

With:
```
    'subscription.cancelAnytime': 'Cancela cuando quieras. Sin compromisos.',
  },
  en: {
    // Header / Landing nav
    'header.signIn': 'Sign In',
```

That's it. The `en:` opening brace is missing — adding it fixes all 150+ syntax errors in one change.

**Line 1079 is already correct** — the last two lines are `  },\n};` which correctly close `en` and the whole object.

## Secondary Cleanup: Duplicate Keys in `es` Block

There are duplicate keys in the `es` block (the "missing keys" section added at lines 395–539 has some keys already defined at lines 122–393). Examples:
- `dashboard.subtitle` (defined at line 124 AND line 402)
- `dashboard.kpi.invested` (line 125 AND line 403)
- `platforms.title` (line 281 AND line 510)
- `subscription.yourPro` (line 346 AND line 535)

**TypeScript does NOT error on duplicate object keys** (last one wins silently), so these don't cause build errors. They will be cleaned up as part of this fix by removing the redundant second definitions at lines 395–539. The earlier definitions (lines 122–393) are the canonical ones and will be kept.

## Step-by-Step Changes

### File: `src/lib/i18n/translations.ts`

**Change 1** — Fix the structural break (lines 540–543):
- Remove the premature `};` on line 541
- Add `en: {` to open the English block

**Change 2** — Remove duplicate `es` keys (lines 395–539, the "Missing keys for components" section):
- These are all redundant re-definitions of keys already declared above them in the `es` block
- Removing them leaves the `es` object clean with one canonical definition per key

**Change 3** — The `en` block already has matching keys for all the ones added in the "missing keys" section (lines 932–1079), so the `en` block is complete and correct as-is.

## After This Fix: Continue with SettingsView + ProfileView

Once the build is green, translate the 2 remaining pending components:

### `src/components/settings/SettingsView.tsx`
- Import `useLanguage`
- Replace all hardcoded strings with `t('settings.*')`, `t('errors.*')`, `t('toast.*')` keys (all keys already exist in the dictionary)

### `src/components/profile/ProfileView.tsx`
- Import `useLanguage`  
- Replace all hardcoded strings with `t('profile.*')` keys (all already in dictionary)

## Files Changed

| File | Change |
|------|--------|
| `src/lib/i18n/translations.ts` | Fix structural break (add `en: {`), remove duplicate `es` keys |
| `src/components/settings/SettingsView.tsx` | Add `useLanguage`, replace strings with `t()` |
| `src/components/profile/ProfileView.tsx` | Add `useLanguage`, replace strings with `t()` |

**Zero new files. Zero new dependencies.**
