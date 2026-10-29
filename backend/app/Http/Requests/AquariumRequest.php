<?php

namespace App\Http\Requests;

use App\Models\Aquarium;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Anlegen (POST) und Ändern (PATCH) eines Aquariums. Beim Ändern sind alle Felder optional.
 */
class AquariumRequest extends FormRequest
{
    /** Verkleinerte Fotos aus dem Formular liegen deutlich darunter (max. 900 px, JPEG). */
    public const IMAGE_MAX_LENGTH = 3_000_000;

    public const NOTES_MAX_LENGTH = 10_000;

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';
        $text = ['sometimes', 'nullable', 'string', 'max:255'];

        $links = [];
        foreach (Aquarium::LINK_TYPES as $type => $waterType) {
            $links["links.{$type}"] = [
                'nullable', 'string',
                Rule::notIn([$this->route('aquarium')]),
                Rule::exists('aquariums', 'id')
                    ->where('user_id', $this->user()->id)
                    ->where('water_type', $waterType),
            ];
        }

        return [
            ...$links,
            'links' => ['sometimes', 'nullable', 'array:'.implode(',', array_keys(Aquarium::LINK_TYPES))],
            'name' => [$required, 'string', 'max:120'],
            'water_type' => [$required, 'string', Rule::in(Aquarium::WATER_TYPES)],
            'net_volume' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100000'],
            'aquarium_type' => $text,
            'dimensions' => $text,
            'target_mode' => ['sometimes', 'nullable', 'string', 'max:50'],
            'stocking_density' => $text,
            'lighting_type' => $text,
            'supply_system' => $text,
            'supply_mode' => $text,
            'supply_line' => $text,
            'supply_bottles' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:20'],
            'supply_product' => $text,
            'sump' => ['sometimes', 'boolean'],
            'refugium' => ['sometimes', 'boolean'],
            'skimmer' => ['sometimes', 'boolean'],
            'skimmer_model' => $text,
            // Übernommene Beschreibungen aus dem Altsystem sind bis zu gut 6000 Zeichen lang.
            'notes' => ['sometimes', 'nullable', 'string', 'max:'.self::NOTES_MAX_LENGTH],
            'image_theme' => ['sometimes', 'nullable', 'string', 'max:30'],
            'image' => ['sometimes', 'nullable', 'string', 'starts_with:data:image/', 'max:'.self::IMAGE_MAX_LENGTH],
            'water_details' => ['sometimes', 'nullable', 'array'],
            'evaluation_scale_id' => ['sometimes', 'nullable', 'string', 'max:50'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Bitte geben Sie einen Namen für das Aquarium an.',
            'name.max' => 'Der Name darf höchstens 120 Zeichen lang sein.',
            'water_type.required' => 'Bitte wählen Sie eine Wasserart.',
            'water_type.in' => 'Diese Wasserart wird nicht unterstützt.',
            'net_volume.numeric' => 'Bitte geben Sie das Volumen als Zahl an.',
            'net_volume.min' => 'Das Volumen darf nicht negativ sein.',
            'net_volume.max' => 'Das Volumen ist unrealistisch groß.',
            'notes.max' => 'Die Notizen dürfen höchstens 10000 Zeichen lang sein.',
            'image.starts_with' => 'Ungültiges Bild.',
            'image.max' => 'Das Bild ist zu groß.',
            // Spezifische Meldungen vor den allgemeinen – Laravel nimmt den ersten passenden Eintrag.
            'links.osmosis_source.exists' => 'Diese Osmosequelle wurde nicht gefunden.',
            'links.array' => 'Diese Verknüpfung wird nicht unterstützt.',
            'links.*.not_in' => 'Ein Aquarium kann nicht mit sich selbst verknüpft werden.',
            'links.*.exists' => 'Das verknüpfte Profil wurde nicht gefunden.',
        ];
    }

    /**
     * Gesendete Verknüpfungen (Typ => ID oder null); fehlt `links`, bleiben sie unverändert.
     *
     * @return array<string, string|null>
     */
    public function links(): array
    {
        return $this->validated('links') ?? [];
    }

    /**
     * Felder, die der Client leer lässt, auf die Standardwerte der Tabelle zurücksetzen.
     *
     * @return array<string, mixed>
     */
    public function aquariumData(): array
    {
        $data = collect($this->validated())->except('links')->all();

        foreach (['target_mode' => 'ati', 'image_theme' => 'reef-mixed', 'evaluation_scale_id' => 'ati-standard'] as $key => $default) {
            if (array_key_exists($key, $data) && blank($data[$key])) {
                $data[$key] = $default;
            }
        }

        return $data;
    }
}
