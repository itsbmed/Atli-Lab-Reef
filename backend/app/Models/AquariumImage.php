<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Bild eines Beckens (profile, header oder gallery). Übernommene Bilder tragen den Pfad des alten Servers.
 */
#[Fillable(['type', 'path', 'thumbnail_path'])]
#[Hidden(['legacy_id'])]
class AquariumImage extends Model
{
    public const TYPES = ['profile', 'header', 'gallery'];

    /**
     * @return BelongsTo<Aquarium, $this>
     */
    public function aquarium(): BelongsTo
    {
        return $this->belongsTo(Aquarium::class);
    }
}
