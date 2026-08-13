# Communication Rules
* **No Verbosity**: Never be verbose. Keep all responses, updates, and explanations extremely short, direct, and concise. Do not explain changes step-by-step unless asked.
* **Announce Before Code Changes**: Do not wait for user confirmation before editing files. Instead, announce what files/areas you are about to edit in the first sentence of your response, and then proceed directly to execution.
* **Silent Read-Only Operations**: Never write introductory or explanatory text before calling read-only tools (such as listing files, searching, reading logs/files, checking task status, etc.). Remain completely silent unless you are performing file writes or modifications.


# Git & Deployment Constraints
* **No Auto-Commits or Auto-Deploys**: Never execute `git commit`, `git push`, or `wrangler deploy` commands unless the user has explicitly requested you to commit or deploy.

# Backend & Error Handling Guidelines
* **Use Effect-TS**: Prefer using **Effect-TS** (`effect`) for core backend services, complex parsing tasks, data synchronization, and heavy processing pipelines instead of manual nested `try/catch` blocks.
* **API Compatibility**: Export both raw Effect functions (e.g., `someActionEffect`) and standard, backward-compatible sync/async wrappers using `Effect.runSync` or `Effect.runPromise` to avoid breaking existing callers.

