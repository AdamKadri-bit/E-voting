<?php

namespace Tests\Feature;

use App\Models\RegistryPerson;
use App\Services\Ocr\OcrPage;
use App\Services\Ocr\TextReader;
use Illuminate\Http\UploadedFile;
use Tests\Feature\Admin\AdminTestCase;

class IdentityDocumentOcrTest extends AdminTestCase
{
    private function fakeVision(string $fixture): void
    {
        $page = OcrPage::fromArray(json_decode(file_get_contents(__DIR__ . "/../Fixtures/ocr/{$fixture}.json"), true));
        $this->app->instance(TextReader::class, new class($page) implements TextReader {
            public function __construct(private OcrPage $page)
            {
            }

            public function read(string $imagePath): OcrPage
            {
                return $this->page;
            }
        });
    }

    private function voter()
    {
        return $this->loginAsAdmin(['role' => 'voter']);
    }

    public function test_passport_photo_page_fills_name_and_birth_date_and_asks_for_parents(): void
    {
        config(['app.debug' => false]);
        $this->voter();
        $this->fakeVision('passport-photo');

        $r = $this->post('/api/ocr/document', ['document_type' => 'passport', 'front_image' => UploadedFile::fake()->image('p.jpg')], ['Accept' => 'application/json'])->assertOk();

        $r->assertJsonPath('data.full_name', 'Rami Georges Haddad')
            ->assertJsonPath('data.date_of_birth', '1990-01-15')
            ->assertJsonPath('missing', ['father_name', 'mother_name']);
        $this->assertStringContainsString("father's or mother's name", implode(' ', $r->json('warnings')));
        $this->assertArrayNotHasKey('ocr_debug', $r->json());
    }

    public function test_ikhraj_qayd_needs_one_image_and_fills_every_required_field(): void
    {
        config(['app.debug' => false]);
        $this->voter();
        $this->fakeVision('ikhraj-photo');

        $r = $this->post('/api/ocr/document', ['document_type' => 'ikhraj_qayd', 'front_image' => UploadedFile::fake()->image('i.jpg')], ['Accept' => 'application/json'])->assertOk();
        $r->assertJsonPath('missing', [])->assertJsonPath('data.civil_registry_number', '247');
        $this->assertStringNotContainsString('أرثوذكس', $r->getContent());
    }

    public function test_scanned_ikhraj_qayd_links_the_account_to_the_registry(): void
    {
        config(['app.debug' => false]);
        $user = $this->voter();
        RegistryPerson::create([
            'full_name_ar' => 'رامي حداد', 'father_name_ar' => 'جورج', 'mother_name_ar' => 'ماري خوري',
            'date_of_birth' => '1990-01-15', 'civil_registry_number' => 'RC-247-A', 'is_eligible' => true,
        ]);
        $this->fakeVision('ikhraj-clean');

        $d = $this->post('/api/ocr/document', ['document_type' => 'ikhraj_qayd', 'front_image' => UploadedFile::fake()->image('i.jpg')], ['Accept' => 'application/json'])->json('data');
        $this->postJson('/api/registry/link', [
            'full_name' => $d['full_name'], 'father_name' => $d['father_name'], 'mother_name' => $d['mother_name'], 'date_of_birth' => $d['date_of_birth'],
        ])->assertOk()->assertJsonPath('ok', true);
        $this->assertNotNull($user->fresh()->registry_person_id);
    }

    public function test_validation_and_auth(): void
    {
        $this->post('/api/ocr/document', ['document_type' => 'passport'], ['Accept' => 'application/json'])->assertStatus(401);
        $this->voter();
        $this->post('/api/ocr/document', ['document_type' => 'driving_licence', 'front_image' => UploadedFile::fake()->image('x.jpg')], ['Accept' => 'application/json'])->assertStatus(422);
        $this->post('/api/ocr/document', ['document_type' => 'national_id', 'front_image' => UploadedFile::fake()->image('x.jpg')], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('back_image');
    }

    public function test_provider_failure_returns_a_generic_message(): void
    {
        $this->voter();
        $this->app->instance(TextReader::class, new class implements TextReader {
            public function read(string $imagePath): OcrPage
            {
                throw new \RuntimeException('PERMISSION_DENIED project secret-project-123');
            }
        });
        $r = $this->post('/api/ocr/document', ['document_type' => 'passport', 'front_image' => UploadedFile::fake()->image('p.jpg')], ['Accept' => 'application/json'])->assertStatus(503);
        $this->assertStringNotContainsString('secret-project', $r->getContent());
    }

    public function test_registry_number_that_does_not_match_falls_back_to_names_but_never_to_nothing(): void
    {
        $user = $this->voter();
        RegistryPerson::create([
            'full_name_ar' => 'رامي حداد', 'father_name_ar' => 'جورج', 'mother_name_ar' => 'ماري خوري',
            'date_of_birth' => '1990-01-15', 'civil_registry_number' => 'MTN-0247', 'is_eligible' => true,
        ]);
        $payload = ['full_name' => 'رامي حداد', 'father_name' => 'جورج', 'mother_name' => 'ماري خوري', 'date_of_birth' => '1990-01-15', 'civil_registry_number' => '247'];

        // Wrong mother: neither the number nor the names match.
        $this->postJson('/api/registry/link', ['mother_name' => 'غير معروف'] + $payload)->assertStatus(404);
        $this->assertNull($user->fresh()->registry_person_id);

        // Number as printed on the extract ("247") differs from the registry's key, names match.
        $this->postJson('/api/registry/link', $payload)->assertOk();
        $this->assertNotNull($user->fresh()->registry_person_id);
    }

    public function test_current_passport_needs_no_typing_and_links_by_registry_number(): void
    {
        config(['app.debug' => false]);
        $user = $this->voter();
        RegistryPerson::create([
            'full_name_en' => 'Layal Nassar', 'father_name_en' => 'Samir', 'mother_name_en' => 'Nawal Khalil',
            'date_of_birth' => '1995-12-03', 'civil_registry_number' => '132', 'is_eligible' => true,
        ]);
        $this->fakeVision('passport-2page');

        $r = $this->post('/api/ocr/document', ['document_type' => 'passport', 'front_image' => UploadedFile::fake()->image('p.jpg')], ['Accept' => 'application/json'])->assertOk();
        $r->assertJsonPath('missing', [])->assertJsonPath('warnings', []);

        $d = $r->json('data');
        $this->postJson('/api/registry/link', array_intersect_key($d, array_flip(['full_name', 'father_name', 'mother_name', 'date_of_birth', 'civil_registry_number'])))
            ->assertOk();
        $this->assertNotNull($user->fresh()->registry_person_id);
    }
}
