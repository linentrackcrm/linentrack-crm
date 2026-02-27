<?php
// app/Models/User.php
namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = ['tenant_id','name','email','password','role','phone','title','territory','avatar','is_active','quota_monthly','quota_annual','preferences','notification_settings','last_login_at'];
    protected $hidden   = ['password','remember_token'];
    protected $casts    = ['is_active'=>'boolean','preferences'=>'array','notification_settings'=>'array','last_login_at'=>'datetime','quota_monthly'=>'float','quota_annual'=>'float'];

    public function tenant()       { return $this->belongsTo(Tenant::class); }
    public function leads()        { return $this->hasMany(Lead::class,'assigned_rep_id'); }
    public function opportunities(){ return $this->hasMany(Opportunity::class,'assigned_rep_id'); }
    public function activities()   { return $this->hasMany(Activity::class,'created_by_id'); }

    public function getAvatarUrlAttribute() {
        return 'https://ui-avatars.com/api/?name='.urlencode($this->name).'&color=1B4F8A&background=D6E4F0&size=64';
    }
    public function scopeActive($q)              { return $q->where('is_active',true); }
    public function scopeByTenant($q,$tid)        { return $q->where('tenant_id',$tid); }
}
