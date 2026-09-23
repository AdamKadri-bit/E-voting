# Backend

Laravel 12 API (PHP 8.3). Setup, demo accounts and commands are in the
[root README](../README.md).

| Path | Contents |
|---|---|
| `app/Crypto/` | ballot cryptography on libsodium (ElGamal on ristretto255, proofs, threshold keys) |
| `app/Services/E2e/` | ballots, key ceremony, tally, bulletin board, verifier |
| `app/Services/Ocr/` | identity-document OCR (ikhraj qayd, passport) |
| `database/seeders/DemoE2eSeeder.php` | demo elections, trustees, voters and tester identities |

Useful commands: `php artisan test`, `php artisan election:verify <id>`,
`php artisan roll:sync <id>`, `php artisan geoip:update`, `php artisan demo:ceremony-election`.
