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
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('username', 50)->unique();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('role', 20)->default('endnutzer')->index();
            // Dashboard-Variante im Frontend: 'new' = Einrichtung, 'full' = mit Daten.
            $table->string('kind', 10)->default('new');
            $table->char('country', 2)->default('DE');
            $table->string('language', 5)->default('de');
            $table->boolean('newsletter')->default(false);
            $table->boolean('analysis_reminder')->default(true);
            $table->unsignedSmallInteger('reminder_interval_days')->default(90);
            // Händler-Freigabe; Verknüpfung folgt mit den Händler-Endpunkten.
            $table->string('advisor_id')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamp('password_updated_at')->nullable();
            $table->timestamp('permissions_updated_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignUuid('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
