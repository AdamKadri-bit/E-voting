# Phase 2 — Lists table upgraded (best practice)

## What changed
- Added stable list identifier: list_code
- Added bilingual fields: list_name_en, list_name_ar
- Added optional metadata: is_withdrawn, source_ref
- Backfilled existing data (list_name -> list_name_en + list_code)
- Added unique constraint uq_list_code_scope (election_id + constituency_id + list_code)

## Why
- List names vary in spelling/transliteration; list_code avoids broken references.
- Arabic + English display is required for Lebanese context.
- Seeders become safe to re-run without duplicates.

## Notes
- list_name remains for backward compatibility; treat it as legacy display.