<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LebaneseIdOcrRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'front_image' => ['required', 'image', 'max:10240'],
            'back_image' => ['required', 'image', 'max:10240'],
        ];
    }
}