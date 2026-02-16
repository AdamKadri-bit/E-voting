# Schema v1 (Lebanon) — Secure E-Voting

## Core legal alignment (Lebanon)
- A voter’s ballot is counted in their **registered area**, not their current residence.
- A voter votes within their legally-defined **constituency** derived from their registered **district** (qadaa).
- Parliamentary style supports **lists + preferential choice**, but the actual selection stays inside the encrypted payload for secrecy.

## Naming
- governorate = mohafaza
- district = qadaa
- constituency = legal electoral constituency (grouping of districts)
- national_id_number = Lebanese ID / registry identifier

---

## A) Geography & legal mapping

### governorates
- id (PK)
- code (unique)
- name_en
- name_ar (nullable)

### districts
- id (PK)
- governorate_id (FK -> governorates.id)
- code (unique)
- name_en
- name_ar (nullable)

### constituencies
Represents the legal constituencies used for a given law reference (e.g. Law 44/2017).
- id (PK)
- code (unique)
- name_en
- name_ar (nullable)
- law_ref (string)

### constituency_districts
Maps districts to constituencies (so voter registration determines their constituency).
- id (PK)
- constituency_id (FK -> constituencies.id)
- district_id (FK -> districts.id)
- unique(constituency_id, district_id)

---

## B) Registry & identity

### users
Authentication accounts for both admins and voters.
- id (PK)
- name
- email (unique)  // for login
- password (hashed)
- role (enum: admin, voter)
- timestamps

### voters
Registry record (national ID based), linked 1:1 to a user account.
- id (PK)
- user_id (FK -> users.id, unique)  // links the login account to the registry record
- national_id_number (unique)
- first_name
- father_name
- last_name
- mother_full_name (nullable)
- date_of_birth
- place_of_birth (nullable)
- registered_governorate_id (FK -> governorates.id)
- registered_district_id (FK -> districts.id)
- current_residence_text (nullable)  // informational only
- civil_rights_status (enum: full, restricted)
- eligibility_status (enum: eligible, ineligible, suspended)
- ineligibility_reason (nullable)
- timestamps

---

## C) Elections, candidates, lists (parliamentary-ready)

### elections
- id (PK)
- type (enum: parliamentary, municipal, other)
- law_ref (string)
- title
- starts_at
- ends_at
- status (enum: draft, active, closed)
- timestamps

### election_constituencies
Which constituencies are active within the election.
- id (PK)
- election_id (FK -> elections.id)
- constituency_id (FK -> constituencies.id)
- unique(election_id, constituency_id)

### candidate_profiles
A person that can run.
- id (PK)
- national_id_number (unique)
- full_name
- date_of_birth
- civil_rights_status (enum: full, restricted)
- timestamps

### candidacies
Candidate running in a specific election + constituency.
- id (PK)
- election_id (FK -> elections.id)
- candidate_profile_id (FK -> candidate_profiles.id)
- constituency_id (FK -> constituencies.id)
- status (enum: pending, accepted, rejected, withdrawn)
- rejection_reason (nullable)
- timestamps

### lists
Political lists within a constituency for an election.
- id (PK)
- election_id (FK -> elections.id)
- constituency_id (FK -> constituencies.id)
- list_name
- timestamps
- unique(election_id, constituency_id, list_name)

### list_candidates
Membership of candidates in lists.
- id (PK)
- list_id (FK -> lists.id)
- candidacy_id (FK -> candidacies.id)
- position_order (nullable)
- unique(list_id, candidacy_id)

---

## D) Voting (anonymous encrypted ballots + one-vote enforcement)

### voter_election_status
Enforces one vote per election (without linking to ballot).
- id (PK)
- voter_id (FK -> voters.id)
- election_id (FK -> elections.id)
- has_voted (bool default false)
- voted_at (nullable)
- unique(voter_id, election_id)

### encrypted_ballots
Stores encrypted payload only. No voter_id.
- id (PK)
- election_id (FK -> elections.id)
- constituency_id (FK -> constituencies.id)  // derived from voter registered district at vote time
- encrypted_payload (longtext)
- payload_hash (char(64))
- receipt_hash (char(64), unique)
- cast_at (datetime)
- timestamps

### receipts
Public verification store (optional separate table).
- id (PK)
- election_id (FK -> elections.id)
- receipt_hash (char(64), unique)
- issued_at (datetime)
- timestamps

### audit_logs
Admin/system actions.
- id (PK)
- actor_user_id (nullable FK -> users.id)
- action (string)
- metadata_json (json nullable)
- ip_address (nullable)
- user_agent (nullable)
- prev_hash (nullable)     // for hash chaining later
- entry_hash (nullable)    // for hash chaining later
- created_at
