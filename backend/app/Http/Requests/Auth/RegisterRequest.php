<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public const COUNTRIES = ['DE', 'AT', 'CH', 'US', 'GB'];

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'username' => [
                'required', 'string', 'min:3', 'max:50', 'regex:/^[A-Za-z0-9._-]+$/',
                function (string $attribute, mixed $value, Closure $fail) {
                    if (User::usernameTaken($value)) {
                        $fail('Benutzername oder E-Mail ist bereits vergeben.');
                    }
                },
            ],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'in:'.implode(',', self::COUNTRIES)],
            'newsletter' => ['sometimes', 'boolean'],
            'analysis_reminder' => ['sometimes', 'boolean'],
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
            'password.required' => 'Bitte geben Sie ein Passwort an.',
            'password.min' => 'Das Passwort muss mindestens 8 Zeichen lang sein.',
            'country.in' => 'Dieses Land wird nicht unterstützt.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'username' => is_string($this->username) ? trim($this->username) : $this->username,
            'email' => is_string($this->email) ? mb_strtolower(trim($this->email)) : $this->email,
        ]);
    }
}
