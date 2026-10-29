<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'username', 'name', 'email', 'password', 'country', 'language',
    'newsletter', 'analysis_reminder', 'reminder_interval_days', 'advisor_id',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    /**
     * Gleiche Standardwerte wie in der Migration, damit neue Modelle sie ohne Reload kennen.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'role' => 'endnutzer',
        'kind' => 'new',
        'country' => 'DE',
        'language' => 'de',
        'newsletter' => false,
        'analysis_reminder' => true,
        'reminder_interval_days' => 90,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'newsletter' => 'boolean',
            'analysis_reminder' => 'boolean',
            'reminder_interval_days' => 'integer',
            'last_login_at' => 'datetime',
            'password_updated_at' => 'datetime',
            'permissions_updated_at' => 'datetime',
        ];
    }

    /**
     * E-Mail-Adressen werden kleingeschrieben gespeichert.
     */
    protected function email(): Attribute
    {
        return Attribute::make(set: fn (string $value) => mb_strtolower(trim($value)));
    }

    /**
     * Benutzername oder E-Mail, ohne Beachtung der Groß-/Kleinschreibung.
     */
    public function scopeWhereLogin(Builder $query, string $login): void
    {
        $needle = mb_strtolower(trim($login));

        $query->where(fn (Builder $q) => $q
            ->whereRaw('LOWER(username) = ?', [$needle])
            ->orWhere('email', $needle));
    }

    /**
     * @return HasMany<Aquarium, $this>
     */
    public function aquariums(): HasMany
    {
        return $this->hasMany(Aquarium::class);
    }

    public static function usernameTaken(string $username, ?string $exceptId = null): bool
    {
        return static::whereRaw('LOWER(username) = ?', [mb_strtolower(trim($username))])
            ->when($exceptId, fn (Builder $q) => $q->whereKeyNot($exceptId))
            ->exists();
    }
}
