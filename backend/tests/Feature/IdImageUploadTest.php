<?php

namespace Tests\Feature;

use App\Exceptions\UnsupportedIdImageException;
use App\Models\User;
use App\Services\IdImagePreparer;
use Firebase\JWT\JWT;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class IdImageUploadTest extends TestCase
{
    use RefreshDatabase;

    private function authenticate(): User
    {
        $user = User::factory()->create(['role' => 'voter', 'email_verified_at' => now()]);

        $token = JWT::encode([
            'sub' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'email_verified' => true,
            'iat' => time(),
            'exp' => time() + 900,
        ], (string) env('JWT_SECRET'), 'HS256');

        $this->withCredentials()
            ->withUnencryptedCookie('access_token', $token)
            ->withHeader('Accept', 'application/json');

        return $user;
    }

    public function test_a_jpeg_photo_passes_validation(): void
    {
        $this->authenticate();

        // No credentials on the test machine, so the scan itself fails at the
        // provider — 503, not 422. That is the point: the upload was accepted.
        $response = $this->post('/api/ocr/lebanese-id', [
            'front_image' => UploadedFile::fake()->image('front.jpg'),
            'back_image' => UploadedFile::fake()->image('back.jpg'),
        ]);

        $this->assertNotSame(422, $response->status());
    }

    public function test_validation_no_longer_rejects_a_heic_upload(): void
    {
        // Regression guard for the original bug: Laravel's `image` rule
        // rejected HEIC outright, so every iPhone upload died at validation
        // with "The front image field must be an image." before anything
        // could convert it.
        $rules = (new \App\Http\Requests\LebaneseIdOcrRequest())->rules();

        $validator = \Illuminate\Support\Facades\Validator::make([
            'front_image' => UploadedFile::fake()->create('front.heic', 200, 'image/heic'),
            'back_image' => UploadedFile::fake()->create('back.heic', 200, 'image/heic'),
        ], $rules);

        $this->assertFalse($validator->fails(), 'HEIC uploads must reach the converter, not die at validation.');
    }

    public function test_a_real_heic_photo_is_converted_and_accepted(): void
    {
        if (!IdImagePreparer::canConvertHeic()) {
            $this->markTestSkipped('This machine cannot convert HEIC (no Imagick HEIC support, no sips).');
        }

        $heic = $this->makeHeic();

        if ($heic === null) {
            $this->markTestSkipped('Could not produce a HEIC fixture on this machine.');
        }

        $preparer = new IdImagePreparer();
        $prepared = $preparer->prepare(new UploadedFile($heic, 'front.heic', 'image/heic', null, true), 'front');

        $this->assertNotSame($heic, $prepared, 'A HEIC must be converted, not passed through.');
        $this->assertSame('image/jpeg', mime_content_type($prepared));

        $preparer->cleanup();
        $this->assertFileDoesNotExist($prepared, 'Converted copies must not be left behind.');
    }

    public function test_an_unreadable_heic_says_how_to_fix_it(): void
    {
        $this->authenticate();

        // An empty .heic cannot be converted by anything, which is the same
        // path a machine without HEIC support takes.
        $response = $this->post('/api/ocr/lebanese-id', [
            'front_image' => UploadedFile::fake()->create('front.heic', 200, 'image/heic'),
            'back_image' => UploadedFile::fake()->create('back.heic', 200, 'image/heic'),
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('HEIC', $response->json('message'));
        $this->assertStringContainsString('Most Compatible', $response->json('message'));
    }

    /** Builds a genuine HEIC via sips, or null when that is not possible. */
    private function makeHeic(): ?string
    {
        if (!is_executable('/usr/bin/sips')) {
            return null;
        }

        $jpeg = tempnam(sys_get_temp_dir(), 'fixture') . '.jpg';
        $image = imagecreatetruecolor(120, 80);
        imagefilledrectangle($image, 0, 0, 120, 80, imagecolorallocate($image, 200, 200, 200));
        imagejpeg($image, $jpeg);
        imagedestroy($image);

        $heic = tempnam(sys_get_temp_dir(), 'fixture') . '.heic';
        exec('/usr/bin/sips -s format heic ' . escapeshellarg($jpeg) . ' --out ' . escapeshellarg($heic) . ' 2>/dev/null', $out, $code);
        @unlink($jpeg);

        return ($code === 0 && is_file($heic) && filesize($heic) > 0) ? $heic : null;
    }

    public function test_an_oversized_file_is_refused_with_a_readable_message(): void
    {
        $this->authenticate();

        $response = $this->post('/api/ocr/lebanese-id', [
            'front_image' => UploadedFile::fake()->create('front.jpg', 25000, 'image/jpeg'),
            'back_image' => UploadedFile::fake()->image('back.jpg'),
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('20 MB', implode(' ', $response->json('errors.front_image')));
    }

    public function test_a_missing_file_names_which_side_is_missing(): void
    {
        $this->authenticate();

        $response = $this->post('/api/ocr/lebanese-id', [
            'front_image' => UploadedFile::fake()->image('front.jpg'),
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('back of the ID', implode(' ', $response->json('errors.back_image')));
    }

    public function test_a_pdf_is_refused_as_a_picture_format(): void
    {
        $this->authenticate();

        $response = $this->post('/api/ocr/lebanese-id', [
            'front_image' => UploadedFile::fake()->create('front.pdf', 200, 'application/pdf'),
            'back_image' => UploadedFile::fake()->image('back.jpg'),
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('JPG or PNG', $response->json('message'));
    }

    public function test_preparer_passes_a_jpeg_through_untouched(): void
    {
        $file = UploadedFile::fake()->image('front.jpg');
        $preparer = new IdImagePreparer();

        $this->assertSame($file->getRealPath(), $preparer->prepare($file, 'front'));

        $preparer->cleanup();
    }

    public function test_preparer_refuses_an_unsupported_format_by_name(): void
    {
        $preparer = new IdImagePreparer();

        $this->expectException(UnsupportedIdImageException::class);
        $this->expectExceptionMessage('.txt');

        $preparer->prepare(UploadedFile::fake()->create('front.txt', 10, 'text/plain'), 'front');
    }

    public function test_unauthenticated_upload_is_rejected(): void
    {
        $this->withHeader('Accept', 'application/json')->post('/api/ocr/lebanese-id', [
            'front_image' => UploadedFile::fake()->image('front.jpg'),
            'back_image' => UploadedFile::fake()->image('back.jpg'),
        ])->assertStatus(401);
    }
}
