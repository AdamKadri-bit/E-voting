<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Raised when an account tries to verify against a voter registry record that
 * another account has already linked to — i.e. a second person presenting the
 * same national ID.
 */
class RegistryRecordAlreadyClaimedException extends RuntimeException
{
    public function __construct(
        string $message = 'This voter registry record is already linked to another account.'
    ) {
        parent::__construct($message);
    }
}
