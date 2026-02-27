<?php
// database/migrations/2024_01_01_000008_create_campaigns_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('created_by_id');
            $table->string('name');
            $table->string('type')->default('email');     // email|cold_call_blitz|trade_show|renewal_drive|etc
            $table->string('status')->default('draft');   // draft|active|paused|completed|archived
            $table->text('description')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->decimal('budget', 10, 2)->nullable();
            $table->decimal('actual_cost', 10, 2)->nullable();
            $table->json('target_segment')->nullable();   // {facility_types, min_pieces, territories}
            $table->integer('leads_generated')->default(0);
            $table->integer('emails_sent')->default(0);
            $table->decimal('open_rate', 5, 2)->nullable();
            $table->decimal('click_rate', 5, 2)->nullable();
            $table->decimal('revenue_attributed', 10, 2)->default(0);
            $table->integer('opps_influenced')->default(0);
            $table->json('tags')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('created_by_id')->references('id')->on('users')->onDelete('cascade');
        });

        Schema::create('estimates', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('created_by_id');
            $table->unsignedBigInteger('account_id')->nullable();
            $table->unsignedBigInteger('opportunity_id')->nullable();
            $table->unsignedBigInteger('contact_id')->nullable();
            $table->string('estimate_number')->unique();
            $table->string('status')->default('draft');   // draft|sent|viewed|accepted|declined|expired|converted
            $table->integer('version')->default(1);
            $table->date('valid_until')->nullable();
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->string('discount_type')->default('none'); // none|percentage|fixed
            $table->decimal('discount_value', 8, 2)->default(0);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('delivery_fee', 8, 2)->default(0);
            $table->decimal('fuel_surcharge', 8, 2)->default(0);
            $table->decimal('setup_fee', 8, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('tax_amount', 10, 2)->default(0);
            $table->decimal('total_monthly', 10, 2)->default(0);
            $table->decimal('total_annual', 10, 2)->default(0);
            $table->integer('contract_length')->default(12);  // months
            $table->decimal('term_discount', 5, 2)->default(0);
            $table->text('notes')->nullable();
            $table->text('internal_notes')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('viewed_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->boolean('requires_approval')->default(false);
            $table->unsignedBigInteger('approved_by_id')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('account_id')->references('id')->on('accounts')->onDelete('set null');
        });

        Schema::create('estimate_line_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('estimate_id');
            $table->string('category');                   // fnb|uniforms|terry|bed|mats|healthcare|spa
            $table->string('description');
            $table->integer('weekly_pieces')->default(0);
            $table->integer('monthly_pieces')->default(0);
            $table->decimal('price_per_piece', 8, 4)->default(0);
            $table->decimal('monthly_total', 10, 2)->default(0);
            $table->decimal('annual_total', 10, 2)->default(0);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->foreign('estimate_id')->references('id')->on('estimates')->onDelete('cascade');
        });

        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('account_id')->nullable();
            $table->unsignedBigInteger('opportunity_id')->nullable();
            $table->unsignedBigInteger('estimate_id')->nullable();
            $table->unsignedBigInteger('created_by_id');
            $table->string('contract_number')->unique();
            $table->string('status')->default('draft');   // draft|pending_signature|active|expiring_soon|expired|cancelled
            $table->integer('version')->default(1);
            $table->date('service_start_date')->nullable();
            $table->date('service_end_date')->nullable();
            $table->integer('term_months')->nullable();
            $table->boolean('auto_renew')->default(false);
            $table->integer('renewal_notice_days')->default(90);
            $table->decimal('monthly_value', 10, 2)->default(0);
            $table->decimal('annual_value', 10, 2)->default(0);
            $table->string('price_escalation_type')->default('none'); // none|fixed_percent|cpi
            $table->decimal('price_escalation_rate', 5, 2)->default(0);
            $table->string('delivery_frequency')->nullable();
            $table->json('delivery_days')->nullable();
            $table->json('signers')->nullable();           // [{name,email,role,signed_at}]
            $table->json('amendments')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->timestamp('executed_at')->nullable();
            $table->string('docusign_envelope_id')->nullable();
            $table->string('pdf_url')->nullable();
            $table->string('signed_pdf_url')->nullable();
            $table->integer('cancellation_notice_days')->default(30);
            $table->text('cancellation_reason')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('notes')->nullable();
            $table->text('internal_notes')->nullable();
            $table->json('tags')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('account_id')->references('id')->on('accounts')->onDelete('set null');
            $table->index(['tenant_id','status']);
            $table->index(['tenant_id','service_end_date']);
        });

        Schema::create('contract_line_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('contract_id');
            $table->string('category');
            $table->string('description');
            $table->integer('weekly_pieces')->default(0);
            $table->integer('monthly_pieces')->default(0);
            $table->decimal('price_per_piece', 8, 4)->default(0);
            $table->decimal('monthly_total', 10, 2)->default(0);
            $table->decimal('annual_total', 10, 2)->default(0);
            $table->timestamps();
            $table->foreign('contract_id')->references('id')->on('contracts')->onDelete('cascade');
        });

        // Personal access tokens for Sanctum
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('contract_line_items');
        Schema::dropIfExists('contracts');
        Schema::dropIfExists('estimate_line_items');
        Schema::dropIfExists('estimates');
        Schema::dropIfExists('campaigns');
    }
};
