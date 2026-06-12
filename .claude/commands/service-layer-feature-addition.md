---
name: service-layer-feature-addition
description: Workflow command scaffold for service-layer-feature-addition in Crypto_Portfolio.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /service-layer-feature-addition

Use this workflow when working on **service-layer-feature-addition** in `Crypto_Portfolio`.

## Goal

Implements a new backend service for business logic, often paired with controller/route changes.

## Common Files

- `server/src/services/*.js`
- `server/src/controllers/*Controller.js`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update a service file in server/src/services/
- Optionally update related controllers to use the new service

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.