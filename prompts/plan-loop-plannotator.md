---
description: Draft a plan, run the agent review loop, then submit to Plannotator
---

Create or update an implementation plan before making code changes.

Workflow:

1. Inspect the codebase enough to produce a concrete markdown checklist plan.
2. Save the plan in a suitable markdown file in the working tree.
3. Run the review loop against the plan before presenting it for human review:
   - use the `review_loop` tool with `start: true`
   - use `freshContext: true`
   - use `maxIterations: 5`
   - focus on whether the plan is correct for the existing codebase, avoids unnecessary scope, identifies tests, and has executable steps
4. Apply any review findings to the plan and keep the loop going until no issues remain or the max iteration limit is reached.
5. After the agent review loop is done, submit the final plan with `plannotator_submit_plan` so the human can approve or annotate it in Plannotator.

Do not begin implementation until the Plannotator plan is approved.
