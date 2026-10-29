<?php

namespace Database\Factories;

use App\Models\Aquarium;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Aquarium>
 */
class AquariumFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->words(2, true),
            'water_type' => 'Meerwasser',
            'net_volume' => fake()->numberBetween(60, 1500),
        ];
    }

    public function osmosis(): static
    {
        return $this->state(['water_type' => Aquarium::OSMOSIS, 'net_volume' => null, 'image_theme' => 'osmosis']);
    }
}
