<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stammdaten der Analysen (Inhalte per AnalysisCatalogSeeder), siehe docs/schema-analyses.md.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('element_groups', function (Blueprint $table) {
            $table->smallIncrements('id');
            // elements_groups.id aus der alten Datenbank
            $table->unsignedInteger('legacy_id')->nullable()->unique();
            // basis, quantity, nutrients, trace, pollutants, balance-index, growth-index
            $table->string('key', 30)->unique();
            // Übersetzungen {de, en, …}
            $table->json('name');
            $table->boolean('in_quality_index')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('elements', function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->unsignedInteger('legacy_id')->nullable()->unique();
            $table->unsignedSmallInteger('element_group_id');
            // Parameter-Key im Frontend (calcium, kh, ratio-mg-ca, …)
            $table->string('key', 30)->unique();
            $table->string('symbol', 30);
            $table->json('name');
            $table->string('unit', 10)->nullable();
            $table->unsignedTinyInteger('precision')->default(2);
            // Kennzahlen wie Na/Cl oder KH/P, aus anderen Messwerten berechnet
            $table->boolean('is_calculated')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('element_group_id')->references('id')->on('element_groups');
        });

        // Dosierprodukte (alt: supplements)
        Schema::create('products', function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->unsignedInteger('legacy_id')->nullable()->unique();
            $table->string('key', 50)->unique();
            $table->json('name');
            $table->string('unit', 10)->nullable();
            $table->double('max_dose_per_day')->nullable();
            $table->timestamps();
        });

        // Das Paket legt der Barcode fest (icp-oes, icp-basic, icp-ms).
        Schema::create('analysis_packages', function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->string('key', 20)->unique();
            $table->json('name');
            // Ohne Osmose-Auswertung (icp-basic) gibt es keine Kind-Analyse.
            $table->boolean('includes_osmosis')->default(true);
            // analysis_vouchers.analysis_type aus der alten Datenbank
            $table->unsignedTinyInteger('legacy_type')->nullable()->unique();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Die Methode bestimmt das Labor; sie legt Wasserart und Elementumfang fest.
        Schema::create('analysis_methods', function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->string('key', 30)->unique();
            $table->json('name');
            $table->string('water_type', 30);
            // analysis.type aus der alten Datenbank
            $table->unsignedTinyInteger('legacy_type')->nullable()->unique();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Welche Methoden zu welchem Paket passen.
        Schema::create('analysis_package_methods', function (Blueprint $table) {
            $table->unsignedSmallInteger('package_id');
            $table->unsignedSmallInteger('method_id');

            $table->primary(['package_id', 'method_id']);
            $table->foreign('package_id')->references('id')->on('analysis_packages')->cascadeOnDelete();
            $table->foreign('method_id')->references('id')->on('analysis_methods')->cascadeOnDelete();
        });

        // Positivliste: welche Elemente zu einer Methode gehören.
        Schema::create('analysis_method_elements', function (Blueprint $table) {
            $table->unsignedSmallInteger('method_id');
            $table->unsignedSmallInteger('element_id');
            // false = nur anzeigen, nicht bewerten
            $table->boolean('is_evaluated')->default(true);
            // abweichende Nachkommastellen, z. B. 3 bei ICP-MS-Spurenelementen
            $table->unsignedTinyInteger('precision')->nullable();

            $table->primary(['method_id', 'element_id']);
            $table->foreign('method_id')->references('id')->on('analysis_methods')->cascadeOnDelete();
            $table->foreign('element_id')->references('id')->on('elements')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('analysis_method_elements');
        Schema::dropIfExists('analysis_package_methods');
        Schema::dropIfExists('analysis_methods');
        Schema::dropIfExists('analysis_packages');
        Schema::dropIfExists('products');
        Schema::dropIfExists('elements');
        Schema::dropIfExists('element_groups');
    }
};
