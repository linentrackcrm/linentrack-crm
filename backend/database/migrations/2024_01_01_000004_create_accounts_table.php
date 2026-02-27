<?php
// database/migrations/2024_01_01_000004_create_accounts_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('assigned_rep_id')->nullable();
            $table->unsignedBigInteger('lead_id')->nullable();
            $table->string('name');
            $table->string('type')->nullable();          // hotel|hospital|restaurant|etc
            $table->string('website')->nullable();
            $table->string('phone')->nullable();
            $table->integer('num_employees')->nullable();
            $table->integer('num_locations')->default(1);
            $table->string('status')->default('active'); // active|inactive|at_risk|churned
            // Service & contract
            $table->decimal('monthly_contract_value', 10, 2)->nullable();
            $table->decimal('annual_contract_value', 10, 2)->nullable();
            $table->date('contract_start_date')->nullable();
            $table->date('contract_end_date')->nullable();
            $table->integer('contract_length_months')->nullable();
            $table->integer('weekly_piece_volume')->nullable();
            $table->string('delivery_frequency')->nullable();
            $table->string('incumbent_supplier')->nullable();
            $table->string('account_source')->nullable();
            // Address
            $table->string('street')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('zip')->nullable();
            $table->string('country')->default('USA');
            // Meta
            $table->json('product_mix')->nullable();
            $table->json('delivery_days')->nullable();
            $table->json('tags')->nullable();
            $table->text('notes')->nullable();
            $table->integer('health_score')->default(100);
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->index(['tenant_id','status']);
        });
    }
    public function down(): void { Schema::dropIfExists('accounts'); }
};
