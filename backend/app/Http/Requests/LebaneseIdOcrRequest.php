<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LebaneseIdOcrRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Deliberately not Laravel's `image` rule: it rejects HEIC, which is what
     * an iPhone produces by default, with the unhelpful message "must be an
     * image". Format is checked in IdImagePreparer instead, where a HEIC can
     * be converted and anything genuinely unusable gets an explanation the
     * person uploading can act on.
     *
     * The cap is Google Vision's own limit of 20 MB per image.
     */
    public function rules(): array
    {
        return [
            'front_image' => ['required', 'file', 'max:20480'],
            'back_image' => ['required', 'file', 'max:20480'],
        ];
    }

    public function messages(): array
    {
        return [
            'front_image.required' => 'Upload a photo of the front of the ID.',
            'back_image.required' => 'Upload a photo of the back of the ID.',
            'front_image.max' => 'The front image is larger than 20 MB. Take the photo again at a smaller size.',
            'back_image.max' => 'The back image is larger than 20 MB. Take the photo again at a smaller size.',
        ];
    }
}