<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Öffentliche Sicht auf ein Konto. Entspricht publicUser() aus
 * client/src/services/localStore.js, damit das Frontend unverändert bleibt.
 *
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'username' => $this->username,
            'email' => $this->email,
            'name' => $this->name ?: $this->username,
            'role' => $this->role->value,
            'kind' => $this->kind,
            'country' => $this->country,
            'language' => $this->language,
            'newsletter' => $this->newsletter,
            'analysis_reminder' => $this->analysis_reminder,
            'reminder_interval_days' => $this->reminder_interval_days,
            'advisor_id' => $this->advisor_id,
            'password_updated_at' => $this->password_updated_at?->toJSON(),
            'createdAt' => $this->created_at?->toJSON(),
            'lastLoginAt' => $this->last_login_at?->toJSON(),
            'permissionsUpdatedAt' => $this->permissions_updated_at?->toJSON(),
        ];
    }
}
