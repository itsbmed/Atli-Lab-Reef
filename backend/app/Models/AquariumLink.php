<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Verknüpfung eines Beckens mit einem anderen Profil desselben Nutzers (Typ siehe Aquarium::LINK_TYPES).
 */
#[Fillable(['aquarium_id', 'linked_aquarium_id', 'type'])]
class AquariumLink extends Model
{
    /**
     * @return BelongsTo<Aquarium, $this>
     */
    public function aquarium(): BelongsTo
    {
        return $this->belongsTo(Aquarium::class);
    }

    /**
     * @return BelongsTo<Aquarium, $this>
     */
    public function linkedAquarium(): BelongsTo
    {
        return $this->belongsTo(Aquarium::class, 'linked_aquarium_id');
    }
}
