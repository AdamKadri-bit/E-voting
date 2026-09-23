<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Raised when the registry record a scan matched belongs to a different person
 * than the account's existing voter profile (other birth date or constituency).
 * Linking it would verify one identity while the ballot follows another.
 */
class RegistryRecordMismatchException extends RuntimeException
{
    public function __construct(
        string $message = 'This document belongs to a different person than this account\'s voter profile. Sign in with your own account, or contact the election office.'
    ) {
        parent::__construct($message);
    }
}
