<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\{
    AuthController, DashboardController, LeadController,
    AccountController, ContactController, OpportunityController,
    ActivityController, CampaignController, EstimateController,
    ContractController, ReportController, UserController
};

// ── Public Auth ───────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('login',           [AuthController::class, 'login']);
    Route::post('register',        [AuthController::class, 'register']);
    Route::post('forgot-password', fn() => response()->json(['message' => 'Reset link sent (configure mail to enable)']));
});

// ── Protected Routes ──────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    Route::prefix('auth')->group(function () {
        Route::post('logout',   [AuthController::class, 'logout']);
        Route::get('me',        [AuthController::class, 'me']);
        Route::put('profile',   [AuthController::class, 'updateProfile']);
    });

    // Dashboard
    Route::prefix('dashboard')->group(function () {
        Route::get('summary',       [DashboardController::class, 'summary']);
        Route::get('activity-feed', [DashboardController::class, 'activityFeed']);
        Route::get('alerts',        [DashboardController::class, 'alerts']);
        Route::get('forecast',      [DashboardController::class, 'forecast']);
    });

    // Leads
    Route::prefix('leads')->group(function () {
        Route::get('stats',          [LeadController::class, 'stats']);
        Route::post('{id}/convert',  [LeadController::class, 'convert']);
    });
    Route::apiResource('leads', LeadController::class);

    // Accounts
    Route::prefix('accounts')->group(function () {
        Route::get('renewals/upcoming', [AccountController::class, 'upcomingRenewals']);
        Route::get('at-risk',           [AccountController::class, 'atRisk']);
        Route::get('{id}/timeline',     [AccountController::class, 'timeline']);
    });
    Route::apiResource('accounts', AccountController::class);

    // Contacts
    Route::get('accounts/{accountId}/contacts', [ContactController::class, 'byAccount']);
    Route::apiResource('contacts', ContactController::class);

    // Pipeline / Opportunities
    Route::prefix('opportunities')->group(function () {
        Route::get('kanban',         [OpportunityController::class, 'kanban']);
        Route::get('forecast',       [OpportunityController::class, 'forecast']);
        Route::get('stuck',          [OpportunityController::class, 'stuck']);
        Route::patch('{id}/stage',   [OpportunityController::class, 'updateStage']);
        Route::patch('{id}/close-won',  [OpportunityController::class, 'closeWon']);
        Route::patch('{id}/close-lost', [OpportunityController::class, 'closeLost']);
    });
    Route::apiResource('opportunities', OpportunityController::class);

    // Activities
    Route::prefix('activities')->group(function () {
        Route::get('today',          [ActivityController::class, 'today']);
        Route::get('overdue',        [ActivityController::class, 'overdue']);
        Route::patch('{id}/complete',[ActivityController::class, 'markComplete']);
    });
    Route::apiResource('activities', ActivityController::class);

    // Campaigns
    Route::prefix('campaigns')->group(function () {
        Route::post('{id}/launch',   [CampaignController::class, 'launch']);
        Route::post('{id}/pause',    [CampaignController::class, 'pause']);
        Route::get('{id}/stats',     [CampaignController::class, 'stats']);
    });
    Route::apiResource('campaigns', CampaignController::class);

    // Estimates
    Route::prefix('estimates')->group(function () {
        Route::get('rate-card',       [EstimateController::class, 'rateCard']);
        Route::put('rate-card',       [EstimateController::class, 'updateRateCard']);
        Route::post('{id}/send',      [EstimateController::class, 'send']);
        Route::post('{id}/approve',   [EstimateController::class, 'approve']);
        Route::post('{id}/convert',   [EstimateController::class, 'convertToContract']);
        Route::post('{id}/duplicate', [EstimateController::class, 'duplicate']);
    });
    Route::apiResource('estimates', EstimateController::class);

    // Contracts
    Route::prefix('contracts')->group(function () {
        Route::get('expiring',        [ContractController::class, 'expiring']);
        Route::get('templates',       [ContractController::class, 'templates']);
        Route::post('{id}/send',      [ContractController::class, 'sendForSignature']);
        Route::post('{id}/void',      [ContractController::class, 'void']);
        Route::post('{id}/amend',     [ContractController::class, 'amend']);
        Route::post('{id}/cancel',    [ContractController::class, 'cancel']);
        Route::post('{id}/renew',     [ContractController::class, 'initateRenewal']);
    });
    Route::apiResource('contracts', ContractController::class);

    // Reports
    Route::prefix('reports')->group(function () {
        Route::get('sales-performance', [ReportController::class, 'salesPerformance']);
        Route::get('revenue',           [ReportController::class, 'revenue']);
        Route::get('rep-leaderboard',   [ReportController::class, 'repLeaderboard']);
    });

    // Users / Team
    Route::apiResource('users', UserController::class);
});
