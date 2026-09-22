<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * A voting request refused for a reason the voter should see, with a stable
 * machine-readable `reason` the frontend branches on (e.g. diaspora_disabled).
 */
class VotingException extends RuntimeException
{
    public function __construct(string $message, public readonly string $reason = 'invalid', public readonly int $status = 422)
    {
        parent::__construct($message);
    }
}
