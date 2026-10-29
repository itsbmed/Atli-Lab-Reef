<?php

namespace Database\Seeders;

use App\Models\Aquarium;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demo-Aquarien des Bestandskunden „kunde“ aus client/src/services/aquariumStore.js.
 * Die IDs bleiben gleich, damit die Demo-Analysen im Frontend ihre Becken weiter finden.
 * Osmosequellen stehen vor den Becken, die auf sie verweisen (links.osmosis_source).
 */
class DemoAquariumSeeder extends Seeder
{
    private const OWNER = 'kunde';

    private const AQUARIUMS = [
        ['id' => 'demo-aquarium-neu-osmose', 'name' => 'Aquarium Neu · Osmose', 'water_type' => 'Osmosewasser', 'notes' => 'Osmoseprobe aus dem ATI-Originalbericht 394463.', 'image_theme' => 'osmosis', 'water_details' => ['resin_filter' => true]],
        ['id' => 'demo-aquarium-neu', 'name' => 'Aquarium Neu', 'net_volume' => 1400, 'notes' => 'Reales Aquarium aus dem ATI-Originalbericht 394463.', 'links' => ['osmosis_source' => 'demo-aquarium-neu-osmose']],
        ['id' => 'demo-grosses-becken-500l', 'name' => 'Grosses Becken 500L', 'net_volume' => 500, 'notes' => 'Reales Aquarium aus dem ATI-Originalbericht 394527.'],
        ['id' => 'demo-meerwasser-xxl-osmose', 'name' => 'Meerwasser xxl · Osmose', 'water_type' => 'Osmosewasser', 'notes' => 'Osmoseprobe aus dem ATI-Originalbericht 394091.', 'image_theme' => 'osmosis', 'water_details' => ['resin_filter' => true]],
        ['id' => 'demo-meerwasser-xxl', 'name' => 'Meerwasser xxl', 'net_volume' => 625, 'notes' => 'Reales Aquarium aus dem ATI-Originalbericht 394091.', 'links' => ['osmosis_source' => 'demo-meerwasser-xxl-osmose']],
        ['id' => 'demo-meerwasser-55', 'name' => 'Meerwasser55', 'net_volume' => 574, 'notes' => 'Reales Aquarium aus dem ATI-Originalbericht 394456.'],
        ['id' => 'demo-wolfis-aquarium-500-osmose', 'name' => 'Wolfis Aquarium 500 · Osmose', 'water_type' => 'Osmosewasser', 'notes' => 'Osmoseprobe aus dem ATI-Originalbericht 394515.', 'image_theme' => 'osmosis', 'water_details' => ['resin_filter' => true]],
        ['id' => 'demo-wolfis-aquarium-500', 'name' => 'Wolfis Aquarium 500', 'net_volume' => 575, 'notes' => 'Reales Aquarium aus dem ATI-Originalbericht 394515.', 'links' => ['osmosis_source' => 'demo-wolfis-aquarium-500-osmose']],
        ['id' => 'demo-mias-reef', 'name' => "Mia's Reef", 'net_volume' => 208, 'notes' => 'Reales Aquarium aus dem ATI-Originalbericht 392933.'],
        ['id' => 'demo-red-sea-nano-osmose', 'name' => 'Red Sea Nano Test Flawil · Osmose', 'water_type' => 'Osmosewasser', 'notes' => 'Osmoseprobe aus dem ATI-Originalbericht 393984.', 'image_theme' => 'osmosis', 'water_details' => ['resin_filter' => true]],
        ['id' => 'demo-red-sea-nano', 'name' => 'Red Sea Nano Test Flawil', 'net_volume' => 75, 'notes' => 'Reales Aquarium aus dem ATI-Originalbericht 393984.', 'image_theme' => 'reef-nano', 'links' => ['osmosis_source' => 'demo-red-sea-nano-osmose']],
        ['id' => 'demo-nanoriff-osmose', 'name' => 'NanoRiff · Osmose', 'water_type' => 'Osmosewasser', 'notes' => 'Osmoseprobe aus dem ATI-Originalbericht 394949.', 'image_theme' => 'osmosis', 'water_details' => ['resin_filter' => true]],
        ['id' => 'demo-nanoriff', 'name' => 'NanoRiff', 'net_volume' => 375, 'notes' => 'Reales Aquarium aus dem ATI-Originalbericht 394949.', 'image_theme' => 'reef-nano', 'links' => ['osmosis_source' => 'demo-nanoriff-osmose']],
        ['id' => 'demo-nyos-opus-g2-440', 'name' => 'Nyos Opus G2 440 LPS', 'net_volume' => 378, 'aquarium_type' => 'LPS', 'notes' => 'Reales Aquarium aus dem ATI-Originalbericht 394770.'],
    ];

    public function run(): void
    {
        $owner = User::firstWhere('username', self::OWNER);
        if (! $owner) {
            return;
        }

        // Anlegezeit in Listenreihenfolge, damit die Becken wie im Frontend sortiert erscheinen.
        $createdAt = now()->subMinutes(count(self::AQUARIUMS));

        foreach (self::AQUARIUMS as $demo) {
            $aquarium = Aquarium::firstOrNew(['id' => $demo['id']]);
            $aquarium->fill([
                'water_type' => 'Meerwasser', 'net_volume' => null, 'image_theme' => 'reef-mixed', 'water_details' => null,
                ...collect($demo)->except(['id', 'links'])->all(),
            ]);
            $aquarium->user_id = $owner->id;
            if (! $aquarium->exists) {
                $aquarium->created_at = $createdAt->addMinute()->copy();
            }
            $aquarium->save();
            $aquarium->syncLinks($demo['links'] ?? []);
        }
    }
}
