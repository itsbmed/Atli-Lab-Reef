<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Empfehlungen: Regeln, Blöcke und Berechnungen (Adminbereich) sowie der ausgewertete
 * Snapshot je Analyse. Siehe docs/schema-recommendations.md.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('recommendation_rules', function (Blueprint $table) {
            $table->id();
            $table->string('key', 50);
            // null = gilt für alle Skalen; gesetzt = ersetzt die globale Regel mit gleichem key
            $table->string('evaluation_scale_id', 50)->nullable();
            $table->string('name', 120);
            // z. B. ["Meerwasser"]; null = alle Wasserarten
            $table->json('water_types')->nullable();
            // null = Hauptanalyse; 'osmose' = mitgeschickte Osmoseprobe
            $table->string('scope_sample', 20)->nullable();
            $table->json('scope_elements')->nullable();
            $table->unsignedSmallInteger('scope_group_id')->nullable();
            $table->string('element_condition', 500)->nullable();
            $table->string('condition', 500)->nullable();
            // Übersetzungen {de, en, …}; de ist Pflicht
            $table->json('kicker')->nullable();
            $table->json('title');
            $table->json('summary');
            $table->json('action')->nullable();
            $table->json('action_label')->nullable();
            $table->json('detail_label')->nullable();
            // high, medium; null = aus der Abweichung
            $table->string('priority', 10)->nullable();
            $table->unsignedSmallInteger('recheck_days')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['key', 'evaluation_scale_id']);
            $table->foreign('evaluation_scale_id')->references('id')->on('evaluation_scales')->cascadeOnDelete();
            $table->foreign('scope_group_id')->references('id')->on('element_groups')->nullOnDelete();
        });

        Schema::create('recommendation_rule_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rule_id')->constrained('recommendation_rules')->cascadeOnDelete();
            // option, detail, tip
            $table->string('type', 10);
            $table->string('condition', 500)->nullable();
            $table->json('label')->nullable();
            $table->json('text');
            $table->json('action')->nullable();
            $table->unsignedSmallInteger('product_id')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->nullOnDelete();
        });

        Schema::create('recommendation_calculations', function (Blueprint $table) {
            $table->id();
            // null = global, in allen Regeln verfügbar
            $table->foreignId('rule_id')->nullable()->constrained('recommendation_rules')->cascadeOnDelete();
            $table->string('name', 40);
            $table->string('expression', 500);
            $table->string('description')->nullable();
            $table->timestamps();

            $table->unique(['rule_id', 'name']);
        });

        Schema::create('analysis_recommendations', function (Blueprint $table) {
            $table->id();
            $table->string('analysis_id', 64);
            // null = vom Labor frei angelegt oder Regel gelöscht
            $table->foreignId('rule_id')->nullable()->constrained('recommendation_rules')->nullOnDelete();
            $table->string('rule_key', 50)->nullable();
            $table->timestamp('rule_version')->nullable();
            // ausgewertet je Sprache
            $table->json('content');
            $table->json('elements');
            $table->string('tone', 10);
            $table->string('priority', 10);
            $table->unsignedSmallInteger('recheck_days')->nullable();
            // Beckenwerte zum Zeitpunkt der Auswertung
            $table->json('inputs');
            $table->boolean('is_edited')->default(false);
            $table->timestamp('completed_at')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['analysis_id', 'sort_order']);
            $table->foreign('analysis_id')->references('id')->on('analyses')->cascadeOnDelete();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->string('image')->nullable()->after('max_dose_per_day');
            // Shop-Link je Sprache
            $table->json('url')->nullable()->after('image');
            $table->json('pack_sizes')->nullable()->after('url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['image', 'url', 'pack_sizes']);
        });
        Schema::dropIfExists('analysis_recommendations');
        Schema::dropIfExists('recommendation_calculations');
        Schema::dropIfExists('recommendation_rule_blocks');
        Schema::dropIfExists('recommendation_rules');
    }
};
