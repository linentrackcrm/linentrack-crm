<?php
// database/migrations/2024_01_01_000003_create_leads_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('assigned_rep_id')->nullable();
            $table->unsignedBigInteger('campaign_id')->nullable();
            $table->unsignedBigInteger('converted_account_id')->nullable();
            $table->unsignedBigInteger('converted_opportunity_id')->nullable();

            // Contact info
            $table->string('first_name');
            $table->string('last_name');
            $table->string('title')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('mobile')->nullable();
            $table->string('linkedin_url')->nullable();

            // Company info
            $table->string('company');
            $table->string('website')->nullable();
            $table->string('facility_type')->nullable(); // hotel|hospital|restaurant|etc
            $table->integer('estimated_weekly_pieces')->nullable();
            $table->string('delivery_frequency')->nullable(); // weekly|twice_weekly|daily
            $table->integer('num_locations')->default(1);
            $table->string('current_supplier')->nullable();
            $table->date('contract_end_date')->nullable();
            $table->decimal('annual_linen_spend', 10, 2)->nullable();

            // Address
            $table->string('street')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('zip')->nullable();
            $table->string('country')->default('USA');

            // Sales intelligence
            $table->string('lead_source')->nullable();
            $table->integer('lead_score')->default(0);
            $table->string('rating')->default('cold');   // hot|warm|cold
            $table->string('status')->default('new');    // new|qualifying|working|converted|disqualified|nurture
            $table->text('disqualified_reason')->nullable();
            $table->json('product_interests')->nullable();
            $table->json('tags')->nullable();
            $table->text('notes')->nullable();

            // Tracking
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamp('converted_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('assigned_rep_id')->references('id')->on('users')->onDelete('set null');
            $table->index(['tenant_id','status']);
            $table->index(['tenant_id','rating']);
            $table->index(['tenant_id','assigned_rep_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('leads'); }
};
