<?php

/*
| Settings for diaspora voting, end-to-end verifiable ballots and sign-in
| hardening. Every value has a safe default so a fresh clone works unchanged.
*/

return [

    /*
    | Offline GeoIP database (MaxMind DB format: GeoLite2-Country or DB-IP
    | Country Lite). Looked up locally — no voter data leaves the server.
    | `php artisan geoip:update` downloads DB-IP Lite (CC BY 4.0).
    */
    'geoip_path' => env('GEOIP_DB_PATH', storage_path('app/geoip/country.mmdb')),

    /*
    | Key for the per-election pseudonymous voter credential
    | (HMAC(key, election, voter)). Falls back to a key derived from APP_KEY.
    | Must stay fixed while any election is open, or re-votes stop superseding.
    */
    'credential_key' => env('EVOTE_CREDENTIAL_KEY'),

    /* Public turnout/map cells smaller than this are shown as "< N". */
    'public_min_cell' => (int) env('EVOTE_PUBLIC_MIN_CELL', 5),

    /* Default trustee threshold k-of-n for new elections. */
    'trustees' => [
        'threshold' => 2,
        'count' => 3,
        'max_count' => 9,
    ],

    /*
    | SHA-256 of the client crypto bundle, written by scripts/reproducible-build.sh
    | and shown on every bulletin board so anyone can rebuild and compare.
    */
    'client_bundle_manifest' => env('EVOTE_CLIENT_BUNDLE_MANIFEST', resource_path('data/client-crypto-bundle.json')),

    /* Sign-in hardening. */
    'lockout' => [
        'max_attempts' => 5,
        'base_minutes' => 1,
        'max_minutes' => 60,
    ],

    'webauthn' => [
        'rp_name' => env('WEBAUTHN_RP_NAME', 'Lebanon Secure E-Voting'),
        // Must equal the host the frontend runs on (no port, no scheme).
        'rp_id' => env('WEBAUTHN_RP_ID', parse_url(env('FRONTEND_URL', 'http://localhost:5173'), PHP_URL_HOST) ?: 'localhost'),
    ],
];
