# Phase 2 — Electoral map seed (2022 / Law 44-2017)

## What we added
- Seeded the 15 parliamentary constituencies (دوائر انتخابية كبرى) with English + Arabic names.
- Seeded the mapping between qadaa (قضاء) and constituencies using constituency_districts.

## Why
All voting logic must derive the voter’s constituency from their registered qadaa, exactly as in Lebanese parliamentary elections.

## Seeders added
- ConstituencySeeder
- ConstituencyDistrictSeeder

## Notes
- Assumes districts table already contains the 26 qadaa (districts) by code.
- If a district code is missing, the seeder will throw a clear exception.