<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Barcodes, Analysen und Messwerte, siehe docs/schema-analyses.md.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('vouchers', function (Blueprint $table) {
            $table->id();
            // analysis_vouchers.id aus der alten Datenbank
            $table->unsignedInteger('legacy_id')->nullable()->unique();
            // XXXX-XXXX-XXXX-XXXX, Großbuchstaben
            $table->string('code', 19)->unique();
            $table->unsignedSmallInteger('package_id');
            $table->boolean('is_free')->default(false);
            // analysis_vouchers.analysis_sub_type, Bedeutung unbekannt
            $table->integer('legacy_sub_type')->nullable();
            $table->timestamps();

            $table->foreign('package_id')->references('id')->on('analysis_packages');
        });

        Schema::create('analyses', function (Blueprint $table) {
            // String wie aquariums.id, damit Demo-IDs möglich bleiben.
            $table->string('id', 64)->primary();
            // analysis.id aus der alten Datenbank
            $table->unsignedInteger('legacy_id')->nullable()->unique();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            // Berichte bleiben erhalten, wenn das Becken gelöscht wird.
            $table->string('aquarium_id', 64)->nullable();
            $table->string('aquarium_name', 120);
            // Eingelöster Barcode; unique verhindert doppeltes Einlösen. Null bei Kind-Analysen.
            $table->foreignId('voucher_id')->nullable()->unique()->constrained();
            // Osmose-/Meersalz-Probe → Hauptanalyse
            $table->string('parent_id', 64)->nullable()->index();
            $table->unsignedSmallInteger('package_id')->nullable();
            // null = unbekannt, dann gilt die Wasserart des Beckens
            $table->unsignedSmallInteger('method_id')->nullable();
            // Skala, nach der bewertet wurde (Snapshot in analysis_results)
            $table->string('evaluation_scale_id', 50)->nullable();
            // App\Enums\AnalysisReason
            $table->string('reason', 20)->nullable();
            // App\Enums\AnalysisStatus
            $table->string('status', 20)->default('registered');
            $table->string('language', 5)->nullable();
            $table->text('customer_comment')->nullable();
            $table->text('lab_advice')->nullable();
            $table->decimal('quality_index', 5, 1)->nullable();
            $table->string('share_token', 40)->nullable()->unique();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('analysed_at')->nullable();
            // created_at = Aktivierung
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['aquarium_id', 'analysed_at']);
            $table->foreign('aquarium_id')->references('id')->on('aquariums')->nullOnDelete();
            $table->foreign('parent_id')->references('id')->on('analyses')->cascadeOnDelete();
            $table->foreign('package_id')->references('id')->on('analysis_packages');
            $table->foreign('method_id')->references('id')->on('analysis_methods');
            $table->foreign('evaluation_scale_id')->references('id')->on('evaluation_scales')->nullOnDelete();
        });

        Schema::create('analysis_addons', function (Blueprint $table) {
            $table->string('analysis_id', 64);
            // App\Enums\AnalysisAddon
            $table->string('addon', 20);

            $table->primary(['analysis_id', 'addon']);
            $table->foreign('analysis_id')->references('id')->on('analyses')->cascadeOnDelete();
        });

        // Alle gemessenen Werte, auch solche, die die Methode ausblendet. Ohne timestamps (Millionen Zeilen).
        Schema::create('analysis_results', function (Blueprint $table) {
            $table->string('analysis_id', 64);
            $table->unsignedSmallInteger('element_id');
            // null = unter Nachweisgrenze bzw. nicht messbar
            $table->double('value')->nullable();
            // Snapshot der Bewertung nach analyses.evaluation_scale_id: Stufe 1–9 (5 = optimal),
            // Idealwert und idealer Bereich auf die Salinität der Probe normiert.
            $table->unsignedTinyInteger('band')->nullable();
            $table->float('target')->nullable();
            $table->float('min')->nullable();
            $table->float('max')->nullable();

            $table->primary(['analysis_id', 'element_id']);
            // Zeitreihen je Element
            $table->index(['element_id', 'analysis_id']);
            $table->foreign('analysis_id')->references('id')->on('analyses')->cascadeOnDelete();
            $table->foreign('element_id')->references('id')->on('elements');
        });

        Schema::create('analysis_dosings', function (Blueprint $table) {
            $table->id();
            $table->string('analysis_id', 64);
            $table->unsignedSmallInteger('element_id');
            $table->unsignedSmallInteger('product_id');
            $table->double('amount_per_day');
            $table->unsignedSmallInteger('days');
            // Reihenfolge je Messwert (alt: supplements_id / supplements_id2)
            $table->unsignedTinyInteger('position')->default(1);

            $table->unique(['analysis_id', 'element_id', 'position']);
            $table->foreign(['analysis_id', 'element_id'])->references(['analysis_id', 'element_id'])->on('analysis_results')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products');
        });

        Schema::create('analysis_group_scores', function (Blueprint $table) {
            $table->string('analysis_id', 64);
            $table->unsignedSmallInteger('element_group_id');
            // 0–100
            $table->unsignedTinyInteger('score');

            $table->primary(['analysis_id', 'element_group_id']);
            $table->foreign('analysis_id')->references('id')->on('analyses')->cascadeOnDelete();
            $table->foreign('element_group_id')->references('id')->on('element_groups');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('analysis_group_scores');
        Schema::dropIfExists('analysis_dosings');
        Schema::dropIfExists('analysis_results');
        Schema::dropIfExists('analysis_addons');
        Schema::dropIfExists('analyses');
        Schema::dropIfExists('vouchers');
    }
};
