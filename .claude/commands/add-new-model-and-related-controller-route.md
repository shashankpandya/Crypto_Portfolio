---
name: add-new-model-and-related-controller-route
description: Workflow command scaffold for add-new-model-and-related-controller-route in Crypto_Portfolio.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-new-model-and-related-controller-route

Use this workflow when working on **add-new-model-and-related-controller-route** in `Crypto_Portfolio`.

## Goal

Adds a new Mongoose model, then creates corresponding controller and route for an entity in the backend.

## Common Files

- `server/src/models/*.js`
- `server/src/controllers/*Controller.js`
- `server/src/routes/*.js`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update a new model file in server/src/models/
- Create or update a controller in server/src/controllers/
- Create or update a route file in server/src/routes/

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.