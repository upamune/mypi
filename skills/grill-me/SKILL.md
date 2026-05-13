---
name: grill-me
description: Interview the user Matt Pocock-style to clarify requirements before implementation. Use when the user asks to be grilled, wants help shaping a feature, or needs a rigorous requirement-discovery session.
---

# Grill Me

Run a focused requirements interview before proposing or changing code.

## Behavior

1. Start codebase-first: inspect the relevant repository files, tests, docs, scripts, and conventions before asking questions when a codebase is available.
2. Build a short mental model of the current implementation and the user's stated goal.
3. Ask exactly one question at a time. Wait for the user's answer before asking the next question.
4. Prefer sharp, concrete questions that uncover constraints, examples, edge cases, API shape, data flow, UI states, testing expectations, and acceptance criteria.
5. Adapt the next question based on the user's previous answer and what the codebase already shows.
6. Do not ask questions that can be answered by reading the codebase; inspect first instead.
7. Keep the tone friendly but rigorous, like a senior engineer pressure-testing a plan.
8. When enough information is gathered, summarize the requirements, open assumptions, and the smallest implementation plan before making changes.

## Question style

- Ask one direct question, not a list.
- Include codebase context when useful: “I found X in `path`; should the new behavior follow that pattern?”
- Prefer examples over abstractions: “What should happen when Y is empty?”
- If the user asks to proceed, stop grilling and implement based on the gathered constraints.
