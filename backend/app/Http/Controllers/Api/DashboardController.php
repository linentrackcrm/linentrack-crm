<?php
// ═══════════════════════════════════════════════════════════
// DashboardController.php
// ═══════════════════════════════════════════════════════════
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{Lead,Account,Opportunity,Activity,Contract,Campaign};
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $tid = auth()->user()->tenant_id;
        $now = now();

        $pipelineValue = Opportunity::byTenant($tid)->open()->sum('amount');
        $mrr = Contract::byTenant($tid)->active()->sum('monthly_value');
        $leadsThisMonth = Lead::byTenant($tid)->whereMonth('created_at',$now->month)->whereYear('created_at',$now->year)->count();
        $contractsExpiring = Contract::byTenant($tid)->expiringSoon(90)->count();

        $repStats = DB::table('users')
            ->where('users.tenant_id',$tid)->where('users.role','!=','viewer')
            ->leftJoin('leads','leads.assigned_rep_id','=','users.id')
            ->leftJoin('activities','activities.created_by_id','=','users.id')
            ->leftJoin('opportunities',function($j){ $j->on('opportunities.assigned_rep_id','=','users.id')->where('opportunities.stage','closed_won'); })
            ->select('users.id','users.name',
                DB::raw('COUNT(DISTINCT leads.id) as leads_count'),
                DB::raw('COUNT(DISTINCT activities.id) as activities_count'),
                DB::raw('COUNT(DISTINCT opportunities.id) as deals_won'),
                DB::raw('COALESCE(SUM(opportunities.amount),0) as revenue_won'))
            ->groupBy('users.id','users.name')
            ->get()
            ->map(fn($u) => array_merge((array)$u, ['avatar_url'=>"https://ui-avatars.com/api/?name=".urlencode($u->name)."&color=1B4F8A&background=D6E4F0"]));

        $pipelineValue2 = Opportunity::byTenant($tid)->open()
            ->select('stage',DB::raw('SUM(amount) as total_value'),DB::raw('COUNT(*) as count'))
            ->groupBy('stage')->get();

        $alerts = $this->buildAlerts($tid);
        $todaysTasks = Activity::byTenant($tid)->today()->with('account:id,name','createdBy:id,name')->limit(10)->get();

        return response()->json([
            'pipeline_value'       => $pipelineValue,
            'mrr'                  => $mrr,
            'leads_this_month'     => $leadsThisMonth,
            'contracts_expiring'   => $contractsExpiring,
            'pipeline_trend'       => 12,
            'mrr_trend'            => 5,
            'leads_trend'          => 8,
            'rep_stats'            => $repStats,
            'pipeline_by_stage'    => $pipelineValue2,
            'leads_by_source'      => Lead::byTenant($tid)->select('lead_source as label',DB::raw('count(*) as count'))->groupBy('lead_source')->get(),
            'alerts'               => $alerts,
            'todays_tasks'         => $todaysTasks,
        ]);
    }

    public function activityFeed(Request $request): JsonResponse
    {
        $tid = auth()->user()->tenant_id;
        $activities = Activity::byTenant($tid)->with(['createdBy:id,name','account:id,name'])->orderBy('created_at','desc')->limit(20)->get()
            ->map(fn($a) => ['type'=>$a->type,'subject'=>$a->subject,'account_name'=>$a->account?->name,'rep_name'=>$a->createdBy?->name,'created_at'=>$a->created_at]);
        return response()->json($activities);
    }

    public function alerts(Request $request): JsonResponse
    {
        return response()->json($this->buildAlerts(auth()->user()->tenant_id));
    }

    public function forecast(Request $request): JsonResponse
    {
        $tid = auth()->user()->tenant_id;
        $month = $request->month ?? now()->format('Y-m');
        $opps = Opportunity::byTenant($tid)->open()
            ->whereYear('close_date',substr($month,0,4))->whereMonth('close_date',substr($month,5,2))->get();
        return response()->json([
            'month'=>$month,'total_pipeline'=>$opps->sum('amount'),
            'weighted_forecast'=>$opps->sum(fn($o)=>$o->amount*($o->probability/100)),
            'deals_count'=>$opps->count(),
        ]);
    }

    private function buildAlerts(int $tid): array
    {
        $alerts = [];
        $expiring = Contract::byTenant($tid)->expiringSoon(90)->with('account:id,name')->get();
        foreach($expiring as $c) { $alerts[] = ['type'=>'expiring','severity'=>$c->days_until_expiry<=30?'high':'medium','message'=>"{$c->account?->name} contract expires in {$c->days_until_expiry} days",'record_type'=>'contract','record_id'=>$c->id]; }
        $stuck = Opportunity::byTenant($tid)->stuck(14)->with('account:id,name','assignedRep:id,name')->limit(5)->get();
        foreach($stuck as $o) { $alerts[] = ['type'=>'stuck_deal','severity'=>'medium','message'=>"{$o->name} — no activity in ".now()->diffInDays($o->last_activity_at)." days",'record_type'=>'opportunity','record_id'=>$o->id]; }
        $overdue = Activity::byTenant($tid)->overdue()->limit(5)->count();
        if($overdue>0) { $alerts[] = ['type'=>'overdue_activity','severity'=>'medium','message'=>"{$overdue} overdue follow-up tasks"]; }
        $atRisk = Account::byTenant($tid)->atRisk()->count();
        if($atRisk>0) { $alerts[] = ['type'=>'at_risk','severity'=>'high','message'=>"{$atRisk} accounts flagged as at-risk"]; }
        return $alerts;
    }
}
