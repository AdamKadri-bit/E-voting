<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * The uploaded ID photo cannot be sent to the OCR provider — wrong format,
 * too large, or a HEIC this server has no way to convert.
 *
 * Unlike a provider failure, the message is safe to show the person doing the
 * upload: it describes their own file and what to do about it, and carries no
 * provider or project detail.
 */
class UnsupportedIdImageException extends RuntimeException
{
}
