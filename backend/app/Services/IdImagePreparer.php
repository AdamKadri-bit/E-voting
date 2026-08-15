<?php

namespace App\Services;

use App\Exceptions\UnsupportedIdImageException;
use Illuminate\Http\UploadedFile;
use Symfony\Component\Process\Process;

/**
 * Gets an uploaded ID photo into a shape Google Cloud Vision will accept.
 *
 * Phones are the problem this solves. An iPhone photographs in HEIC by
 * default, `accept="image/*"` happily hands one over, and neither Laravel's
 * `image` rule nor the Vision API will touch it — so the scan died on a
 * validation error that said only "must be an image". HEIC is converted to
 * JPEG here when the machine can, and refused with an explanation when it
 * can't.
 */
class IdImagePreparer
{
    /** What Vision accepts directly. */
    private const VISION_FORMATS = ['jpeg', 'jpg', 'png', 'gif', 'bmp', 'webp', 'ico', 'tiff', 'tif'];

    private const CONVERTIBLE = ['heic', 'heif'];

    /** Vision rejects anything past 20 MB. */
    private const MAX_BYTES = 20 * 1024 * 1024;

    /** @var string[] temp files to delete once the request is done */
    private array $temporary = [];

    /**
     * Returns a path Vision can read — the original when it already can, a
     * converted copy when it can't.
     *
     * @throws UnsupportedIdImageException when the file can't be made readable
     */
    public function prepare(UploadedFile $file, string $label): string
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $mime = strtolower((string) $file->getMimeType());

        if ($file->getSize() > self::MAX_BYTES) {
            throw new UnsupportedIdImageException(
                "The {$label} image is larger than 20 MB. Take the photo again at a smaller size."
            );
        }

        if ($this->isVisionReady($extension, $mime)) {
            return $file->getRealPath();
        }

        if ($this->isConvertible($extension, $mime)) {
            return $this->toJpeg($file, $label);
        }

        throw new UnsupportedIdImageException(
            "The {$label} image is not a supported picture format"
            . ($extension !== '' ? " (.{$extension})" : '')
            . '. Upload a JPG or PNG photo of the ID.'
        );
    }

    /** Deletes anything this instance wrote. Call once the scan is finished. */
    public function cleanup(): void
    {
        foreach ($this->temporary as $path) {
            if (is_file($path)) {
                @unlink($path);
            }
        }

        $this->temporary = [];
    }

    /** Whether this machine can turn a HEIC into something Vision reads. */
    public static function canConvertHeic(): bool
    {
        return self::imagickHandlesHeic() || self::sipsPath() !== null;
    }

    private function isVisionReady(string $extension, string $mime): bool
    {
        return in_array($extension, self::VISION_FORMATS, true)
            || (str_starts_with($mime, 'image/') && !$this->isConvertible($extension, $mime));
    }

    private function isConvertible(string $extension, string $mime): bool
    {
        return in_array($extension, self::CONVERTIBLE, true)
            || in_array($mime, ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'], true);
    }

    private function toJpeg(UploadedFile $file, string $label): string
    {
        $target = tempnam(sys_get_temp_dir(), 'idscan') . '.jpg';
        $this->temporary[] = $target;

        if (self::imagickHandlesHeic() && $this->convertWithImagick($file->getRealPath(), $target)) {
            return $target;
        }

        if (self::sipsPath() !== null && $this->convertWithSips($file->getRealPath(), $target)) {
            return $target;
        }

        throw new UnsupportedIdImageException(
            "The {$label} image is a HEIC photo, which this server cannot read. "
            . 'On iPhone: Settings → Camera → Formats → Most Compatible, then take the photo again — '
            . 'or export it as JPG before uploading.'
        );
    }

    private function convertWithImagick(string $source, string $target): bool
    {
        try {
            $image = new \Imagick($source);
            $image->setImageFormat('jpeg');
            $image->setImageCompressionQuality(92);
            $written = $image->writeImage($target);
            $image->clear();

            return $written && filesize($target) > 0;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /** macOS ships `sips`, which reads HEIC without any PHP extension. */
    private function convertWithSips(string $source, string $target): bool
    {
        try {
            $process = new Process([
                self::sipsPath(),
                '-s', 'format', 'jpeg',
                $source,
                '--out', $target,
            ]);
            $process->setTimeout(30);
            $process->run();

            return $process->isSuccessful() && is_file($target) && filesize($target) > 0;
        } catch (\Throwable $e) {
            return false;
        }
    }

    private static function imagickHandlesHeic(): bool
    {
        if (!extension_loaded('imagick')) {
            return false;
        }

        foreach (\Imagick::queryFormats('HEI*') as $format) {
            if ($format !== '') {
                return true;
            }
        }

        return false;
    }

    private static function sipsPath(): ?string
    {
        return is_executable('/usr/bin/sips') ? '/usr/bin/sips' : null;
    }
}
