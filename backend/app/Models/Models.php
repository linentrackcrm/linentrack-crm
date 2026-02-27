<?php namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

// ════════════════════════════════════════════
class Lead extends Model {
    use SoftDeletes;
    const STATUS_NEW='new';const STATUS_QUALIFYING='qualifying';const STATUS_WORKING='working';
    const STATUS_CONVERTED='converted';const STATUS_DISQUALIFIED='disqualified';const STATUS_NURTURE='nurture';
    const RATING_HOT='hot';const RATING_WARM='warm';const RATING_COLD='cold';

    protected $fillable=['tenant_id','assigned_rep_id','campaign_id','first_name','last_name','title','email','phone','mobile','linkedin_url','company','website','facility_type','estimated_weekly_pieces','delivery_frequency','num_locations','current_supplier','contract_end_date','annual_linen_spend','street','city','state','zip','country','lead_source','lead_score','rating','status','disqualified_reason','product_interests','tags','notes','last_activity_at','converted_at','converted_account_id','converted_opportunity_id'];
    protected $casts=['contract_end_date'=>'date','converted_at'=>'datetime','last_activity_at'=>'datetime','lead_score'=>'integer','num_locations'=>'integer','estimated_weekly_pieces'=>'integer','product_interests'=>'array','tags'=>'array','annual_linen_spend'=>'float'];

    public function assignedRep()         { return $this->belongsTo(User::class,'assigned_rep_id'); }
    public function campaign()            { return $this->belongsTo(Campaign::class); }
    public function activities()          { return $this->hasMany(Activity::class); }
    public function convertedAccount()    { return $this->belongsTo(Account::class,'converted_account_id'); }

    public function scopeByTenant($q,$tid)  { return $q->where('tenant_id',$tid); }
    public function scopeActive($q)          { return $q->whereIn('status',[self::STATUS_NEW,self::STATUS_QUALIFYING,self::STATUS_WORKING]); }
    public function scopeHot($q)             { return $q->where('rating','hot'); }
    public function scopeOverdue($q,$days=7) { return $q->where('last_activity_at','<',now()->subDays($days))->whereNotIn('status',[self::STATUS_CONVERTED,self::STATUS_DISQUALIFIED]); }

    public function calculateScore(): int {
        $score=0;
        if(in_array($this->facility_type,['hotel','hospital','restaurant','spa','resort'])) $score+=15;
        if($this->estimated_weekly_pieces>=500) $score+=20; elseif($this->estimated_weekly_pieces>=200) $score+=10;
        if($this->current_supplier) $score+=15;
        if($this->num_locations>1) $score+=10;
        if(in_array($this->lead_source,['web_form','referral'])) $score+=15;
        $dmTitles=['owner','gm','general manager','director','vp','president','ceo','administrator'];
        foreach($dmTitles as $t) { if(str_contains(strtolower($this->title??''),$t)){ $score+=10; break; } }
        if($this->last_activity_at && $this->last_activity_at->diffInDays(now())>14) $score-=20;
        return max(0,min(100,$score));
    }
    public function getFullNameAttribute()   { return "{$this->first_name} {$this->last_name}"; }
    public function getAddressAttribute()    { return collect([$this->street,$this->city,$this->state,$this->zip])->filter()->implode(', '); }
}

// ════════════════════════════════════════════
class Account extends Model {
    use SoftDeletes;
    protected $fillable=['tenant_id','assigned_rep_id','lead_id','name','type','website','phone','num_employees','num_locations','status','monthly_contract_value','annual_contract_value','contract_start_date','contract_end_date','contract_length_months','weekly_piece_volume','delivery_frequency','incumbent_supplier','account_source','street','city','state','zip','country','product_mix','delivery_days','tags','notes','health_score','last_activity_at'];
    protected $casts=['monthly_contract_value'=>'float','annual_contract_value'=>'float','weekly_piece_volume'=>'integer','num_locations'=>'integer','contract_start_date'=>'date','contract_end_date'=>'date','product_mix'=>'array','delivery_days'=>'array','tags'=>'array','last_activity_at'=>'datetime'];

    public function assignedRep()   { return $this->belongsTo(User::class,'assigned_rep_id'); }
    public function contacts()      { return $this->hasMany(Contact::class); }
    public function opportunities() { return $this->hasMany(Opportunity::class); }
    public function activities()    { return $this->hasMany(Activity::class); }
    public function contracts()     { return $this->hasMany(Contract::class); }
    public function estimates()     { return $this->hasMany(Estimate::class); }
    public function primaryContact(){ return $this->hasOne(Contact::class)->where('is_primary',true); }

    public function scopeByTenant($q,$tid)   { return $q->where('tenant_id',$tid); }
    public function scopeActive($q)           { return $q->where('status','active'); }
    public function scopeAtRisk($q)           { return $q->where('status','at_risk'); }
    public function scopeRenewalDue($q,$days=90) { return $q->whereBetween('contract_end_date',[now(),now()->addDays($days)]); }
    public function getAddressAttribute()     { return collect([$this->street,$this->city,$this->state,$this->zip])->filter()->implode(', '); }
}

// ════════════════════════════════════════════
class Contact extends Model {
    use SoftDeletes;
    protected $fillable=['tenant_id','account_id','first_name','last_name','title','department','email','phone','mobile','linkedin_url','role','preferred_contact_method','is_primary','is_active','tags','notes','last_contacted_at'];
    protected $casts=['is_primary'=>'boolean','is_active'=>'boolean','last_contacted_at'=>'datetime','tags'=>'array'];

    public function account()    { return $this->belongsTo(Account::class); }
    public function activities() { return $this->hasMany(Activity::class); }
    public function getFullNameAttribute() { return "{$this->first_name} {$this->last_name}"; }
    public function scopeByTenant($q,$tid) { return $q->where('tenant_id',$tid); }
}

// ════════════════════════════════════════════
class Opportunity extends Model {
    use SoftDeletes;
    const STAGE_PROSPECTING='prospecting';const STAGE_QUALIFIED='qualified';
    const STAGE_SITE_VISIT='site_visit';const STAGE_PROPOSAL='proposal_sent';
    const STAGE_NEGOTIATION='negotiation';const STAGE_WON='closed_won';const STAGE_LOST='closed_lost';
    const STAGES=['prospecting'=>['label'=>'Prospecting','order'=>1,'probability'=>10],'qualified'=>['label'=>'Qualified','order'=>2,'probability'=>25],'site_visit'=>['label'=>'Site Visit','order'=>3,'probability'=>40],'proposal_sent'=>['label'=>'Proposal Sent','order'=>4,'probability'=>60],'negotiation'=>['label'=>'Negotiation','order'=>5,'probability'=>80],'closed_won'=>['label'=>'Closed Won','order'=>6,'probability'=>100],'closed_lost'=>['label'=>'Closed Lost','order'=>7,'probability'=>0]];

    protected $fillable=['tenant_id','assigned_rep_id','account_id','contact_id','lead_id','estimate_id','contract_id','campaign_id','name','type','stage','probability','close_date','amount','weighted_amount','weekly_piece_count','contract_length','delivery_frequency','forecast_category','lead_source','product_mix','stage_history','tags','notes','closed_at','lost_reason','lost_reason_notes','competitor_won','last_activity_at'];
    protected $casts=['close_date'=>'date','closed_at'=>'datetime','last_activity_at'=>'datetime','amount'=>'float','weighted_amount'=>'float','probability'=>'integer','weekly_piece_count'=>'integer','product_mix'=>'array','stage_history'=>'array','tags'=>'array'];

    public function account()      { return $this->belongsTo(Account::class); }
    public function assignedRep()  { return $this->belongsTo(User::class,'assigned_rep_id'); }
    public function activities()   { return $this->hasMany(Activity::class); }
    public function estimate()     { return $this->belongsTo(Estimate::class); }
    public function contract()     { return $this->belongsTo(Contract::class); }

    public function scopeByTenant($q,$tid)   { return $q->where('tenant_id',$tid); }
    public function scopeOpen($q)             { return $q->whereNotIn('stage',[self::STAGE_WON,self::STAGE_LOST]); }
    public function scopeByStage($q,$stage)   { return $q->where('stage',$stage); }
    public function scopeByRep($q,$repId)     { return $q->where('assigned_rep_id',$repId); }
    public function scopeStuck($q,$days=14)   { return $q->open()->where('last_activity_at','<',now()->subDays($days)); }

    public function getHealthScoreAttribute(): string {
        if(!$this->last_activity_at) return 'red';
        $d=now()->diffInDays($this->last_activity_at);
        if($d<=3) return 'green'; if($d<=10) return 'yellow'; return 'red';
    }
    public function getAnnualValueAttribute(): float { return ($this->amount??0)*12; }
}

// ════════════════════════════════════════════
class Activity extends Model {
    protected $fillable=['tenant_id','created_by_id','assigned_to_id','account_id','contact_id','lead_id','opportunity_id','type','subject','notes','outcome','duration_minutes','scheduled_at','completed_at','is_completed','next_action','next_action_due_at','location'];
    protected $casts=['scheduled_at'=>'datetime','completed_at'=>'datetime','next_action_due_at'=>'datetime','is_completed'=>'boolean','duration_minutes'=>'integer'];

    public function createdBy()   { return $this->belongsTo(User::class,'created_by_id'); }
    public function account()     { return $this->belongsTo(Account::class); }
    public function lead()        { return $this->belongsTo(Lead::class); }
    public function opportunity() { return $this->belongsTo(Opportunity::class); }
    public function contact()     { return $this->belongsTo(Contact::class); }

    public function scopeByTenant($q,$tid) { return $q->where('tenant_id',$tid); }
    public function scopeOverdue($q)  { return $q->where('is_completed',false)->where('scheduled_at','<',now()); }
    public function scopeToday($q)    { return $q->whereDate('scheduled_at',now()->toDateString()); }
    public function scopeUpcoming($q) { return $q->where('is_completed',false)->where('scheduled_at','>=',now())->orderBy('scheduled_at'); }
}

// ════════════════════════════════════════════
class Campaign extends Model {
    protected $fillable=['tenant_id','created_by_id','name','type','status','description','start_date','end_date','budget','actual_cost','target_segment','leads_generated','emails_sent','open_rate','click_rate','revenue_attributed','opps_influenced','tags','notes'];
    protected $casts=['start_date'=>'date','end_date'=>'date','budget'=>'float','actual_cost'=>'float','revenue_attributed'=>'float','open_rate'=>'float','click_rate'=>'float','leads_generated'=>'integer','emails_sent'=>'integer','target_segment'=>'array','tags'=>'array'];

    public function createdBy() { return $this->belongsTo(User::class,'created_by_id'); }
    public function leads()     { return $this->hasMany(Lead::class); }
    public function scopeByTenant($q,$tid) { return $q->where('tenant_id',$tid); }
    public function getRoiAttribute() {
        if(!$this->actual_cost||$this->actual_cost==0) return null;
        return round(($this->revenue_attributed-$this->actual_cost)/$this->actual_cost*100,1);
    }
}

// ════════════════════════════════════════════
class Estimate extends Model {
    use SoftDeletes;
    protected $fillable=['tenant_id','created_by_id','account_id','opportunity_id','contact_id','estimate_number','status','version','valid_until','subtotal','discount_type','discount_value','discount_amount','delivery_fee','fuel_surcharge','setup_fee','tax_rate','tax_amount','total_monthly','total_annual','contract_length','term_discount','notes','internal_notes','sent_at','viewed_at','accepted_at','requires_approval','approved_by_id','approved_at'];
    protected $casts=['valid_until'=>'date','sent_at'=>'datetime','viewed_at'=>'datetime','accepted_at'=>'datetime','approved_at'=>'datetime','subtotal'=>'float','discount_value'=>'float','discount_amount'=>'float','delivery_fee'=>'float','fuel_surcharge'=>'float','setup_fee'=>'float','tax_rate'=>'float','tax_amount'=>'float','total_monthly'=>'float','total_annual'=>'float','term_discount'=>'float','requires_approval'=>'boolean'];

    public function account()    { return $this->belongsTo(Account::class); }
    public function opportunity() { return $this->belongsTo(Opportunity::class); }
    public function createdBy()  { return $this->belongsTo(User::class,'created_by_id'); }
    public function lineItems()  { return $this->hasMany(EstimateLineItem::class); }
    public function contract()   { return $this->hasOne(Contract::class); }
    public function scopeByTenant($q,$tid) { return $q->where('tenant_id',$tid); }

    public function calculateTotals(): void {
        $subtotal=$this->lineItems->sum('monthly_total');
        $this->subtotal=$subtotal;
        $discAmt=$this->discount_type==='percentage'?$subtotal*(($this->discount_value??0)/100):($this->discount_value??0);
        $this->discount_amount=$discAmt;
        $after=$subtotal-$discAmt+($this->delivery_fee??0)+($this->fuel_surcharge??0)+($this->setup_fee??0);
        $this->tax_amount=$after*(($this->tax_rate??0)/100);
        $this->total_monthly=$after+$this->tax_amount;
        $termFactor=1-(($this->term_discount??0)/100);
        $this->total_annual=$this->total_monthly*12*$termFactor;
        $this->save();
    }
}

class EstimateLineItem extends Model {
    protected $fillable=['estimate_id','category','description','weekly_pieces','monthly_pieces','price_per_piece','monthly_total','annual_total','sort_order'];
    protected $casts=['weekly_pieces'=>'integer','monthly_pieces'=>'integer','price_per_piece'=>'float','monthly_total'=>'float','annual_total'=>'float'];
    public function estimate() { return $this->belongsTo(Estimate::class); }
}

// ════════════════════════════════════════════
class Contract extends Model {
    use SoftDeletes;
    protected $fillable=['tenant_id','account_id','opportunity_id','estimate_id','created_by_id','contract_number','status','version','service_start_date','service_end_date','term_months','auto_renew','renewal_notice_days','monthly_value','annual_value','price_escalation_type','price_escalation_rate','delivery_frequency','delivery_days','signers','amendments','signed_at','executed_at','docusign_envelope_id','pdf_url','signed_pdf_url','cancellation_notice_days','cancellation_reason','cancelled_at','notes','internal_notes','tags'];
    protected $casts=['service_start_date'=>'date','service_end_date'=>'date','signed_at'=>'datetime','executed_at'=>'datetime','cancelled_at'=>'datetime','monthly_value'=>'float','annual_value'=>'float','price_escalation_rate'=>'float','auto_renew'=>'boolean','term_months'=>'integer','renewal_notice_days'=>'integer','signers'=>'array','amendments'=>'array','delivery_days'=>'array','tags'=>'array'];

    public function account()     { return $this->belongsTo(Account::class); }
    public function estimate()    { return $this->belongsTo(Estimate::class); }
    public function createdBy()   { return $this->belongsTo(User::class,'created_by_id'); }
    public function lineItems()   { return $this->hasMany(ContractLineItem::class); }
    public function opportunity() { return $this->belongsTo(Opportunity::class); }

    public function scopeByTenant($q,$tid)   { return $q->where('tenant_id',$tid); }
    public function scopeActive($q)           { return $q->where('status','active'); }
    public function scopeExpiringSoon($q,$d=90){ return $q->active()->whereBetween('service_end_date',[now(),now()->addDays($d)]); }

    public function getDaysUntilExpiryAttribute(): ?int {
        if(!$this->service_end_date) return null;
        return (int)now()->diffInDays($this->service_end_date,false);
    }
    public function getIsExpiringAttribute(): bool {
        return $this->days_until_expiry!==null&&$this->days_until_expiry<=90&&$this->days_until_expiry>0;
    }
}

class ContractLineItem extends Model {
    protected $fillable=['contract_id','category','description','weekly_pieces','monthly_pieces','price_per_piece','monthly_total','annual_total'];
    protected $casts=['weekly_pieces'=>'integer','monthly_pieces'=>'integer','price_per_piece'=>'float','monthly_total'=>'float','annual_total'=>'float'];
    public function contract() { return $this->belongsTo(Contract::class); }
}
