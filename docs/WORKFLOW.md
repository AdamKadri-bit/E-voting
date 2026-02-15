# Development Workflow Rules

## Branching
- No direct commits to main.
- All work done in feature branches.
- Pull Request required before merging.

## Database Rules
- Only migration owner merges migrations.
- No manual schema edits in AWS.
- All changes via Laravel migrations.

## Feature Development
- Work in vertical slices.
- Each feature has an integrator.
- API contract must be updated before backend implementation.

## Code Discipline
- No hardcoded secrets.
- Validation required on all inputs.
- Role-based authorization enforced server-side.
- comments are mandatory to ensure that all members undertsand what the other partner added or done.