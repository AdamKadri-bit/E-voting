<?php

namespace App\Console\Commands;

use App\Services\LebaneseIdOcrService;
use Google\Cloud\Vision\V1\ImageAnnotatorClient;
use Illuminate\Console\Command;

/**
 * Tells a developer, in one command, whether ID scanning will work on this
 * machine — and if not, exactly which step is missing.
 *
 * The API deliberately answers a failed scan with a generic 503 so provider
 * details never reach a client, which makes a misconfigured machine look
 * identical to an outage. This is where you find out which one it is.
 */
class CheckOcrSetup extends Command
{
    protected $signature = 'ocr:check {--live : Send a small test image to Google and report what comes back}';

    protected $description = 'Verify Google Cloud Vision credentials for the Lebanese ID OCR scan';

    public function handle(): int
    {
        $source = LebaneseIdOcrService::credentialSource();

        if ($source === null) {
            $this->error('No Google Cloud credentials on this machine.');
            $this->line('  no key file at: ' . LebaneseIdOcrService::credentialsPath());
            $this->line('  no login at:    ' . LebaneseIdOcrService::adcPath());
            $this->setupSteps();

            return self::FAILURE;
        }

        $ok = $source === 'service_account_key'
            ? $this->reportKeyFile()
            : $this->reportApplicationDefault();

        if (!$ok) {
            return self::FAILURE;
        }

        if (!$this->option('live')) {
            $this->newLine();
            $this->line('Run <options=bold>php artisan ocr:check --live</> to send a test image to Google.');

            return self::SUCCESS;
        }

        return $this->liveCheck();
    }

    private function reportKeyFile(): bool
    {
        $path = LebaneseIdOcrService::credentialsPath();

        $this->line("Using service-account key: <options=bold>{$path}</>");

        $key = json_decode((string) file_get_contents($path), true);

        if (!is_array($key)) {
            $this->error('The file is not valid JSON. Re-download the service-account key.');

            return false;
        }

        foreach (['type', 'project_id', 'private_key', 'client_email'] as $field) {
            if (empty($key[$field])) {
                $this->error("The key is missing \"{$field}\" — this does not look like a service-account key.");
                $this->line('In the Cloud console the right file comes from: Service account → Keys → Add key → JSON.');

                return false;
            }
        }

        $this->info('Key file looks valid.');
        $this->line("  project: {$key['project_id']}");
        $this->line("  account: {$key['client_email']}");

        return true;
    }

    private function reportApplicationDefault(): bool
    {
        $path = LebaneseIdOcrService::adcPath();

        $this->line("Using application-default credentials: <options=bold>{$path}</>");

        $adc = json_decode((string) file_get_contents($path), true);

        if (!is_array($adc)) {
            $this->error('That file is not valid JSON. Re-run: gcloud auth application-default login');

            return false;
        }

        $this->info('Login found.');

        if (!empty($adc['quota_project_id'])) {
            $this->line("  billing/quota project: {$adc['quota_project_id']}");
        } else {
            $this->warn('  No quota project set. If calls fail, run:');
            $this->line('    gcloud auth application-default set-quota-project YOUR_PROJECT_ID');
        }

        return true;
    }

    /** Round-trips a tiny generated PNG so a real credential problem surfaces. */
    private function liveCheck(): int
    {
        $this->newLine();
        $this->line('Calling Google Cloud Vision…');

        try {
            $client = new ImageAnnotatorClient(LebaneseIdOcrService::clientOptions());

            try {
                $client->textDetection($this->testImage());
            } finally {
                $client->close();
            }
        } catch (\Throwable $e) {
            $this->error('The call failed: ' . $e->getMessage());
            $this->newLine();

            $message = $e->getMessage();

            if (str_contains($message, 'has not been used') || str_contains($message, 'SERVICE_DISABLED')) {
                $this->line('The Vision API is not enabled on that project. Enable it:');
                $this->line('  https://console.cloud.google.com/apis/library/vision.googleapis.com');
            } elseif (str_contains($message, 'billing')) {
                $this->line('The project needs billing enabled — Vision has a free monthly tier but still requires it:');
                $this->line('  https://console.cloud.google.com/billing');
            } elseif (str_contains($message, 'quota project') || str_contains($message, 'SERVICE_DISABLED')) {
                $this->line('Set the project the calls are billed to:');
                $this->line('  gcloud auth application-default set-quota-project YOUR_PROJECT_ID');
            } elseif (str_contains($message, 'PERMISSION_DENIED')) {
                $this->line('The account lacks permission on that project. It needs a role that allows Vision');
                $this->line('calls — "Cloud Vision AI Service Agent", or Project → Editor — under IAM & Admin → IAM.');
            } elseif (str_contains($message, 'certificate') || str_contains($message, 'SSL')) {
                $this->line('TLS failed. Point PHP at a CA bundle in php.ini, e.g.:');
                $this->line('  curl.cainfo = "/opt/homebrew/etc/openssl@3/cert.pem"');
            }

            return self::FAILURE;
        }

        $this->info('Google answered. ID scanning works on this machine.');

        return self::SUCCESS;
    }

    private function setupSteps(): void
    {
        $this->newLine();
        $this->line('<options=bold>Two ways in. Pick one.</>');

        $this->newLine();
        $this->line('<options=bold>A. Sign in with your own browser (no key file — recommended when the');
        $this->line('   Cloud project belongs to someone else):</>');
        $this->line('  1. brew install --cask google-cloud-sdk');
        $this->line('  2. gcloud auth application-default login');
        $this->line('     (opens a browser; sign in with the account that has access to the project)');
        $this->line('  3. gcloud auth application-default set-quota-project YOUR_PROJECT_ID');
        $this->line('  4. php artisan ocr:check --live');
        $this->newLine();
        $this->line('  Nothing long-lived is written into the repo, and access dies with the login.');

        $this->newLine();
        $this->line('<options=bold>B. Service-account key file:</>');
        $this->line('  1. https://console.cloud.google.com → pick the project');
        $this->line('  2. Enable: https://console.cloud.google.com/apis/library/vision.googleapis.com');
        $this->line('  3. IAM & Admin → Service Accounts → the account → Keys → Add key → JSON');
        $this->line('  4. Move the downloaded file to: ' . LebaneseIdOcrService::credentialsPath());
        $this->line('  5. php artisan ocr:check --live');
        $this->newLine();
        $this->line('  The key is git-ignored and must stay that way — it authenticates as the project,');
        $this->line('  so a shared key means shared quota, shared billing, and no separate revocation.');
    }

    /** A 1x1 PNG: enough for the API to accept the request and answer. */
    private function testImage(): string
    {
        return base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        );
    }
}
