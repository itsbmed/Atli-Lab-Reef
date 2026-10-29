<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public const LANGUAGES = ['de', 'en'];

    public const REMINDER_INTERVALS = [30, 60, 90, 180];

    /**
     * Alle Felder optional (PATCH); Rolle und Kontoart sind hier bewusst nicht änderbar.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'username' => [
                'sometimes', 'required', 'string', 'min:3', 'max:50', 'regex:/^[A-Za-z0-9._-]+$/',
                function (string $attribute, mixed $value, Closure $fail) {
                    if (User::usernameTaken($value, $this->user()->id)) {
                        $fail('Benutzername oder E-Mail ist bereits vergeben.');
                    }
                },
            ],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->user()->id)],
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'country' => ['sometimes', 'required', 'string', Rule::in(RegisterRequest::COUNTRIES)],
            'language' => ['sometimes', 'required', 'string', Rule::in(self::LANGUAGES)],
            'newsletter' => ['sometimes', 'boolean'],
            'analysis_reminder' => ['sometimes', 'boolean'],
            'reminder_interval_days' => ['sometimes', 'required', 'integer', Rule::in(self::REMINDER_INTERVALS)],
            'advisor_id' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'username.required' => 'Bitte geben Sie einen Nutzernamen an.',
            'username.min' => 'Der Nutzername muss mindestens 3 Zeichen lang sein.',
            'username.max' => 'Der Nutzername darf höchstens 50 Zeichen lang sein.',
            'username.regex' => 'Der Nutzername darf nur Buchstaben, Ziffern, Punkt, Binde- und Unterstrich enthalten.',
            'email.required' => 'Bitte geben Sie eine E-Mail-Adresse an.',
            'email.email' => 'Bitte geben Sie eine gültige E-Mail-Adresse an.',
            'email.unique' => 'Benutzername oder E-Mail ist bereits vergeben.',
            'country.in' => 'Dieses Land wird nicht unterstützt.',
            'language.in' => 'Diese Sprache wird nicht unterstützt.',
            'reminder_interval_days.in' => 'Dieses Erinnerungsintervall wird nicht unterstützt.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(array_filter([
            'username' => is_string($this->username) ? trim($this->username) : null,
            'email' => is_string($this->email) ? mb_strtolower(trim($this->email)) : null,
            'name' => is_string($this->name) ? trim($this->name) : null,
        ], fn ($value) => $value !== null));
    }
}
