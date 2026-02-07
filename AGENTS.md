# AGENTS

## Working-First Policy

This project prioritizes working behavior and verified outcomes over stylistic rewrites.

Rules:
- Solve the concrete bug/flow first. Keep changes scoped to the requested task.
- Do not replace working code with a "safer style" variant unless there is a demonstrated failure mode.
- Avoid speculative refactors and abstraction churn without functional benefit.
- For name handling, treat `displayName` as a normal field. Do not add extra heuristics or fallback semantics unless explicitly requested.
- After each meaningful change, validate with a concrete signal:
  - `tsc` (or targeted typecheck),
  - relevant tests,
  - or explicit runtime scenario verification.
- If a tradeoff is needed, prefer the least-complex solution that keeps the flow working end-to-end.

## Change Discipline

- Make minimal diffs.
- Keep business logic close to where it is used unless there is a clear maintainability gain.
- Preserve existing behavior unless the task explicitly asks to change it.
