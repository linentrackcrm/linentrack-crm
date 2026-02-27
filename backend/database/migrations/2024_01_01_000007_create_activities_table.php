<?php
// database/migrations/2024_01_01_000007_create_activities_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('created_by_id');
            $table->unsignedBigInteger('assigned_to_id')->nullable();
            $table->unsignedBigInteger('account_id')->nullable();
            $table->unsignedBigInteger('contact_id')->nullable();
            $table->unsignedBigInteger('lead_id')->nullable();
            $table->unsignedBigInteger('opportunity_id')->nullable();
            $table->string('type');       // call|email|meeting|site_visit|demo|task|note
            $table->string('subject');
            $table->text('notes')->nullable();
            $table->string('outcome')->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->boolean('is_completed')->default(false);
            $table->text('next_action')->nullable();
            $table->timestamp('next_action_due_at')->nullable();
            $table->string('location')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('created_by_id')->references('id')->on('users')->onDelete('cascade');
            $table->index(['tenant_id','account_id']);
            $table->index(['tenant_id','lead_id']);
            $table->index(['tenant_id','is_completed','scheduled_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('activities'); }
};
