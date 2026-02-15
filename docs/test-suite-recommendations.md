# Test Suite Recommendations Handoff

## Purpose
This document gives a new developer enough context to implement the current testing recommendations:
- remove/collapse low-signal tests
- add a minimal set of high-impact tests that improve deployment confidence for core behavior

Scope is this repository (`agent-canvas`) as evaluated on **February 7, 2026**.

## Current Baseline
- Unit test command: `pnpm test:run`
- Unit test result: `8` files, `177` tests, all passing (as of February 15, 2026)
- E2E smoke command: `pnpm test:e2e`
- E2E smoke result: `1` test, passing (as of February 15, 2026)
- Existing tests are mostly utility-level unit tests.
- Critical runtime paths (Convex mutations/queries and auth-recovery UI flows) are under-tested.

## Recommendation Summary
1. Remove or collapse tests that are duplicate, tautological, or too implementation-coupled.
2. Add a focused set of behavioral tests around data integrity, access control, and recovery flows.
3. Keep total test count lean; prioritize branch/risk coverage over assertion count.

## Status Update (February 15, 2026)
- Added a Playwright E2E happy-path smoke test (`tests/e2e/happy-path.spec.ts`) running against the internal `/e2e` route (in-memory Convex/auth mocks).
- CI now runs unit + E2E via `.github/workflows/tests.yml` (`pnpm test:run` + `pnpm test:e2e`).
- Pruned some low-signal unit-test duplication (notably status-config duplication and some formatting redundancies).

---

## Part A: Remove / Collapse Low-Signal Tests

### 1) Status config tautology
- File: `tests/unit/status-config.test.ts`
- Status: duplicate overlap with `tests/unit/config-utils.test.ts` removed on February 15, 2026.
- Low-value target: `all known statuses have required fields` loop (constant-shape tautology)
- Action: consider replacing the constant-shape loop with a small set of behavior-focused assertions.

### 2) Formatting redundancies
- File: `tests/unit/formatting.test.ts`
- Status: trimmed duplicate boundary cases and removed type-invalid inputs (e.g. `undefined as string`) on February 15, 2026.
- Action: keep tests focused on user-visible output; avoid excessive boundary duplication.

### 3) Redundant role-specific access assertions
- File: `tests/unit/convex-auth.test.ts`
- `hasOrgAccess` role-specific tests duplicate same branch behavior (`member` vs `admin`)
- Action:
  - keep one membership-positive and one non-membership-negative case

---

## Part B: Minimal High-Impact Tests To Add

These are the highest-value gaps for production confidence.

## 1) Security no-leak contract for canvas fetch
- Target code: `convex/canvases.ts` (`get` query)
- Why high-impact:
  - prevents resource existence leaks across org boundaries
- Add tests for behavior:
  - returns `null` when canvas does not exist
  - returns `null` when canvas exists but requester lacks org access
  - returns canvas when requester has access
- Notes:
  - these should be behavioral contract tests, not internal call-order tests

## 2) Destructive guard + cascade for canvas deletion
- Target code: `convex/canvases.ts` (`remove` mutation)
- Why high-impact:
  - deletion is irreversible from user perspective
  - must preserve audit semantics and soft-delete contract
- Add tests for behavior:
  - rejects delete when canvas has agents and `confirmDelete` is missing/false
  - soft-deletes all non-deleted agents and the canvas when confirmed
  - writes delete history records for affected agents

## 3) Bulk replace import correctness
- Target code: `convex/agents.ts` (`bulkReplace` mutation)
- Why high-impact:
  - core import operation can invalidate large datasets if wrong
- Add tests for behavior:
  - old active agents are soft-deleted
  - new agents are inserted
  - canvas `phases`/`categories` are replaced based on incoming payload (with defaults when empty)
  - history is recorded for deleted + created items

## 4) Membership stale-event protection
- Target code: `convex/lib/membershipSync.ts` (`upsertMembership`, `removeMembership`, `syncUserMembershipsFromData`)
- Why high-impact:
  - webhook ordering and retries are common failure modes
- Add tests for behavior:
  - older timestamp does not overwrite newer membership role
  - older timestamp does not delete newer membership record
  - sync removes memberships absent from source data only when timestamp is newer

## 5) Membership sync + auth recovery in client startup
- Target code: `app/contexts/AuthContext.tsx` (membership sync action + retry behavior)
- Why high-impact:
  - startup auth-sync failures directly affect first-load usability
- Add tests for behavior:
  - auth-like error triggers one refresh+retry path
  - non-auth error does not retry
  - component stops loading and renders children even when sync ultimately fails
  - session cache short-circuits repeat sync in same session/user

---

## Suggested Test Architecture

## Convex behavior tests
- Preferred location:
  - `tests/unit/convex-canvases.behavior.test.ts`
  - `tests/unit/convex-agents.behavior.test.ts`
  - `tests/unit/membership-sync.behavior.test.ts`
- Pattern:
  - mock a minimal `ctx` object (`db`, `auth`, `runQuery`, etc.) with deterministic in-memory state
  - assert externally visible outcomes:
    - return values
    - thrown errors
    - persisted record state and history entries

## Client component behavior tests
- Preferred location:
  - `tests/unit/membership-sync.component.test.tsx`
- Tooling:
  - use `@testing-library/react` + `jsdom`
  - mock `useAuth` and `useAction`
  - fake timers for retry delays (`setTimeout` path)

If React testing-library is not yet installed, add:
- `@testing-library/react`
- `@testing-library/jest-dom` (optional but recommended)

---

## Execution Order (Recommended)
1. Prune duplicate/tautological tests.
2. Add Convex behavior tests for `canvases.get` and `canvases.remove`.
3. Add `agents.bulkReplace` behavior tests.
4. Add membership sync stale-timestamp tests.
5. Add AuthContext membership-sync/auth-recovery behavior tests.
6. Run and stabilize with `pnpm test:run`.

---

## Definition of Done
- No duplicate status/config assertions across multiple files.
- No tautological constant-shape tests that only mirror type definitions.
- New behavioral tests cover the 5 high-impact areas above.
- `pnpm test:run` passes.
- Total suite remains fast and maintainable.

---

## Reference Files
- Current low-signal tests:
  - `tests/unit/status-config.test.ts`
  - `tests/unit/config-utils.test.ts`
  - `tests/unit/formatting.test.ts`
  - `tests/unit/convex-auth.test.ts`
- High-impact target code:
  - `convex/canvases.ts`
  - `convex/agents.ts`
  - `convex/lib/membershipSync.ts`
  - `app/contexts/AuthContext.tsx`
