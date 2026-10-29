<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('aquariums', function (Blueprint $table) {
            // String statt UUID-Spalte, damit die Demo-Becken ihre Frontend-IDs (demo-…) behalten.
            $table->string('id', 64)->primary();
            // aquariums.id aus der alten Datenbank, Brücke für spätere Importe.
            $table->unsignedInteger('legacy_id')->nullable()->unique();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            // Meerwasser, Süßwasser, Osmosewasser, Meersalz, Aquakultur
            $table->string('water_type', 30)->default('Meerwasser');
            $table->decimal('net_volume', 8, 1)->nullable();
            $table->string('aquarium_type', 100)->nullable();
            $table->string('dimensions', 100)->nullable();
            $table->string('target_mode', 50)->default('ati');
            $table->string('stocking_density', 100)->nullable();
            $table->string('lighting_type', 100)->nullable();
            $table->string('supply_system')->nullable();
            $table->string('supply_mode', 100)->nullable();
            $table->string('supply_line', 100)->nullable();
            $table->unsignedTinyInteger('supply_bottles')->nullable();
            $table->string('supply_product')->nullable();
            $table->boolean('sump')->default(false);
            $table->boolean('refugium')->default(false);
            $table->boolean('skimmer')->default(false);
            $table->string('skimmer_model')->nullable();
            $table->text('notes')->nullable();
            $table->string('image_theme', 30)->default('reef-mixed');
            // Vorerst verkleinertes Foto als Data-URL (wie bisher im Browser), bis es einen Datei-Upload gibt.
            $table->longText('image')->nullable();
            // Optionale Technik-/Pflegeangaben aus dem Formular (Filter, Strömung, Licht, …).
            $table->json('water_details')->nullable();
            $table->string('evaluation_scale_id', 50)->default('ati-standard');
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });

        // Verknüpfte Profile eines Beckens, z. B. seine Osmosequelle. Erlaubte Typen: Aquarium::LINK_TYPES.
        Schema::create('aquarium_links', function (Blueprint $table) {
            $table->id();
            $table->string('aquarium_id', 64);
            $table->string('linked_aquarium_id', 64);
            $table->string('type', 30);
            $table->timestamps();

            $table->unique(['aquarium_id', 'type']);
            $table->index('linked_aquarium_id');
            $table->foreign('aquarium_id')->references('id')->on('aquariums')->cascadeOnDelete();
            // Wird das verknüpfte Profil gelöscht, entfällt nur die Verknüpfung.
            $table->foreign('linked_aquarium_id')->references('id')->on('aquariums')->cascadeOnDelete();
        });

        // Bilder eines Beckens. Übernommene Bilder verweisen vorerst auf Pfade des alten Servers
        // (usercontent/tanks/…); die Dateien selbst folgen mit dem Datei-Upload.
        Schema::create('aquarium_images', function (Blueprint $table) {
            $table->id();
            // pictures.id aus der alten Datenbank
            $table->unsignedBigInteger('legacy_id')->nullable()->unique();
            $table->string('aquarium_id', 64);
            // profile, header oder gallery
            $table->string('type', 20);
            $table->string('path');
            $table->string('thumbnail_path')->nullable();
            $table->timestamps();

            $table->index(['aquarium_id', 'type']);
            $table->foreign('aquarium_id')->references('id')->on('aquariums')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('aquarium_images');
        Schema::dropIfExists('aquarium_links');
        Schema::dropIfExists('aquariums');
    }
};
