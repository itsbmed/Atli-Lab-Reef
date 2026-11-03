<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Bewertungsskalen: Idealwerte und Grenzen je Wasserart und Element, global oder pro Kunde.
 */
return new class extends Migration
{
    /** Eingebaute Skalen wie in client/src/services/evaluationScales.js; ati-standard ist der Default der Becken. */
    private const BUILT_IN = [
        'ati-standard' => [
            'name' => ['de' => 'ATI Standard', 'en' => 'ATI standard'],
            'description' => ['de' => 'Referenzbewertung des ATI Labors. Grundlage für alle Berichte ohne eigene Auswahl.'],
        ],
        'nyos' => [
            'name' => ['de' => 'NYOS Reefer', 'en' => 'NYOS Reefer'],
            'description' => ['de' => 'Engere Optimumfenster für Mengenelemente und Nährstoffe nach NYOS Zielwerten.'],
        ],
        'fauna-marin' => [
            'name' => ['de' => 'Fauna Marin', 'en' => 'Fauna Marin'],
            'description' => ['de' => 'Niedrigere Nährstoff- und KH-Zielwerte für ULNS-geführte Systeme.'],
        ],
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('evaluation_scales', function (Blueprint $table) {
            $table->string('id', 50)->primary();
            // null = globale Skala; gesetzt = eigene Zielwerte dieses Kunden
            $table->foreignUuid('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->json('name');
            $table->json('description')->nullable();
            // eingebaute Skalen sind nicht löschbar
            $table->boolean('is_built_in')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Fehlt für ein Element eine Zeile, gilt ati-standard. Alle Werte gelten für 35 PSU.
        Schema::create('evaluation_scale_thresholds', function (Blueprint $table) {
            $table->string('scale_id', 50);
            // Wasserart wie aquariums.water_type; Methoden derselben Wasserart teilen sich die Werte.
            $table->string('water_type', 30);
            $table->unsignedSmallInteger('element_id');
            // Idealwert, auf den der Dosierplan hinkorrigiert
            $table->double('target')->nullable();
            // Stufen 1–9: unter crit_low 1, unter too_low 2, unter low 3, unter min 4,
            // min–max 5, bis increased 6, bis high 7, bis too_high 8, darüber 9. null = keine Grenze.
            $table->double('crit_low')->nullable();
            $table->double('too_low')->nullable();
            $table->double('low')->nullable();
            $table->double('min')->nullable();
            $table->double('max')->nullable();
            $table->double('increased')->nullable();
            $table->double('high')->nullable();
            $table->double('too_high')->nullable();
            $table->timestamps();

            $table->primary(['scale_id', 'water_type', 'element_id']);
            $table->foreign('scale_id')->references('id')->on('evaluation_scales')->cascadeOnDelete();
            $table->foreign('element_id')->references('id')->on('elements')->cascadeOnDelete();
        });

        $now = now();
        $sort = 0;
        DB::table('evaluation_scales')->insert(array_map(fn (string $id, array $scale) => [
            'id' => $id,
            'name' => json_encode($scale['name'], JSON_UNESCAPED_UNICODE),
            'description' => json_encode($scale['description'], JSON_UNESCAPED_UNICODE),
            'is_built_in' => true,
            'sort_order' => $sort += 10,
            'created_at' => $now,
            'updated_at' => $now,
        ], array_keys(self::BUILT_IN), self::BUILT_IN));

        // Bisher freier Text: Werte ohne passende Skala fallen auf den Default zurück.
        DB::table('aquariums')->whereNotIn('evaluation_scale_id', array_keys(self::BUILT_IN))
            ->update(['evaluation_scale_id' => 'ati-standard']);

        Schema::table('aquariums', function (Blueprint $table) {
            // Eigene Skalen setzt die Anwendung vor dem Löschen auf ati-standard zurück.
            $table->foreign('evaluation_scale_id')->references('id')->on('evaluation_scales')->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('aquariums', function (Blueprint $table) {
            $table->dropForeign(['evaluation_scale_id']);
        });
        Schema::dropIfExists('evaluation_scale_thresholds');
        Schema::dropIfExists('evaluation_scales');
    }
};
