<?php

namespace Tests\Feature;

use App\Services\LebaneseIdOcrService;
use Tests\TestCase;

class OcrSetupTest extends TestCase
{
    private function writeKey(array $overrides = []): string
    {
        $path = tempnam(sys_get_temp_dir(), 'gcv') . '.json';

        file_put_contents($path, json_encode(array_merge([
            'type' => 'service_account',
            'project_id' => 'test-project',
            'private_key' => '-----BEGIN PRIVATE KEY-----\nnot-a-real-key\n-----END PRIVATE KEY-----\n',
            'client_email' => 'vision@test-project.iam.gserviceaccount.com',
        ], $overrides)));

        return $path;
    }

    public function test_credentials_path_follows_the_configured_value(): void
    {
        config(['services.google_vision.credentials' => '/tmp/somewhere-else.json']);

        $this->assertSame('/tmp/somewhere-else.json', LebaneseIdOcrService::credentialsPath());
    }

    /** Points HOME at an empty directory so a real gcloud login can't sway the test. */
    private function withoutApplicationDefault(): void
    {
        $home = sys_get_temp_dir() . '/ocr-home-' . uniqid();
        mkdir($home, 0700, true);
        putenv("HOME={$home}");
    }

    protected function tearDown(): void
    {
        putenv('HOME=' . ($_SERVER['HOME'] ?? ''));

        parent::tearDown();
    }

    public function test_is_configured_reports_a_missing_key(): void
    {
        $this->withoutApplicationDefault();
        config(['services.google_vision.credentials' => '/tmp/definitely-not-here.json']);

        $this->assertFalse(LebaneseIdOcrService::isConfigured());
        $this->assertNull(LebaneseIdOcrService::credentialSource());
    }

    public function test_is_configured_reports_a_present_key(): void
    {
        config(['services.google_vision.credentials' => $this->writeKey()]);

        $this->assertTrue(LebaneseIdOcrService::isConfigured());
        $this->assertSame('service_account_key', LebaneseIdOcrService::credentialSource());
    }

    public function test_a_gcloud_login_counts_as_credentials(): void
    {
        // `gcloud auth application-default login` is the second way in: no key
        // file, so the client must be left to resolve credentials itself.
        $home = sys_get_temp_dir() . '/ocr-home-' . uniqid();
        mkdir($home . '/.config/gcloud', 0700, true);
        file_put_contents(
            $home . '/.config/gcloud/application_default_credentials.json',
            json_encode(['type' => 'authorized_user', 'quota_project_id' => 'test-project'])
        );
        putenv("HOME={$home}");

        config(['services.google_vision.credentials' => '/tmp/definitely-not-here.json']);

        $this->assertTrue(LebaneseIdOcrService::isConfigured());
        $this->assertSame('application_default', LebaneseIdOcrService::credentialSource());
        $this->assertSame([], LebaneseIdOcrService::clientOptions());
    }

    public function test_a_key_file_is_passed_to_the_client_explicitly(): void
    {
        $path = $this->writeKey();
        config(['services.google_vision.credentials' => $path]);

        $this->assertSame(['credentials' => $path], LebaneseIdOcrService::clientOptions());
    }

    public function test_check_command_explains_a_missing_key(): void
    {
        $this->withoutApplicationDefault();
        config(['services.google_vision.credentials' => '/tmp/definitely-not-here.json']);

        $this->artisan('ocr:check')
            ->expectsOutputToContain('No Google Cloud credentials on this machine.')
            ->expectsOutputToContain('gcloud auth application-default login')
            ->expectsOutputToContain('vision.googleapis.com')
            ->assertFailed();
    }

    public function test_check_command_rejects_a_file_that_is_not_a_service_account_key(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'gcv') . '.json';
        file_put_contents($path, json_encode(['hello' => 'world']));

        config(['services.google_vision.credentials' => $path]);

        $this->artisan('ocr:check')
            ->expectsOutputToContain('missing "type"')
            ->assertFailed();
    }

    public function test_check_command_accepts_a_valid_key(): void
    {
        config(['services.google_vision.credentials' => $this->writeKey()]);

        $this->artisan('ocr:check')
            ->expectsOutputToContain('Key file looks valid.')
            ->expectsOutputToContain('test-project')
            ->assertSuccessful();
    }

    public function test_scanning_without_a_key_fails_before_calling_the_provider(): void
    {
        $this->withoutApplicationDefault();
        config(['services.google_vision.credentials' => '/tmp/definitely-not-here.json']);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Google Cloud Vision has no credentials on this machine');

        app(LebaneseIdOcrService::class)->extractFromImages('/tmp/a.jpg', '/tmp/b.jpg');
    }
}
