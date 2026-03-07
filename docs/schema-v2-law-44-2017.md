# Phase 1 — Election schema (future-proof seats + strict Law 44/2017 hooks)

## What changed
- Added `confessions` lookup table (code + Arabic/English labels).
- Added `election_seats` table so seat distribution can change per election (future law changes).
- Added `district_id` and `confession_id` to `candidacies` (needed for strict preferential vote rules + later results).
- Added `electoral_roll_entries` to represent mock لوائح الشطب (realistic eligibility dataset).

## Why
- Seat allocation must be data-driven to support future elections (e.g., Zahle seat mix changes).
- Preferential vote must be restricted to the voter’s qadaa, which requires candidate qadaa on the candidacy.
- We need a realistic roll dataset without storing real citizens’ data.

## Migrations added
- create_confessions_table
- create_election_seats_table
- add_district_and_confession_to_candidacies_table
- create_electoral_roll_entries_table

## Seeders added
- ConfessionSeeder

## Notes
- `district_id` and `confession_id` on candidacies are nullable for now to avoid blocking early seeding.
- We will enforce non-null and validation rules once Phase 2 seeding is in place.