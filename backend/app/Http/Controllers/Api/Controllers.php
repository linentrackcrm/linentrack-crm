<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{Lead,Account,Contact,Opportunity,Activity,Campaign,Estimate,EstimateLineItem,Contract,ContractLineItem,User};
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// ═══════════════════════════════════════════════════════════
// LEAD CONTROLLER
// ═══════════════════════════════════════════════════════════
class LeadController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Lead::byTenant(auth()->user()->tenant_id)->with(['assignedRep:id,name']);
        if($request->status)        $q->where('status',$request->status);
        if($request->rating)        $q->where('rating',$request->rating);
        if($request->rep_id)        $q->where('assigned_rep_id',$request->rep_id);
        if($request->facility_type) $q->where('facility_type',$request->facility_type);
        if($request->lead_source)   $q->where('lead_source',$request->lead_source);
        if($request->search) { $s=$request->search; $q->where(fn($x)=>$x->where('first_name','like',"%$s%")->orWhere('last_name','like',"%$s%")->orWhere('company','like',"%$s%")->orWhere('email','like',"%$s%")); }
        $q->orderBy($request->sort_by??'created_at',$request->sort_dir??'desc');
        return response()->json($q->paginate($request->per_page??25));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name'=>'required|string|max:100','last_name'=>'required|string|max:100',
            'email'=>'nullable|email','phone'=>'nullable|string','mobile'=>'nullable|string',
            'title'=>'nullable|string','company'=>'required|string|max:200','website'=>'nullable|string',
            'facility_type'=>'nullable|string','estimated_weekly_pieces'=>'nullable|integer',
            'num_locations'=>'nullable|integer','current_supplier'=>'nullable|string',
            'contract_end_date'=>'nullable|date','lead_source'=>'nullable|string',
            'assigned_rep_id'=>'nullable|integer','notes'=>'nullable|string',
            'street'=>'nullable|string','city'=>'nullable|string','state'=>'nullable|string','zip'=>'nullable|string',
        ]);
        $lead = Lead::create(array_merge($data,['tenant_id'=>auth()->user()->tenant_id,'status'=>Lead::STATUS_NEW,'last_activity_at'=>now()]));
        $lead->lead_score = $lead->calculateScore();
        $lead->rating = $lead->lead_score>=70?'hot':($lead->lead_score>=40?'warm':'cold');
        $lead->save();
        return response()->json($lead->fresh(['assignedRep']),201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Lead::byTenant(auth()->user()->tenant_id)->with(['assignedRep','activities.createdBy','campaign'])->findOrFail($id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $lead = Lead::byTenant(auth()->user()->tenant_id)->findOrFail($id);
        $lead->update($request->except(['tenant_id']));
        $lead->lead_score = $lead->calculateScore();
        $lead->rating = $lead->lead_score>=70?'hot':($lead->lead_score>=40?'warm':'cold');
        $lead->save();
        return response()->json($lead->fresh(['assignedRep']));
    }

    public function destroy(int $id): JsonResponse
    {
        Lead::byTenant(auth()->user()->tenant_id)->findOrFail($id)->delete();
        return response()->json(['message'=>'Lead deleted']);
    }

    public function convert(Request $request, int $id): JsonResponse
    {
        $lead = Lead::byTenant(auth()->user()->tenant_id)->findOrFail($id);
        if($lead->status===Lead::STATUS_CONVERTED) return response()->json(['error'=>'Already converted'],422);

        DB::transaction(function() use($lead,$request) {
            $account = Account::create(['tenant_id'=>$lead->tenant_id,'assigned_rep_id'=>$lead->assigned_rep_id,'name'=>$lead->company,'type'=>$lead->facility_type,'phone'=>$lead->phone,'website'=>$lead->website,'num_locations'=>$lead->num_locations,'weekly_piece_volume'=>$lead->estimated_weekly_pieces,'incumbent_supplier'=>$lead->current_supplier,'account_source'=>$lead->lead_source,'lead_id'=>$lead->id,'status'=>'active','street'=>$lead->street,'city'=>$lead->city,'state'=>$lead->state,'zip'=>$lead->zip]);
            $contact = Contact::create(['tenant_id'=>$lead->tenant_id,'account_id'=>$account->id,'first_name'=>$lead->first_name,'last_name'=>$lead->last_name,'title'=>$lead->title,'email'=>$lead->email,'phone'=>$lead->phone,'mobile'=>$lead->mobile,'role'=>'decision_maker','is_primary'=>true]);
            $opp = Opportunity::create(['tenant_id'=>$lead->tenant_id,'assigned_rep_id'=>$lead->assigned_rep_id,'account_id'=>$account->id,'contact_id'=>$contact->id,'lead_id'=>$lead->id,'name'=>$account->name.' — New Account','type'=>'new_business','stage'=>'qualified','probability'=>25,'weekly_piece_count'=>$lead->estimated_weekly_pieces,'close_date'=>now()->addDays(60)->format('Y-m-d'),'lead_source'=>$lead->lead_source,'last_activity_at'=>now(),'stage_history'=>json_encode([['stage'=>'qualified','entered_at'=>now()->toISOString()]])]);
            $lead->update(['status'=>Lead::STATUS_CONVERTED,'converted_at'=>now(),'converted_account_id'=>$account->id,'converted_opportunity_id'=>$opp->id]);
        });
        return response()->json(['message'=>'Lead converted successfully','account_id'=>$lead->fresh()->converted_account_id,'opportunity_id'=>$lead->fresh()->converted_opportunity_id]);
    }

    public function stats(Request $request): JsonResponse
    {
        $tid = auth()->user()->tenant_id;
        return response()->json([
            'total'=>Lead::byTenant($tid)->count(),'new'=>Lead::byTenant($tid)->where('status','new')->count(),
            'working'=>Lead::byTenant($tid)->where('status','working')->count(),
            'converted'=>Lead::byTenant($tid)->where('status','converted')->count(),
            'hot'=>Lead::byTenant($tid)->where('rating','hot')->count(),
            'overdue'=>Lead::byTenant($tid)->overdue(7)->count(),
            'avg_score'=>round(Lead::byTenant($tid)->active()->avg('lead_score'),1),
        ]);
    }
}

// ═══════════════════════════════════════════════════════════
// ACCOUNT CONTROLLER
// ═══════════════════════════════════════════════════════════
class AccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Account::byTenant(auth()->user()->tenant_id)->with(['assignedRep:id,name','primaryContact']);
        if($request->status) $q->where('status',$request->status);
        if($request->type)   $q->where('type',$request->type);
        if($request->search) { $s=$request->search; $q->where(fn($x)=>$x->where('name','like',"%$s%")->orWhere('city','like',"%$s%")); }
        return response()->json($q->orderBy('name')->paginate($request->per_page??25));
    }
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['name'=>'required|string|max:200','type'=>'nullable|string','phone'=>'nullable|string','website'=>'nullable|string','street'=>'nullable|string','city'=>'nullable|string','state'=>'nullable|string','zip'=>'nullable|string','assigned_rep_id'=>'nullable|integer','notes'=>'nullable|string','status'=>'nullable|string']);
        $account = Account::create(array_merge($data,['tenant_id'=>auth()->user()->tenant_id,'last_activity_at'=>now()]));
        return response()->json($account->fresh(['assignedRep']),201);
    }
    public function show(int $id): JsonResponse { return response()->json(Account::byTenant(auth()->user()->tenant_id)->with(['assignedRep','contacts','opportunities','contracts','estimates'])->findOrFail($id)); }
    public function update(Request $request, int $id): JsonResponse { $a=Account::byTenant(auth()->user()->tenant_id)->findOrFail($id); $a->update($request->except(['tenant_id'])); return response()->json($a->fresh()); }
    public function destroy(int $id): JsonResponse { Account::byTenant(auth()->user()->tenant_id)->findOrFail($id)->delete(); return response()->json(['message'=>'Account deleted']); }
    public function timeline(int $id): JsonResponse { $a=Account::byTenant(auth()->user()->tenant_id)->findOrFail($id); $activities=$a->activities()->with('createdBy:id,name')->orderBy('created_at','desc')->limit(30)->get(); return response()->json($activities); }
    public function upcomingRenewals(Request $request): JsonResponse { return response()->json(Account::byTenant(auth()->user()->tenant_id)->renewalDue($request->days??90)->with('assignedRep:id,name')->orderBy('contract_end_date')->get()); }
    public function atRisk(): JsonResponse { return response()->json(Account::byTenant(auth()->user()->tenant_id)->atRisk()->with('assignedRep:id,name')->get()); }
}

// ═══════════════════════════════════════════════════════════
// CONTACT CONTROLLER
// ═══════════════════════════════════════════════════════════
class ContactController extends Controller
{
    public function index(Request $request): JsonResponse { return response()->json(Contact::byTenant(auth()->user()->tenant_id)->with('account:id,name')->orderBy('last_name')->paginate($request->per_page??25)); }
    public function store(Request $request): JsonResponse { $c=Contact::create(array_merge($request->validate(['account_id'=>'required|integer','first_name'=>'required|string','last_name'=>'required|string','title'=>'nullable|string','email'=>'nullable|email','phone'=>'nullable|string','role'=>'nullable|string','is_primary'=>'nullable|boolean','notes'=>'nullable|string']),['tenant_id'=>auth()->user()->tenant_id])); return response()->json($c,201); }
    public function show(int $id): JsonResponse { return response()->json(Contact::byTenant(auth()->user()->tenant_id)->with('account:id,name')->findOrFail($id)); }
    public function update(Request $request, int $id): JsonResponse { $c=Contact::byTenant(auth()->user()->tenant_id)->findOrFail($id); $c->update($request->except(['tenant_id','account_id'])); return response()->json($c->fresh()); }
    public function destroy(int $id): JsonResponse { Contact::byTenant(auth()->user()->tenant_id)->findOrFail($id)->delete(); return response()->json(['message'=>'Contact deleted']); }
    public function byAccount(int $accountId): JsonResponse { return response()->json(Contact::byTenant(auth()->user()->tenant_id)->where('account_id',$accountId)->orderBy('is_primary','desc')->get()); }
}

// ═══════════════════════════════════════════════════════════
// OPPORTUNITY CONTROLLER
// ═══════════════════════════════════════════════════════════
class OpportunityController extends Controller
{
    public function kanban(Request $request): JsonResponse
    {
        $tid = auth()->user()->tenant_id;
        $q = Opportunity::byTenant($tid)->open()->with(['account:id,name,type','assignedRep:id,name']);
        if($request->rep_id) $q->byRep($request->rep_id);
        if($request->type)   $q->where('type',$request->type);
        $opps = $q->get();
        $board = [];
        foreach(Opportunity::STAGES as $stageKey=>$stageMeta) {
            if(in_array($stageKey,['closed_won','closed_lost'])) continue;
            $stageOpps = $opps->where('stage',$stageKey)->values();
            $board[] = ['id'=>$stageKey,'label'=>$stageMeta['label'],'order'=>$stageMeta['order'],'probability'=>$stageMeta['probability'],'count'=>$stageOpps->count(),'total_value'=>$stageOpps->sum('amount'),'weighted_value'=>$stageOpps->sum(fn($o)=>$o->amount*($o->probability/100)),'items'=>$stageOpps->map(fn($o)=>$this->formatCard($o))];
        }
        return response()->json(['board'=>$board,'summary'=>['total_pipeline'=>$opps->sum('amount'),'weighted_pipeline'=>$opps->sum(fn($o)=>$o->amount*($o->probability/100)),'total_deals'=>$opps->count(),'stuck_deals'=>$opps->filter(fn($o)=>$o->health_score==='red')->count()]]);
    }

    public function index(Request $request): JsonResponse
    {
        $q = Opportunity::byTenant(auth()->user()->tenant_id)->with(['account:id,name','assignedRep:id,name']);
        if($request->stage)  $q->byStage($request->stage);
        if($request->rep_id) $q->byRep($request->rep_id);
        if($request->open)   $q->open();
        return response()->json($q->orderBy('created_at','desc')->paginate($request->per_page??25));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['name'=>'required|string|max:255','account_id'=>'nullable|integer','stage'=>'nullable|string','amount'=>'nullable|numeric','close_date'=>'nullable|date','type'=>'nullable|string','weekly_piece_count'=>'nullable|integer','assigned_rep_id'=>'nullable|integer','notes'=>'nullable|string']);
        $stage = $data['stage']??Opportunity::STAGE_PROSPECTING;
        $opp = Opportunity::create(array_merge($data,['tenant_id'=>auth()->user()->tenant_id,'assigned_rep_id'=>$data['assigned_rep_id']??auth()->id(),'stage'=>$stage,'probability'=>Opportunity::STAGES[$stage]['probability'],'last_activity_at'=>now(),'stage_history'=>json_encode([['stage'=>$stage,'entered_at'=>now()->toISOString()]])]));
        return response()->json($opp->fresh(['account','assignedRep']),201);
    }

    public function show(int $id): JsonResponse { return response()->json(Opportunity::byTenant(auth()->user()->tenant_id)->with(['account','assignedRep','activities.createdBy','estimate','contract'])->findOrFail($id)); }
    public function update(Request $request, int $id): JsonResponse { $o=Opportunity::byTenant(auth()->user()->tenant_id)->findOrFail($id); $o->update($request->except(['tenant_id','stage'])); return response()->json($o->fresh()); }
    public function destroy(int $id): JsonResponse { Opportunity::byTenant(auth()->user()->tenant_id)->findOrFail($id)->delete(); return response()->json(['message'=>'Opportunity deleted']); }

    public function updateStage(Request $request, int $id): JsonResponse
    {
        $request->validate(['stage'=>'required|string|in:'.implode(',',array_keys(Opportunity::STAGES))]);
        $opp = Opportunity::byTenant(auth()->user()->tenant_id)->findOrFail($id);
        $oldStage = $opp->stage;
        $history = $opp->stage_history??[];
        foreach($history as &$h) { if($h['stage']===$opp->stage&&!isset($h['exited_at'])) { $h['exited_at']=now()->toISOString(); $h['duration_days']=(int)now()->diffInDays($h['entered_at']); } }
        $history[] = ['stage'=>$request->stage,'entered_at'=>now()->toISOString()];
        $opp->update(['stage'=>$request->stage,'probability'=>Opportunity::STAGES[$request->stage]['probability'],'stage_history'=>$history,'last_activity_at'=>now()]);
        Activity::create(['tenant_id'=>$opp->tenant_id,'created_by_id'=>auth()->id(),'opportunity_id'=>$opp->id,'account_id'=>$opp->account_id,'type'=>'note','subject'=>"Stage: {$oldStage} → {$request->stage}",'is_completed'=>true,'completed_at'=>now()]);
        return response()->json($opp->fresh(['account','assignedRep']));
    }

    public function closeWon(Request $request, int $id): JsonResponse { $o=Opportunity::byTenant(auth()->user()->tenant_id)->findOrFail($id); $o->update(['stage'=>Opportunity::STAGE_WON,'probability'=>100,'closed_at'=>now()]); return response()->json($o->fresh()); }
    public function closeLost(Request $request, int $id): JsonResponse { $request->validate(['lost_reason'=>'required|string']); $o=Opportunity::byTenant(auth()->user()->tenant_id)->findOrFail($id); $o->update(['stage'=>Opportunity::STAGE_LOST,'probability'=>0,'closed_at'=>now(),'lost_reason'=>$request->lost_reason,'lost_reason_notes'=>$request->notes,'competitor_won'=>$request->competitor_won]); return response()->json($o->fresh()); }
    public function stuck(Request $request): JsonResponse { return response()->json(Opportunity::byTenant(auth()->user()->tenant_id)->stuck($request->days??14)->with(['account:id,name','assignedRep:id,name'])->orderBy('last_activity_at','asc')->get()); }
    public function forecast(Request $request): JsonResponse { $tid=auth()->user()->tenant_id; $m=$request->month??now()->format('Y-m'); $opps=Opportunity::byTenant($tid)->open()->whereYear('close_date',substr($m,0,4))->whereMonth('close_date',substr($m,5,2))->get(); return response()->json(['month'=>$m,'total_pipeline'=>$opps->sum('amount'),'weighted_forecast'=>$opps->sum(fn($o)=>$o->amount*($o->probability/100)),'deals_count'=>$opps->count()]); }

    private function formatCard(Opportunity $o): array { return ['id'=>$o->id,'name'=>$o->name,'account_id'=>$o->account_id,'account_name'=>$o->account?->name??'','account_type'=>$o->account?->type??'','amount'=>$o->amount,'weekly_pieces'=>$o->weekly_piece_count,'close_date'=>$o->close_date?->format('Y-m-d'),'health_score'=>$o->health_score,'probability'=>$o->probability,'rep'=>$o->assignedRep?['id'=>$o->assignedRep->id,'name'=>$o->assignedRep->name,'avatar'=>$o->assignedRep->avatar_url]:null,'last_activity_at'=>$o->last_activity_at?->toISOString(),'type'=>$o->type,'estimate_id'=>$o->estimate_id,'contract_id'=>$o->contract_id,'tags'=>$o->tags??[]]; }
}

// ═══════════════════════════════════════════════════════════
// ACTIVITY CONTROLLER
// ═══════════════════════════════════════════════════════════
class ActivityController extends Controller
{
    public function index(Request $request): JsonResponse { $q=Activity::byTenant(auth()->user()->tenant_id)->with(['createdBy:id,name','account:id,name','lead:id,first_name,last_name']); if($request->type) $q->where('type',$request->type); if($request->account_id) $q->where('account_id',$request->account_id); if($request->lead_id) $q->where('lead_id',$request->lead_id); return response()->json($q->orderBy('scheduled_at','desc')->paginate($request->per_page??25)); }
    public function store(Request $request): JsonResponse { $data=$request->validate(['type'=>'required|string','subject'=>'required|string','account_id'=>'nullable|integer','lead_id'=>'nullable|integer','opportunity_id'=>'nullable|integer','contact_id'=>'nullable|integer','notes'=>'nullable|string','outcome'=>'nullable|string','duration_minutes'=>'nullable|integer','scheduled_at'=>'nullable|date','is_completed'=>'nullable|boolean','next_action'=>'nullable|string','next_action_due_at'=>'nullable|date']); $act=Activity::create(array_merge($data,['tenant_id'=>auth()->user()->tenant_id,'created_by_id'=>auth()->id(),'completed_at'=>($data['is_completed']??false)?now():null])); if($act->account_id) Account::find($act->account_id)?->update(['last_activity_at'=>now()]); return response()->json($act->load(['createdBy:id,name']),201); }
    public function show(int $id): JsonResponse { return response()->json(Activity::byTenant(auth()->user()->tenant_id)->with(['createdBy:id,name','account:id,name'])->findOrFail($id)); }
    public function update(Request $request, int $id): JsonResponse { $a=Activity::byTenant(auth()->user()->tenant_id)->findOrFail($id); $a->update($request->except(['tenant_id','created_by_id'])); return response()->json($a->fresh()); }
    public function destroy(int $id): JsonResponse { Activity::byTenant(auth()->user()->tenant_id)->findOrFail($id)->delete(); return response()->json(['message'=>'Activity deleted']); }
    public function markComplete(int $id): JsonResponse { $a=Activity::byTenant(auth()->user()->tenant_id)->findOrFail($id); $a->update(['is_completed'=>true,'completed_at'=>now()]); return response()->json($a->fresh()); }
    public function today(Request $request): JsonResponse { return response()->json(Activity::byTenant(auth()->user()->tenant_id)->today()->with(['account:id,name','createdBy:id,name'])->orderBy('scheduled_at')->get()); }
    public function overdue(Request $request): JsonResponse { return response()->json(Activity::byTenant(auth()->user()->tenant_id)->overdue()->with(['account:id,name','lead','createdBy:id,name'])->orderBy('scheduled_at')->get()); }
}

// ═══════════════════════════════════════════════════════════
// CAMPAIGN CONTROLLER
// ═══════════════════════════════════════════════════════════
class CampaignController extends Controller
{
    public function index(Request $request): JsonResponse { return response()->json(Campaign::byTenant(auth()->user()->tenant_id)->with('createdBy:id,name')->orderBy('created_at','desc')->paginate($request->per_page??25)); }
    public function store(Request $request): JsonResponse { $data=$request->validate(['name'=>'required|string|max:200','type'=>'nullable|string','description'=>'nullable|string','start_date'=>'nullable|date','end_date'=>'nullable|date','budget'=>'nullable|numeric','notes'=>'nullable|string']); $c=Campaign::create(array_merge($data,['tenant_id'=>auth()->user()->tenant_id,'created_by_id'=>auth()->id(),'status'=>'draft'])); return response()->json($c,201); }
    public function show(int $id): JsonResponse { return response()->json(Campaign::byTenant(auth()->user()->tenant_id)->findOrFail($id)); }
    public function update(Request $request, int $id): JsonResponse { $c=Campaign::byTenant(auth()->user()->tenant_id)->findOrFail($id); $c->update($request->except(['tenant_id'])); return response()->json($c->fresh()); }
    public function destroy(int $id): JsonResponse { Campaign::byTenant(auth()->user()->tenant_id)->findOrFail($id)->delete(); return response()->json(['message'=>'Campaign deleted']); }
    public function launch(int $id): JsonResponse { $c=Campaign::byTenant(auth()->user()->tenant_id)->findOrFail($id); $c->update(['status'=>'active']); return response()->json($c->fresh()); }
    public function pause(int $id): JsonResponse { $c=Campaign::byTenant(auth()->user()->tenant_id)->findOrFail($id); $c->update(['status'=>'paused']); return response()->json($c->fresh()); }
    public function stats(int $id): JsonResponse { $c=Campaign::byTenant(auth()->user()->tenant_id)->findOrFail($id); return response()->json(['leads_generated'=>$c->leads_generated,'emails_sent'=>$c->emails_sent,'open_rate'=>$c->open_rate,'click_rate'=>$c->click_rate,'revenue_attributed'=>$c->revenue_attributed,'roi'=>$c->roi,'cost_per_lead'=>$c->leads_generated>0?round($c->actual_cost/$c->leads_generated,2):null]); }
}

// ═══════════════════════════════════════════════════════════
// ESTIMATE CONTROLLER
// ═══════════════════════════════════════════════════════════
class EstimateController extends Controller
{
    public function index(Request $request): JsonResponse { return response()->json(Estimate::byTenant(auth()->user()->tenant_id)->with(['account:id,name','createdBy:id,name'])->orderBy('created_at','desc')->paginate($request->per_page??25)); }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['account_id'=>'nullable|integer','opportunity_id'=>'nullable|integer','contact_id'=>'nullable|integer','discount_type'=>'nullable|string','discount_value'=>'nullable|numeric','delivery_fee'=>'nullable|numeric','fuel_surcharge'=>'nullable|numeric','setup_fee'=>'nullable|numeric','tax_rate'=>'nullable|numeric','contract_length'=>'nullable|integer','notes'=>'nullable|string','internal_notes'=>'nullable|string','valid_until'=>'nullable|date','line_items'=>'nullable|array','line_items.*.category'=>'required_with:line_items|string','line_items.*.description'=>'required_with:line_items|string','line_items.*.weekly_pieces'=>'required_with:line_items|integer','line_items.*.price_per_piece'=>'required_with:line_items|numeric']);

        $num = 'EST-'.now()->year.'-'.str_pad(Estimate::count()+1,4,'0',STR_PAD_LEFT);
        $est = Estimate::create(array_merge($data,['tenant_id'=>auth()->user()->tenant_id,'created_by_id'=>auth()->id(),'estimate_number'=>$num,'status'=>'draft']));

        if(!empty($data['line_items'])) {
            foreach($data['line_items'] as $i=>$li) {
                $monthly = round($li['weekly_pieces']*4.33)*$li['price_per_piece'];
                EstimateLineItem::create(['estimate_id'=>$est->id,'category'=>$li['category'],'description'=>$li['description'],'weekly_pieces'=>$li['weekly_pieces'],'monthly_pieces'=>round($li['weekly_pieces']*4.33),'price_per_piece'=>$li['price_per_piece'],'monthly_total'=>$monthly,'annual_total'=>$monthly*12,'sort_order'=>$i]);
            }
            $est->load('lineItems');
            $est->calculateTotals();
        }

        $contractTermDiscounts=[0=>0,12=>3,24=>5,36=>8];
        $est->term_discount = $contractTermDiscounts[$est->contract_length??12]??0;
        $est->save();

        return response()->json($est->fresh(['lineItems','account','createdBy']),201);
    }

    public function show(int $id): JsonResponse { return response()->json(Estimate::byTenant(auth()->user()->tenant_id)->with(['lineItems','account','createdBy','opportunity'])->findOrFail($id)); }

    public function update(Request $request, int $id): JsonResponse
    {
        $est = Estimate::byTenant(auth()->user()->tenant_id)->findOrFail($id);
        $est->update($request->except(['tenant_id','estimate_number','line_items']));

        if($request->has('line_items')) {
            $est->lineItems()->delete();
            foreach($request->line_items as $i=>$li) {
                $monthly = round($li['weekly_pieces']*4.33)*$li['price_per_piece'];
                EstimateLineItem::create(['estimate_id'=>$est->id,'category'=>$li['category'],'description'=>$li['description'],'weekly_pieces'=>$li['weekly_pieces'],'monthly_pieces'=>round($li['weekly_pieces']*4.33),'price_per_piece'=>$li['price_per_piece'],'monthly_total'=>$monthly,'annual_total'=>$monthly*12,'sort_order'=>$i]);
            }
        }
        $est->load('lineItems');
        $est->calculateTotals();
        return response()->json($est->fresh(['lineItems','account','createdBy']));
    }

    public function destroy(int $id): JsonResponse { Estimate::byTenant(auth()->user()->tenant_id)->findOrFail($id)->delete(); return response()->json(['message'=>'Estimate deleted']); }
    public function send(int $id): JsonResponse { $e=Estimate::byTenant(auth()->user()->tenant_id)->findOrFail($id); $e->update(['status'=>'sent','sent_at'=>now()]); return response()->json($e->fresh()); }
    public function approve(int $id): JsonResponse { $e=Estimate::byTenant(auth()->user()->tenant_id)->findOrFail($id); $e->update(['requires_approval'=>false,'approved_by_id'=>auth()->id(),'approved_at'=>now()]); return response()->json($e->fresh()); }
    public function rateCard(Request $request): JsonResponse { return response()->json(auth()->user()->tenant->rate_card??[]); }
    public function updateRateCard(Request $request): JsonResponse { auth()->user()->tenant->update(['rate_card'=>$request->all()]); return response()->json(['message'=>'Rate card updated']); }

    public function convertToContract(int $id): JsonResponse
    {
        $est = Estimate::byTenant(auth()->user()->tenant_id)->with('lineItems')->findOrFail($id);
        $num = 'CTR-'.now()->year.'-'.str_pad(Contract::count()+1,4,'0',STR_PAD_LEFT);
        $contract = Contract::create(['tenant_id'=>$est->tenant_id,'account_id'=>$est->account_id,'estimate_id'=>$est->id,'created_by_id'=>auth()->id(),'contract_number'=>$num,'status'=>'pending_signature','monthly_value'=>$est->total_monthly,'annual_value'=>$est->total_annual,'term_months'=>$est->contract_length??12,'notes'=>$est->notes]);
        foreach($est->lineItems as $li) { ContractLineItem::create(['contract_id'=>$contract->id,'category'=>$li->category,'description'=>$li->description,'weekly_pieces'=>$li->weekly_pieces,'monthly_pieces'=>$li->monthly_pieces,'price_per_piece'=>$li->price_per_piece,'monthly_total'=>$li->monthly_total,'annual_total'=>$li->annual_total]); }
        $est->update(['status'=>'converted']);
        return response()->json($contract->fresh(),201);
    }

    public function duplicate(int $id): JsonResponse
    {
        $est = Estimate::byTenant(auth()->user()->tenant_id)->with('lineItems')->findOrFail($id);
        $num = 'EST-'.now()->year.'-'.str_pad(Estimate::count()+1,4,'0',STR_PAD_LEFT);
        $newEst = $est->replicate();
        $newEst->estimate_number = $num;
        $newEst->status = 'draft';
        $newEst->sent_at = null; $newEst->viewed_at = null; $newEst->accepted_at = null;
        $newEst->save();
        foreach($est->lineItems as $li) { $nl=$li->replicate(); $nl->estimate_id=$newEst->id; $nl->save(); }
        return response()->json($newEst->fresh(['lineItems']),201);
    }
}

// ═══════════════════════════════════════════════════════════
// CONTRACT CONTROLLER
// ═══════════════════════════════════════════════════════════
class ContractController extends Controller
{
    public function index(Request $request): JsonResponse { return response()->json(Contract::byTenant(auth()->user()->tenant_id)->with(['account:id,name','createdBy:id,name'])->orderBy('created_at','desc')->paginate($request->per_page??25)); }
    public function store(Request $request): JsonResponse { $data=$request->validate(['account_id'=>'nullable|integer','monthly_value'=>'nullable|numeric','term_months'=>'nullable|integer','service_start_date'=>'nullable|date','service_end_date'=>'nullable|date','auto_renew'=>'nullable|boolean','notes'=>'nullable|string']); $num='CTR-'.now()->year.'-'.str_pad(Contract::count()+1,4,'0',STR_PAD_LEFT); $c=Contract::create(array_merge($data,['tenant_id'=>auth()->user()->tenant_id,'created_by_id'=>auth()->id(),'contract_number'=>$num,'annual_value'=>($data['monthly_value']??0)*12])); return response()->json($c->fresh(['account']),201); }
    public function show(int $id): JsonResponse { $c=Contract::byTenant(auth()->user()->tenant_id)->with(['account','createdBy','lineItems','estimate'])->findOrFail($id); return response()->json(array_merge($c->toArray(),['days_until_expiry'=>$c->days_until_expiry,'is_expiring'=>$c->is_expiring])); }
    public function update(Request $request, int $id): JsonResponse { $c=Contract::byTenant(auth()->user()->tenant_id)->findOrFail($id); $c->update($request->except(['tenant_id','contract_number'])); return response()->json($c->fresh()); }
    public function destroy(int $id): JsonResponse { Contract::byTenant(auth()->user()->tenant_id)->findOrFail($id)->delete(); return response()->json(['message'=>'Contract deleted']); }
    public function sendForSignature(int $id): JsonResponse { $c=Contract::byTenant(auth()->user()->tenant_id)->findOrFail($id); $c->update(['status'=>'pending_signature']); return response()->json(['message'=>'Sent for signature (DocuSign integration needed for production)','contract'=>$c->fresh()]); }
    public function void(int $id): JsonResponse { $c=Contract::byTenant(auth()->user()->tenant_id)->findOrFail($id); $c->update(['status'=>'cancelled','cancelled_at'=>now()]); return response()->json($c->fresh()); }
    public function cancel(Request $request, int $id): JsonResponse { $c=Contract::byTenant(auth()->user()->tenant_id)->findOrFail($id); $c->update(['status'=>'cancelled','cancelled_at'=>now(),'cancellation_reason'=>$request->reason]); return response()->json($c->fresh()); }
    public function expiring(Request $request): JsonResponse { return response()->json(Contract::byTenant(auth()->user()->tenant_id)->expiringSoon($request->days??90)->with('account:id,name')->orderBy('service_end_date')->get()->map(fn($c)=>array_merge($c->toArray(),['days_until_expiry'=>$c->days_until_expiry]))); }
    public function amend(Request $request, int $id): JsonResponse { $c=Contract::byTenant(auth()->user()->tenant_id)->findOrFail($id); $amendments=$c->amendments??[]; $amendments[]=['date'=>now()->toDateString(),'description'=>$request->description,'changed_fields'=>$request->changed_fields??[],'amended_by'=>auth()->user()->name]; $c->update(array_merge($request->except(['tenant_id','contract_number','description','changed_fields']),['amendments'=>$amendments,'version'=>($c->version??1)+1])); return response()->json($c->fresh()); }
    public function initateRenewal(int $id): JsonResponse { $c=Contract::byTenant(auth()->user()->tenant_id)->with('account','estimate')->findOrFail($id); $opp=Opportunity::create(['tenant_id'=>$c->tenant_id,'assigned_rep_id'=>auth()->id(),'account_id'=>$c->account_id,'name'=>($c->account?->name??'Account').' — Contract Renewal','type'=>'renewal','stage'=>'qualified','probability'=>60,'amount'=>$c->monthly_value,'contract_id'=>$c->id,'close_date'=>$c->service_end_date?->format('Y-m-d')??now()->addDays(60)->format('Y-m-d'),'last_activity_at'=>now()]); return response()->json(['message'=>'Renewal opportunity created','opportunity'=>$opp],201); }

    public function templates(): JsonResponse
    {
        return response()->json([
            ['id'=>1,'name'=>'Standard Service Agreement','description'=>'12-24 month contract for commercial linen services'],
            ['id'=>2,'name'=>'Multi-Location Agreement','description'=>'For accounts with 2+ service addresses'],
            ['id'=>3,'name'=>'Month-to-Month Agreement','description'=>'Flexible no-commitment agreement'],
            ['id'=>4,'name'=>'Healthcare Services Agreement','description'=>'HIPAA-compliant agreement for medical facilities'],
        ]);
    }
}

// ═══════════════════════════════════════════════════════════
// USER CONTROLLER
// ═══════════════════════════════════════════════════════════
class UserController extends Controller
{
    public function index(Request $request): JsonResponse { return response()->json(User::byTenant(auth()->user()->tenant_id)->orderBy('name')->get()->map(fn($u)=>array_merge($u->toArray(),['avatar_url'=>$u->avatar_url]))); }
    public function store(Request $request): JsonResponse { $data=$request->validate(['name'=>'required|string','email'=>'required|email|unique:users','password'=>'required|string|min:6','role'=>'nullable|string','title'=>'nullable|string','phone'=>'nullable|string','territory'=>'nullable|string']); $u=User::create(array_merge($data,['tenant_id'=>auth()->user()->tenant_id,'password'=>\Hash::make($data['password']),'is_active'=>true])); return response()->json(array_merge($u->toArray(),['avatar_url'=>$u->avatar_url]),201); }
    public function show(int $id): JsonResponse { $u=User::byTenant(auth()->user()->tenant_id)->findOrFail($id); return response()->json(array_merge($u->toArray(),['avatar_url'=>$u->avatar_url])); }
    public function update(Request $request, int $id): JsonResponse { $u=User::byTenant(auth()->user()->tenant_id)->findOrFail($id); $data=$request->except(['tenant_id','email']); if(isset($data['password'])) $data['password']=\Hash::make($data['password']); $u->update($data); return response()->json(array_merge($u->fresh()->toArray(),['avatar_url'=>$u->avatar_url])); }
    public function destroy(int $id): JsonResponse { User::byTenant(auth()->user()->tenant_id)->findOrFail($id)->delete(); return response()->json(['message'=>'User deleted']); }
}

// ═══════════════════════════════════════════════════════════
// REPORT CONTROLLER
// ═══════════════════════════════════════════════════════════
class ReportController extends Controller
{
    public function salesPerformance(Request $request): JsonResponse
    {
        $tid = auth()->user()->tenant_id;
        $from = $request->from??now()->subMonths(6)->format('Y-m-d');
        $to   = $request->to??now()->format('Y-m-d');
        $won  = Opportunity::byTenant($tid)->where('stage','closed_won')->whereBetween('closed_at',[$from,$to])->select(DB::raw('DATE_FORMAT(closed_at,"%Y-%m") as month'),DB::raw('SUM(amount) as revenue'),DB::raw('COUNT(*) as deals'))->groupBy('month')->orderBy('month')->get();
        $lost = Opportunity::byTenant($tid)->where('stage','closed_lost')->whereBetween('closed_at',[$from,$to])->select('lost_reason',DB::raw('COUNT(*) as count'))->groupBy('lost_reason')->get();
        return response()->json(['won_by_month'=>$won,'lost_reasons'=>$lost,'total_won'=>$won->sum('revenue'),'total_deals_won'=>$won->sum('deals')]);
    }
    public function revenue(Request $request): JsonResponse { $tid=auth()->user()->tenant_id; return response()->json(['mrr'=>Contract::byTenant($tid)->active()->sum('monthly_value'),'arr'=>Contract::byTenant($tid)->active()->sum('annual_value'),'active_contracts'=>Contract::byTenant($tid)->active()->count(),'pipeline_value'=>Opportunity::byTenant($tid)->open()->sum('amount')]); }
    public function repLeaderboard(Request $request): JsonResponse { $tid=auth()->user()->tenant_id; $users=User::byTenant($tid)->where('role','!=','viewer')->with(['leads'=>fn($q)=>$q->whereMonth('created_at',now()->month),'opportunities'=>fn($q)=>$q->where('stage','closed_won')->whereMonth('closed_at',now()->month),'activities'=>fn($q)=>$q->whereMonth('created_at',now()->month)])->get()->map(fn($u)=>array_merge($u->only(['id','name','title']),'avatar_url'=>$u->avatar_url,'leads_count'=>$u->leads->count(),'activities_count'=>$u->activities->count(),'deals_won'=>$u->opportunities->count(),'revenue_won'=>$u->opportunities->sum('amount'))); return response()->json($users); }
}
