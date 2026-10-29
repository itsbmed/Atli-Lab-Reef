<?php

namespace App\Http\Resources;

use App\Models\Aquarium;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Gleiche Form wie die Aquarien im Frontend-Speicher (client/src/services/aquariumStore.js):
 * leere Texte als '', water_details und links immer als Objekt.
 *
 * @mixin Aquarium
 */
class AquariumResource extends JsonResource
{
    private const TEXT_FIELDS = [
        'aquarium_type', 'dimensions', 'stocking_density', 'lighting_type', 'supply_system',
        'supply_mode', 'supply_line', 'supply_product', 'skimmer_model', 'notes',
    ];

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $text = [];
        foreach (self::TEXT_FIELDS as $field) {
            $text[$field] = $this->{$field} ?? '';
        }

        return [
            'id' => $this->id,
            'ownerId' => $this->user_id,
            'name' => $this->name,
            'water_type' => $this->water_type,
            'net_volume' => $this->net_volume,
            'target_mode' => $this->target_mode,
            ...$text,
            'supply_bottles' => $this->supply_bottles,
            'sump' => $this->sump,
            'refugium' => $this->refugium,
            'skimmer' => $this->skimmer,
            'image_theme' => $this->image_theme,
            'image' => $this->image,
            'water_details' => (object) ($this->water_details ?? []),
            // Typ => ID des verknüpften Profils, z. B. { "osmosis_source": "…" }
            'links' => (object) $this->links->pluck('linked_aquarium_id', 'type')->all(),
            'evaluation_scale_id' => $this->evaluation_scale_id,
            'createdAt' => $this->created_at?->toJSON(),
            'updatedAt' => $this->updated_at?->toJSON(),
        ];
    }
}
