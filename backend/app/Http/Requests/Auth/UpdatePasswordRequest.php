<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePasswordRequest extends FormRequest
{
    /**
     * Feldnamen wie im Passwort-Formular der Konto-Seite.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'current_password:sanctum'],
            'new_password' => ['required', 'string', 'min:8', 'max:255'],
            'confirm_password' => ['required', 'string', 'same:new_password'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'current_password.required' => 'Bitte geben Sie Ihr aktuelles Passwort an.',
            'current_password.current_password' => 'Aktuelles Passwort ist falsch.',
            'new_password.required' => 'Bitte geben Sie ein neues Passwort an.',
            'new_password.min' => 'Das neue Passwort muss mindestens 8 Zeichen lang sein.',
            'confirm_password.required' => 'Bitte bestätigen Sie das neue Passwort.',
            'confirm_password.same' => 'Die neuen Passwörter stimmen nicht überein.',
        ];
    }
}
