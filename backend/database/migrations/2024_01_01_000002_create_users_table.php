<?php
// database/migrations/2024_01_01_000002_create_users_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password');
            $table->string('role')->default('rep');        // admin|manager|rep|viewer
            $table->string('phone')->nullable();
            $table->string('title')->nullable();
            $table->string('territory')->nullable();
            $table->string('avatar')->nullable();
            $table->boolean('is_active')->default(true);
            $table->decimal('quota_monthly', 10, 2)->nullable();
            $table->decimal('quota_annual', 10, 2)->nullable();
            $table->json('preferences')->nullable();
            $table->json('notification_settings')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });
    }
    public function down(): void { Schema::dropIfExists('users'); }
};
