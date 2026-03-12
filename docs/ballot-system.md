# Backend (V1) — Ballot, Vote Casting & Audit Chain

This document explains the backend voting pipeline implemented in the E-Voting system.

Scope of this implementation:

- Ballot generation
- Vote casting
- Encrypted ballot storage
- Receipt generation
- Double-vote prevention
- Tamper-evident ballot chain
- Receipt verification
- Ballot chain verification

Target: **secure and auditable election backend prototype.**

---

# 1. Tech Stack

Backend stack used in the project:

- Laravel (API backend)
- MySQL database
- JWT cookie authentication
- Eloquent ORM

Architecture pattern used:

```
Controller → Service → Model → Database
```

Controllers remain thin while services contain the business logic.

---

# 2. Backend Folder Structure

Important backend files involved in the voting system.

```
backend/app/Http/Controllers
│
├ BallotController.php
├ VoteController.php
├ ReceiptController.php
└ AuditChainController.php
```

```
backend/app/Services
│
├ BallotService.php
├ VoteCastingService.php
├ ReceiptService.php
├ AuditLogService.php
└ ChainVerificationService.php
```

```
backend/app/Models
│
├ Election.php
├ Voter.php
├ ElectoralRollEntry.php
├ EncryptedBallot.php
├ Receipt.php
└ VoterElectionStatus.php
```

```
backend/database/migrations
│
├ create_encrypted_ballots_table.php
├ create_receipts_table.php
└ create_voter_election_status_table.php
```

---

# 3. Voting Flow

High-level voting pipeline:

```
User Login
   │
   ▼
GET /api/elections/{id}/ballot
   │
   ▼
BallotService generates ballot
   │
   ▼
User selects list and candidate
   │
   ▼
POST /api/elections/{id}/vote
   │
   ▼
VoteCastingService validates vote
   │
   ▼
Encrypted ballot stored
   │
   ▼
Receipt generated
   │
   ▼
Ballot chain updated
```

Verification flow:

```
Receipt verification
GET /api/receipts/{receiptHash}

Ballot chain verification
GET /api/audit/ballot-chain/verify
```

---

# 4. Core Database Tables

## users

Authentication accounts.

Important fields:

```
id
name
email
password
role
email_verified_at
```

Users authenticate with this table.

---

## voters

Represents the voter identity linked to a platform account.

Important fields:

```
user_id
national_id_number
first_name
father_name
last_name
mother_full_name
date_of_birth
registered_governorate_id
registered_district_id
```

This connects the login account with the election identity.

---

## electoral_roll_entries

Represents the official election voter list.

Fields:

```
election_id
national_id_number
first_name
father_name
last_name
mother_full_name
date_of_birth
registered_district_id
```

Only voters appearing in the electoral roll are allowed to vote.

---

## voter_election_status

Tracks whether a voter has already voted.

Fields:

```
voter_id
election_id
has_voted
voted_at
```

Used for **double-vote prevention**.

---

## encrypted_ballots

Stores encrypted ballots.

Fields:

```
chain_index
encrypted_payload
payload_hash
receipt_hash
previous_hash
block_hash
cast_at
```

Acts as a **tamper-evident ballot ledger**.

---

## receipts

Stores vote receipts.

Fields:

```
election_id
receipt_hash
issued_at
```

The receipt hash is returned to the voter.

---

# 5. BallotController

File:

```
app/Http/Controllers/BallotController.php
```

Responsibilities:

- authenticate user
- resolve election
- call BallotService
- return ballot JSON

Endpoint:

```
GET /api/elections/{election}/ballot
```

Purpose: generate the ballot for a voter.

---

# 6. VoteController

File:

```
app/Http/Controllers/VoteController.php
```

Responsibilities:

- validate vote request
- authenticate voter
- call VoteCastingService
- return receipt information

Endpoint:

```
POST /api/elections/{election}/vote
```

Example request:

```
{
 list_id: 1,
 preferential_candidacy_id: null
}
```

---

# 7. BallotService

File:

```
app/Services/BallotService.php
```

Responsibilities:

- validate voter profile
- verify election status
- verify voting time window
- verify electoral roll membership
- resolve district and constituency
- fetch lists and candidates

Validations performed:

```
User must have voter profile
Election must be active
Current time must be inside election window
Voter must appear in electoral roll
```

---

# 8. VoteCastingService

File:

```
app/Services/VoteCastingService.php
```

Main responsibilities:

1. Validate voter identity
2. Verify election status
3. Verify electoral roll membership
4. Resolve district and constituency
5. Validate selected list
6. Validate preferential candidate
7. Prevent double voting
8. Build vote payload
9. Encrypt payload
10. Generate receipt
11. Update ballot chain
12. Store ballot

---

## Double-Vote Prevention

Handled using database transactions and row locking.

```
lockForUpdate()
```

This ensures concurrent vote attempts cannot bypass the system.

---

# 9. Ballot Payload

Votes are encoded as JSON before encryption.

Example structure:

```
{
 election_id,
 constituency_id,
 district_id,
 list_id,
 preferential_candidacy_id,
 cast_at
}
```

---

# 10. Encryption

Ballots are encrypted using Laravel encryption.

```
encrypt(payload_json)
```

This ensures vote secrecy.

---

# 11. Hash Generation

Three hashes are generated.

Payload hash:

```
SHA256(payload_json)
```

Receipt hash:

```
SHA256(payload_hash + random_uuid)
```

Block hash:

```
SHA256(
 chain_index
 election_id
 constituency_id
 payload_hash
 receipt_hash
 previous_hash
 cast_at
)
```

---

# 12. Ballot Chain

Ballots are chained together using hashes.

Example structure:

```
Ballot 1
hash A

Ballot 2
previous_hash = A
hash B

Ballot 3
previous_hash = B
hash C
```

If a ballot is modified:

- the block hash changes
- chain verification fails

This provides tamper detection.

---

# 13. Receipt Verification

Endpoint:

```
GET /api/receipts/{receiptHash}
```

Purpose:

Allows voters or auditors to verify that a vote exists.

Returns:

```
receipt_hash
issued_at
election_id
election_title
```

Vote contents remain secret.

---

# 14. Chain Verification

Endpoint:

```
GET /api/audit/ballot-chain/verify
```

Service:

```
ChainVerificationService
```

Verification steps:

```
1. Load ballots in order
2. Check previous_hash
3. Recalculate block_hash
4. Compare hashes
```

If mismatch occurs:

```
chain invalid
```

---

# 15. Security Features

The system currently includes:

### Encryption
Votes are encrypted before storage.

### Electoral Roll Validation
Only voters appearing in the official roll may vote.

### Double Vote Prevention
Handled using voter_election_status + transaction locking.

### Receipt Verification
Each voter receives proof of vote recording.

### Tamper-Evident Ledger
Ballots are chained using hashes.

### Voting Window Enforcement
Votes are only accepted during the election period.

---

# 16. API Endpoints

Authentication:

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

User:

```
GET /api/me
```

Voting:

```
GET /api/elections/{election}/ballot
POST /api/elections/{election}/vote
```

Receipt verification:

```
GET /api/receipts/{receiptHash}
```

Audit:

```
GET /api/audit/ballot-chain/verify
```

---

# 17. Conclusion

The backend voting system currently implements:

- ballot generation
- vote validation
- encrypted ballot storage
- receipt generation
- receipt verification
- double-vote prevention
- tamper-evident ballot ledger
- ballot chain verification
- election time-window enforcement

This architecture forms the secure foundation of the E-Voting platform.