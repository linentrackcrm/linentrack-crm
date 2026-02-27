<?php
// database/migrations/2024_01_01_000006_create_opportunities_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('opportunities', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('assigned_rep_id')->nullable();
            $table->unsignedBigInteger('account_id')->nullable();
            $table->unsignedBigInteger('contact_id')->nullable();
            $table->unsignedBigInteger('lead_id')->nullable();
            $table->unsignedBigInteger('estimate_id')->nullable();
            $table->unsignedBigInteger('contract_id')->nullable();
            $table->unsignedBigInteger('campaign_id')->nullable();
            $table->string('name');
            $table->string('type')->default('new_business'); // new_business|renewal|upsell|win_back
            $table->string('stage')->default('prospecting');
            $table->integer('probability')->default(10);
            $table->date('close_date')->nullable();
            $table->decimal('amount', 10, 2)->nullable();     // Monthly value
            $table->decimal('weighted_amount', 10, 2)->nullable();
            $table->integer('weekly_piece_count')->nullable();
            $table->integer('contract_length')->nullable();   // months
            $table->string('delivery_frequency')->nullable();
            $table->string('forecast_category')->default('pipeline'); // commit|best_case|pipeline|omit
            $table->string('lead_source')->nullable();
            $table->json('product_mix')->nullable();
            $table->json('stage_history')->nullable();        // [{stage,entered_at,exited_at,duration_days}]
            $table->json('tags')->nullable();
            $table->text('notes')->nullable();
            // Close data
            $table->timestamp('closed_at')->nullable();
            $table->string('lost_reason')->nullable();
            $table->text('lost_reason_notes')->nullable();
            $table->string('competitor_won')->nullable();
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('account_id')->references('id')->on('accounts')->onDelete('set null');
            $table->index(['tenant_id','stage']);
            $table->index(['tenant_id','assigned_rep_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('opportunities'); }
};
