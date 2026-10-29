<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            ...$data,
            'name' => $data['name'] ?? $data['username'],
            'country' => $data['country'] ?? 'DE',
        ]);

        return $this->sessionResponse($user, now()->addDay(), 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::whereLogin($request->input('login'))->first();

        if (! $user || ! Hash::check($request->input('password'), $user->password)) {
            throw ValidationException::withMessages([
                'login' => 'Benutzername/E-Mail oder Passwort ist falsch.',
            ]);
        }

        // Übernommene Hashes (bcrypt, Kosten 10) beim Login auf die aktuellen Einstellungen heben.
        if (Hash::needsRehash($user->password)) {
            $user->password = $request->input('password');
        }

        $user->forceFill(['last_login_at' => now()])->save();

        $expiresAt = $request->boolean('remember') ? now()->addDays(30) : now()->addDay();

        return $this->sessionResponse($user, $expiresAt);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Abgemeldet.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => new UserResource($request->user())]);
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        if (array_key_exists('name', $data) && blank($data['name'])) {
            $data['name'] = $data['username'] ?? $user->username;
        }

        $user->update($data);

        return response()->json(['user' => new UserResource($user)]);
    }

    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        $user->forceFill([
            'password' => $request->input('new_password'),
            'password_updated_at' => now(),
        ])->save();

        // Andere Geräte abmelden; die aktuelle Session bleibt bestehen.
        $user->tokens()->whereKeyNot($user->currentAccessToken()->getKey())->delete();

        return response()->json(['user' => new UserResource($user)]);
    }

    private function sessionResponse(User $user, Carbon $expiresAt, int $status = 200): JsonResponse
    {
        $token = $user->createToken('web', ['*'], $expiresAt);

        return response()->json([
            'user' => new UserResource($user),
            'token' => $token->plainTextToken,
            'expiresAt' => $expiresAt->toJSON(),
        ], $status);
    }
}
