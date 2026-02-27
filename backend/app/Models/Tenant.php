<?php
// app/Models/Tenant.php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Tenant extends Model {
    protected $fillable = ['name','slug','plan','phone','email','website','address','logo','is_active','settings','rate_card','trial_ends_at'];
    protected $casts    = ['is_active'=>'boolean','settings'=>'array','rate_card'=>'array'];
    public function users()    { return $this->hasMany(User::class); }
    public function accounts() { return $this->hasMany(Account::class); }
    public function leads()    { return $this->hasMany(Lead::class); }
}
