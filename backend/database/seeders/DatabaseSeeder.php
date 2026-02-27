<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('contract_line_items')->truncate();
        DB::table('contracts')->truncate();
        DB::table('estimate_line_items')->truncate();
        DB::table('estimates')->truncate();
        DB::table('campaigns')->truncate();
        DB::table('activities')->truncate();
        DB::table('opportunities')->truncate();
        DB::table('contacts')->truncate();
        DB::table('accounts')->truncate();
        DB::table('leads')->truncate();
        DB::table('users')->truncate();
        DB::table('tenants')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // ── TENANT ──────────────────────────────────────────
        $tenantId = DB::table('tenants')->insertGetId([
            'name'       => 'Premier Linen Services',
            'slug'       => 'premier-linen',
            'plan'       => 'professional',
            'phone'      => '(800) 555-1234',
            'email'      => 'info@premierlinensvc.com',
            'website'    => 'www.premierlinensvc.com',
            'address'    => '1200 Commerce Blvd, Atlanta, GA 30303',
            'is_active'  => true,
            'rate_card'  => json_encode([
                'fnb'        => ['price' => 0.38, 'label' => 'F&B Linens'],
                'uniforms'   => ['price' => 0.95, 'label' => 'Uniforms'],
                'terry'      => ['price' => 0.42, 'label' => 'Bath & Terry'],
                'bed'        => ['price' => 0.55, 'label' => 'Bed Linens'],
                'mats'       => ['price' => 2.80, 'label' => 'Floor Mats'],
                'healthcare' => ['price' => 0.65, 'label' => 'Healthcare'],
                'spa'        => ['price' => 0.52, 'label' => 'Spa & Salon'],
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // ── USERS ───────────────────────────────────────────
        $admin = DB::table('users')->insertGetId([
            'tenant_id' => $tenantId, 'name' => 'Sarah Mitchell',
            'email' => 'sarah@premierlinensvc.com', 'password' => Hash::make('password'),
            'role' => 'admin', 'title' => 'Sales Director', 'phone' => '(404) 555-0101',
            'territory' => 'Atlanta Metro', 'quota_monthly' => 15000, 'quota_annual' => 180000,
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $rep1 = DB::table('users')->insertGetId([
            'tenant_id' => $tenantId, 'name' => 'James Torres',
            'email' => 'james@premierlinensvc.com', 'password' => Hash::make('password'),
            'role' => 'rep', 'title' => 'Account Executive', 'phone' => '(404) 555-0102',
            'territory' => 'North Georgia', 'quota_monthly' => 10000, 'quota_annual' => 120000,
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $rep2 = DB::table('users')->insertGetId([
            'tenant_id' => $tenantId, 'name' => 'Maria Patel',
            'email' => 'maria@premierlinensvc.com', 'password' => Hash::make('password'),
            'role' => 'rep', 'title' => 'Account Executive', 'phone' => '(404) 555-0103',
            'territory' => 'South Georgia', 'quota_monthly' => 10000, 'quota_annual' => 120000,
            'is_active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);

        // ── ACCOUNTS (existing clients) ─────────────────────
        $accounts = [
            ['name'=>'Riverside Hotel Group','type'=>'hotel','city'=>'Atlanta','state'=>'GA','monthly_contract_value'=>3800,'weekly_piece_volume'=>950,'status'=>'active','contract_end_date'=>'2025-12-31','rep'=>$admin],
            ['name'=>"St. Mary's Hospital",'type'=>'hospital','city'=>'Marietta','state'=>'GA','monthly_contract_value'=>6400,'weekly_piece_volume'=>1600,'status'=>'at_risk','contract_end_date'=>'2025-03-31','rep'=>$admin],
            ['name'=>'Oakwood Country Club','type'=>'hotel','city'=>'Roswell','state'=>'GA','monthly_contract_value'=>2800,'weekly_piece_volume'=>700,'status'=>'active','contract_end_date'=>'2026-02-28','rep'=>$rep1],
            ['name'=>'FitLife Fitness Centers','type'=>'fitness_center','city'=>'Alpharetta','state'=>'GA','monthly_contract_value'=>1150,'weekly_piece_volume'=>290,'status'=>'active','contract_end_date'=>'2026-08-31','rep'=>$rep2],
            ['name'=>'La Maison Bistro','type'=>'restaurant','city'=>'Buckhead','state'=>'GA','monthly_contract_value'=>960,'weekly_piece_volume'=>240,'status'=>'active','contract_end_date'=>'2025-09-30','rep'=>$rep1],
            ['name'=>'Grand Palace Resort','type'=>'hotel','city'=>'Savannah','state'=>'GA','monthly_contract_value'=>6200,'weekly_piece_volume'=>1550,'status'=>'active','contract_end_date'=>'2027-01-31','rep'=>$admin],
            ['name'=>'Rosewood Memory Care','type'=>'nursing_home','city'=>'Duluth','state'=>'GA','monthly_contract_value'=>1800,'weekly_piece_volume'=>450,'status'=>'active','contract_end_date'=>'2025-06-30','rep'=>$rep2],
        ];

        $accountIds = [];
        foreach ($accounts as $a) {
            $aid = DB::table('accounts')->insertGetId([
                'tenant_id'=>$tenantId,'assigned_rep_id'=>$a['rep'],
                'name'=>$a['name'],'type'=>$a['type'],
                'city'=>$a['city'],'state'=>$a['state'],'country'=>'USA',
                'monthly_contract_value'=>$a['monthly_contract_value'],
                'annual_contract_value'=>$a['monthly_contract_value']*12,
                'weekly_piece_volume'=>$a['weekly_piece_volume'],
                'contract_end_date'=>$a['contract_end_date'],
                'status'=>$a['status'],'health_score'=>$a['status']==='at_risk'?45:85,
                'delivery_frequency'=>'weekly',
                'last_activity_at'=>now()->subDays(rand(1,10)),
                'created_at'=>now()->subMonths(rand(3,24)),'updated_at'=>now(),
            ]);
            $accountIds[] = $aid;

            // Add primary contact per account
            DB::table('contacts')->insert([
                'tenant_id'=>$tenantId,'account_id'=>$aid,
                'first_name'=>['James','Patricia','David','Angela','Michael','Robert','Linda'][array_rand([0,1,2,3,4,5,6])],
                'last_name'=>['Williams','Johnson','Smith','Brown','Davis','Miller','Wilson'][array_rand([0,1,2,3,4,5,6])],
                'title'=>['General Manager','Operations Director','GM','VP Operations','Owner','Administrator','F&B Director'][array_rand([0,1,2,3,4,5,6])],
                'role'=>'decision_maker','is_primary'=>true,'is_active'=>true,
                'phone'=>'(404) 555-'.str_pad(rand(1000,9999),4,'0',STR_PAD_LEFT),
                'email'=>strtolower(substr($a['name'],0,5)).rand(10,99).'@'.strtolower(str_replace(' ','',$a['name'])).'.com',
                'created_at'=>now()->subMonths(rand(3,24)),'updated_at'=>now(),
            ]);
        }

        // ── LEADS ────────────────────────────────────────────
        $leadData = [
            ['first_name'=>'Carlos','last_name'=>'Mendez','company'=>'Oceanview Resort & Spa','title'=>'General Manager','email'=>'cmendez@oceanview.com','phone'=>'(912) 555-0201','facility_type'=>'hotel','estimated_weekly_pieces'=>620,'current_supplier'=>'National Linen','lead_source'=>'web_form','lead_score'=>85,'rating'=>'hot','status'=>'working','rep'=>$admin,'city'=>'Savannah','state'=>'GA'],
            ['first_name'=>'Patricia','last_name'=>'Kim','company'=>"St. Andrew's Medical Center",'title'=>'Operations Director','email'=>'pkim@standrews.org','phone'=>'(770) 555-0202','facility_type'=>'hospital','estimated_weekly_pieces'=>1200,'current_supplier'=>'MedLinen Co','lead_source'=>'referral','lead_score'=>92,'rating'=>'hot','status'=>'qualifying','rep'=>$rep1,'city'=>'Gainesville','state'=>'GA'],
            ['first_name'=>'Michael','last_name'=>'Torres','company'=>'Harvest Table Restaurant Group','title'=>'Owner','email'=>'mtorres@harvesttable.com','phone'=>'(404) 555-0203','facility_type'=>'restaurant','estimated_weekly_pieces'=>380,'current_supplier'=>null,'lead_source'=>'cold_call','lead_score'=>64,'rating'=>'warm','status'=>'new','rep'=>$rep2,'city'=>'Decatur','state'=>'GA'],
            ['first_name'=>'Angela','last_name'=>'Reyes','company'=>'SkyTop Luxury Suites','title'=>'VP Operations','email'=>'areyes@skytop.com','phone'=>'(678) 555-0204','facility_type'=>'hotel','estimated_weekly_pieces'=>800,'current_supplier'=>'CleanLine','lead_source'=>'trade_show','lead_score'=>78,'rating'=>'hot','status'=>'working','rep'=>$rep1,'city'=>'Atlanta','state'=>'GA'],
            ['first_name'=>'David','last_name'=>'Chen','company'=>'Luxury Inn Collection','title'=>'GM','email'=>'dchen@luxuryinn.com','phone'=>'(404) 555-0205','facility_type'=>'hotel','estimated_weekly_pieces'=>840,'current_supplier'=>'ServiceMaster Linen','lead_source'=>'linkedin','lead_score'=>78,'rating'=>'hot','status'=>'qualifying','rep'=>$rep1,'city'=>'Buckhead','state'=>'GA'],
            ['first_name'=>'Sandra','last_name'=>'Williams','company'=>'Peach Blossom Spa','title'=>'Owner','email'=>'swilliams@peachblossom.com','phone'=>'(770) 555-0206','facility_type'=>'spa','estimated_weekly_pieces'=>180,'current_supplier'=>null,'lead_source'=>'web_form','lead_score'=>55,'rating'=>'warm','status'=>'working','rep'=>$rep2,'city'=>'Alpharetta','state'=>'GA'],
            ['first_name'=>'Tom','last_name'=>'Bradley','company'=>'Coastal Catering Co.','title'=>'Owner','email'=>'tbradley@coastalcatering.com','phone'=>'(912) 555-0207','facility_type'=>'catering','estimated_weekly_pieces'=>220,'current_supplier'=>null,'lead_source'=>'referral','lead_score'=>44,'rating'=>'cold','status'=>'new','rep'=>$admin,'city'=>'Brunswick','state'=>'GA'],
            ['first_name'=>'Lisa','last_name'=>'Montgomery','company'=>'Atlanta Athletic Club','title'=>'Club Manager','email'=>'lmontgomery@aac.com','phone'=>'(404) 555-0208','facility_type'=>'fitness_center','estimated_weekly_pieces'=>340,'current_supplier'=>'QuickClean','lead_source'=>'cold_call','lead_score'=>61,'rating'=>'warm','status'=>'qualifying','rep'=>$rep2,'city'=>'Johns Creek','state'=>'GA'],
            ['first_name'=>'Robert','last_name'=>'Park','company'=>'Piedmont Hospital Annex','title'=>'Supply Chain Dir.','email'=>'rpark@piedmont.org','phone'=>'(404) 555-0209','facility_type'=>'hospital','estimated_weekly_pieces'=>2100,'current_supplier'=>'SterileLinen Inc','lead_source'=>'referral','lead_score'=>94,'rating'=>'hot','status'=>'working','rep'=>$admin,'city'=>'Atlanta','state'=>'GA'],
            ['first_name'=>'Jennifer','last_name'=>'Walsh','company'=>'The Meridian Hotel','title'=>'GM','email'=>'jwalsh@meridianhotel.com','phone'=>'(770) 555-0210','facility_type'=>'hotel','estimated_weekly_pieces'=>510,'current_supplier'=>null,'lead_source'=>'web_form','lead_score'=>70,'rating'=>'warm','status'=>'new','rep'=>$rep1,'city'=>'Sandy Springs','state'=>'GA'],
        ];

        $leadIds = [];
        foreach ($leadData as $l) {
            $lid = DB::table('leads')->insertGetId([
                'tenant_id'=>$tenantId,'assigned_rep_id'=>$l['rep'],
                'first_name'=>$l['first_name'],'last_name'=>$l['last_name'],
                'company'=>$l['company'],'title'=>$l['title'],
                'email'=>$l['email'],'phone'=>$l['phone'],
                'facility_type'=>$l['facility_type'],
                'estimated_weekly_pieces'=>$l['estimated_weekly_pieces'],
                'current_supplier'=>$l['current_supplier'] ?? null,
                'lead_source'=>$l['lead_source'],'lead_score'=>$l['lead_score'],
                'rating'=>$l['rating'],'status'=>$l['status'],
                'city'=>$l['city'],'state'=>$l['state'],'country'=>'USA',
                'num_locations'=>rand(1,4),
                'last_activity_at'=>now()->subDays(rand(0,14)),
                'created_at'=>now()->subDays(rand(5,45)),'updated_at'=>now(),
            ]);
            $leadIds[] = $lid;
        }

        // ── OPPORTUNITIES (pipeline deals) ──────────────────
        $oppData = [
            ['name'=>'Oceanview Resort — New Account','account'=>null,'stage'=>'prospecting','amount'=>2200,'pieces'=>620,'close_date'=>'+45 days','type'=>'new_business','rep'=>$admin,'prob'=>10],
            ['name'=>"St. Andrew's Medical — Full Service",'account'=>null,'stage'=>'qualified','amount'=>4800,'pieces'=>1200,'close_date'=>'+35 days','type'=>'new_business','rep'=>$rep1,'prob'=>25],
            ['name'=>'Harvest Table F&B Linens','account'=>null,'stage'=>'qualified','amount'=>1440,'pieces'=>380,'close_date'=>'+42 days','type'=>'new_business','rep'=>$rep2,'prob'=>25],
            ['name'=>'SkyTop Luxury — Bed & Bath','account'=>null,'stage'=>'site_visit','amount'=>3200,'pieces'=>800,'close_date'=>'+28 days','type'=>'new_business','rep'=>$rep1,'prob'=>40],
            ['name'=>'Luxury Inn — Full Package','account'=>null,'stage'=>'site_visit','amount'=>3360,'pieces'=>840,'close_date'=>'+21 days','type'=>'new_business','rep'=>$rep1,'prob'=>40],
            ['name'=>'Grand Palace — Contract Renewal','account'=>$accountIds[5],'stage'=>'proposal_sent','amount'=>6800,'pieces'=>1700,'close_date'=>'+14 days','type'=>'renewal','rep'=>$admin,'prob'=>60],
            ['name'=>"St. Mary's — Service Expansion",'account'=>$accountIds[1],'stage'=>'proposal_sent','amount'=>7200,'pieces'=>1800,'close_date'=>'+10 days','type'=>'upsell','rep'=>$admin,'prob'=>60],
            ['name'=>'Riverside Hotel — Renewal 2026','account'=>$accountIds[0],'stage'=>'negotiation','amount'=>4100,'pieces'=>1025,'close_date'=>'+7 days','type'=>'renewal','rep'=>$admin,'prob'=>80],
            ['name'=>'Oakwood CC — Price Renegotiation','account'=>$accountIds[2],'stage'=>'negotiation','amount'=>3000,'pieces'=>750,'close_date'=>'+5 days','type'=>'renewal','rep'=>$rep1,'prob'=>80],
            ['name'=>'Piedmont Hospital — New Account','account'=>null,'stage'=>'qualified','amount'=>8400,'pieces'=>2100,'close_date'=>'+30 days','type'=>'new_business','rep'=>$admin,'prob'=>25],
        ];

        $oppIds = [];
        foreach ($oppData as $o) {
            $oid = DB::table('opportunities')->insertGetId([
                'tenant_id'=>$tenantId,'assigned_rep_id'=>$o['rep'],
                'account_id'=>$o['account'],
                'name'=>$o['name'],'type'=>$o['type'],
                'stage'=>$o['stage'],'probability'=>$o['prob'],
                'amount'=>$o['amount'],'weighted_amount'=>$o['amount']*$o['prob']/100,
                'weekly_piece_count'=>$o['pieces'],
                'close_date'=>now()->modify($o['close_date'])->format('Y-m-d'),
                'forecast_category'=>in_array($o['stage'],['negotiation','proposal_sent'])?'commit':'pipeline',
                'stage_history'=>json_encode([['stage'=>$o['stage'],'entered_at'=>now()->subDays(rand(2,15))->toISOString()]]),
                'lead_source'=>['web_form','referral','cold_call','trade_show'][rand(0,3)],
                'last_activity_at'=>now()->subDays(rand(0,12)),
                'created_at'=>now()->subDays(rand(10,60)),'updated_at'=>now(),
            ]);
            $oppIds[] = $oid;
        }

        // ── ACTIVITIES ───────────────────────────────────────
        $activityData = [
            ['type'=>'call','subject'=>'Discovery call with Carlos Mendez — Oceanview Resort','account'=>$accountIds[0],'lead'=>$leadIds[0],'rep'=>$admin,'days_ago'=>1,'outcome'=>'meeting_set','duration'=>25,'completed'=>true],
            ['type'=>'email','subject'=>'Sent pricing proposal to St. Andrews Medical Center','account'=>null,'lead'=>$leadIds[1],'rep'=>$rep1,'days_ago'=>2,'outcome'=>'proposal_requested','duration'=>null,'completed'=>true],
            ['type'=>'meeting','subject'=>'Site visit — Grand Palace Resort','account'=>$accountIds[5],'lead'=>null,'rep'=>$admin,'days_ago'=>3,'outcome'=>'connected','duration'=>90,'completed'=>true],
            ['type'=>'call','subject'=>'Follow-up with Angela Reyes — SkyTop Luxury','account'=>null,'lead'=>$leadIds[3],'rep'=>$rep1,'days_ago'=>0,'outcome'=>'connected','duration'=>18,'completed'=>true],
            ['type'=>'task','subject'=>'Send F&B linen samples to Harvest Table','account'=>null,'lead'=>$leadIds[2],'rep'=>$rep2,'days_ago'=>-2,'outcome'=>null,'duration'=>null,'completed'=>false],
            ['type'=>'email','subject'=>'Renewal proposal — Riverside Hotel Group','account'=>$accountIds[0],'lead'=>null,'rep'=>$admin,'days_ago'=>4,'outcome'=>'connected','duration'=>null,'completed'=>true],
            ['type'=>'meeting','subject'=>'Contract review — Oakwood Country Club','account'=>$accountIds[2],'lead'=>null,'rep'=>$rep1,'days_ago'=>5,'outcome'=>'meeting_set','duration'=>60,'completed'=>true],
            ['type'=>'call','subject'=>'Introduction call — Robert Park, Piedmont Hospital','account'=>null,'lead'=>$leadIds[8],'rep'=>$admin,'days_ago'=>1,'outcome'=>'connected','duration'=>35,'completed'=>true],
            ['type'=>'task','subject'=>"Follow up St. Mary's Hospital re: service issues",'account'=>$accountIds[1],'lead'=>null,'rep'=>$admin,'days_ago'=>-1,'outcome'=>null,'duration'=>null,'completed'=>false],
            ['type'=>'site_visit','subject'=>'Tour facility — Luxury Inn Collection','account'=>null,'lead'=>$leadIds[4],'rep'=>$rep1,'days_ago'=>6,'outcome'=>'connected','duration'=>120,'completed'=>true],
            ['type'=>'call','subject'=>'Check-in call — FitLife Fitness Centers','account'=>$accountIds[3],'lead'=>null,'rep'=>$rep2,'days_ago'=>3,'outcome'=>'connected','duration'=>12,'completed'=>true],
            ['type'=>'note','subject'=>'Lisa Montgomery very interested — send case study','account'=>null,'lead'=>$leadIds[7],'rep'=>$rep2,'days_ago'=>2,'outcome'=>null,'duration'=>null,'completed'=>true],
        ];

        foreach ($activityData as $act) {
            $scheduledAt = now()->subDays($act['days_ago']);
            DB::table('activities')->insert([
                'tenant_id'=>$tenantId,'created_by_id'=>$act['rep'],'assigned_to_id'=>$act['rep'],
                'account_id'=>$act['account'],'lead_id'=>$act['lead'],
                'type'=>$act['type'],'subject'=>$act['subject'],
                'outcome'=>$act['outcome'],'duration_minutes'=>$act['duration'],
                'is_completed'=>$act['completed'],
                'scheduled_at'=>$scheduledAt,
                'completed_at'=>$act['completed']?$scheduledAt:null,
                'notes'=>'Sample activity note — click to edit.',
                'next_action'=>$act['completed']?'Schedule follow-up within 5 days':null,
                'next_action_due_at'=>$act['completed']?now()->addDays(5):null,
                'created_at'=>$scheduledAt,'updated_at'=>now(),
            ]);
        }

        // ── CAMPAIGNS ────────────────────────────────────────
        DB::table('campaigns')->insert([
            ['tenant_id'=>$tenantId,'created_by_id'=>$admin,'name'=>'Spring Hotel Outreach 2025','type'=>'email','status'=>'active','description'=>'Email sequence targeting hotel GMs in metro Atlanta with spring refresh offer.','start_date'=>'2025-02-01','end_date'=>'2025-04-30','budget'=>1500,'actual_cost'=>680,'leads_generated'=>28,'emails_sent'=>420,'open_rate'=>42,'click_rate'=>18,'revenue_attributed'=>84000,'opps_influenced'=>5,'created_at'=>now(),'updated_at'=>now()],
            ['tenant_id'=>$tenantId,'created_by_id'=>$admin,'name'=>'Healthcare Contract Renewals','type'=>'email','status'=>'active','description'=>'Targeted renewal outreach to healthcare facilities expiring in Q1 2025.','start_date'=>'2025-01-15','end_date'=>'2025-03-31','budget'=>800,'actual_cost'=>320,'leads_generated'=>14,'emails_sent'=>88,'open_rate'=>61,'click_rate'=>34,'revenue_attributed'=>192000,'opps_influenced'=>3,'created_at'=>now(),'updated_at'=>now()],
            ['tenant_id'=>$tenantId,'created_by_id'=>$rep1,'name'=>'Restaurant F&B Push Q1','type'=>'cold_call_blitz','status'=>'paused','description'=>'Cold outreach to independent restaurant owners in the metro area.','start_date'=>'2025-01-01','end_date'=>'2025-03-31','budget'=>500,'actual_cost'=>210,'leads_generated'=>9,'emails_sent'=>180,'open_rate'=>null,'click_rate'=>null,'revenue_attributed'=>31200,'opps_influenced'=>2,'created_at'=>now(),'updated_at'=>now()],
            ['tenant_id'=>$tenantId,'created_by_id'=>$admin,'name'=>'Trade Show Follow-up — Hospitality Expo','type'=>'email','status'=>'completed','description'=>'Post-show follow-up sequence for leads collected at the Atlanta Hospitality Expo.','start_date'=>'2024-11-01','end_date'=>'2024-12-31','budget'=>2000,'actual_cost'=>1850,'leads_generated'=>22,'emails_sent'=>65,'open_rate'=>58,'click_rate'=>29,'revenue_attributed'=>252000,'opps_influenced'=>6,'created_at'=>now(),'updated_at'=>now()],
        ]);

        // ── ESTIMATES ────────────────────────────────────────
        $estimatesData = [
            ['number'=>'EST-2025-0024','account'=>$accountIds[5],'status'=>'draft','monthly'=>6200,'annual'=>71508,'delivery'=>200,'discount_type'=>'percentage','discount_value'=>5,'term'=>24,'rep'=>$admin,'lines'=>[['fnb',1200,0.38],['terry',280,0.42],['bed',70,0.55]]],
            ['number'=>'EST-2025-0023','account'=>$accountIds[1],'status'=>'sent','monthly'=>7200,'annual'=>83088,'delivery'=>250,'discount_type'=>'none','discount_value'=>0,'term'=>36,'rep'=>$admin,'lines'=>[['healthcare',1600,0.65],['uniforms',200,0.95]]],
            ['number'=>'EST-2025-0022','account'=>$accountIds[2],'status'=>'accepted','monthly'=>3000,'annual'=>34560,'delivery'=>125,'discount_type'=>'percentage','discount_value'=>3,'term'=>24,'rep'=>$rep1,'lines'=>[['fnb',560,0.38],['terry',140,0.42]]],
            ['number'=>'EST-2025-0021','account'=>null,'status'=>'draft','monthly'=>3360,'annual'=>38750,'delivery'=>150,'discount_type'=>'none','discount_value'=>0,'term'=>12,'rep'=>$rep1,'lines'=>[['bed',540,0.55],['terry',300,0.42]]],
            ['number'=>'EST-2025-0020','account'=>$accountIds[6],'status'=>'viewed','monthly'=>1800,'annual'=>20736,'delivery'=>100,'discount_type'=>'none','discount_value'=>0,'term'=>12,'rep'=>$rep2,'lines'=>[['healthcare',360,0.65],['uniforms',90,0.95]]],
        ];

        foreach ($estimatesData as $e) {
            $termDiscount = ['none'=>0,'percentage'=>0][$e['discount_type']] ?? 0;
            $contractTermDiscounts = [0=>0,12=>3,24=>5,36=>8];
            $eid = DB::table('estimates')->insertGetId([
                'tenant_id'=>$tenantId,'created_by_id'=>$e['rep'],
                'account_id'=>$e['account'],'estimate_number'=>$e['number'],
                'status'=>$e['status'],'contract_length'=>$e['term'],
                'discount_type'=>$e['discount_type'],'discount_value'=>$e['discount_value'],
                'delivery_fee'=>$e['delivery'],'total_monthly'=>$e['monthly'],
                'total_annual'=>$e['annual'],'valid_until'=>now()->addDays(30)->format('Y-m-d'),
                'term_discount'=>$contractTermDiscounts[$e['term']] ?? 0,
                'sent_at'=>in_array($e['status'],['sent','viewed','accepted'])?now()->subDays(5):null,
                'viewed_at'=>in_array($e['status'],['viewed','accepted'])?now()->subDays(3):null,
                'accepted_at'=>$e['status']==='accepted'?now()->subDays(1):null,
                'notes'=>'Thank you for considering Premier Linen Services. We look forward to serving your facility.',
                'created_at'=>now()->subDays(rand(3,20)),'updated_at'=>now(),
            ]);
            foreach ($e['lines'] as $li) {
                $monthly = round($li[1] * 4.33) * $li[2];
                DB::table('estimate_line_items')->insert([
                    'estimate_id'=>$eid,'category'=>$li[0],
                    'description'=>ucwords(str_replace('_',' ',$li[0])),
                    'weekly_pieces'=>$li[1],'monthly_pieces'=>round($li[1]*4.33),
                    'price_per_piece'=>$li[2],'monthly_total'=>$monthly,
                    'annual_total'=>$monthly*12,'created_at'=>now(),'updated_at'=>now(),
                ]);
            }
        }

        // ── CONTRACTS ────────────────────────────────────────
        $contractsData = [
            ['number'=>'CTR-2025-0018','account'=>$accountIds[0],'status'=>'active','monthly'=>3800,'start'=>'2024-01-01','end'=>'2025-12-31','term'=>24,'rep'=>$admin,'signers'=>[['name'=>'James Williams','email'=>'jwilliams@riverside.com','role'=>'client','signed_at'=>'2024-01-01']]],
            ['number'=>'CTR-2025-0017','account'=>$accountIds[2],'status'=>'active','monthly'=>2800,'start'=>'2025-03-01','end'=>'2026-02-28','term'=>12,'rep'=>$rep1,'signers'=>[['name'=>'David Smith','email'=>'dsmith@oakwood.com','role'=>'client','signed_at'=>'2025-03-01']]],
            ['number'=>'CTR-2025-0016','account'=>$accountIds[1],'status'=>'expiring_soon','monthly'=>6400,'start'=>'2023-03-01','end'=>'2025-03-31','term'=>24,'rep'=>$admin,'signers'=>[['name'=>'Patricia Johnson','email'=>'pjohnson@stmarys.org','role'=>'client','signed_at'=>'2023-03-01']]],
            ['number'=>'CTR-2025-0015','account'=>$accountIds[3],'status'=>'active','monthly'=>1150,'start'=>'2024-09-01','end'=>'2026-08-31','term'=>24,'rep'=>$rep2,'signers'=>[['name'=>'Angela Brown','email'=>'abrown@fitlife.com','role'=>'client','signed_at'=>'2024-09-01']]],
            ['number'=>'CTR-2025-0014','account'=>$accountIds[4],'status'=>'pending_signature','monthly'=>960,'start'=>null,'end'=>null,'term'=>12,'rep'=>$rep1,'signers'=>[['name'=>'Michael Davis','email'=>'mdavis@lamaison.com','role'=>'client','signed_at'=>null]]],
            ['number'=>'CTR-2025-0013','account'=>$accountIds[5],'status'=>'active','monthly'=>6200,'start'=>'2025-02-01','end'=>'2027-01-31','term'=>24,'rep'=>$admin,'signers'=>[['name'=>'Robert Miller','email'=>'rmiller@grandpalace.com','role'=>'client','signed_at'=>'2025-02-01']]],
            ['number'=>'CTR-2025-0012','account'=>$accountIds[6],'status'=>'active','monthly'=>1800,'start'=>'2024-07-01','end'=>'2025-06-30','term'=>12,'rep'=>$rep2,'signers'=>[['name'=>'Linda Wilson','email'=>'lwilson@rosewood.com','role'=>'client','signed_at'=>'2024-07-01']]],
        ];

        foreach ($contractsData as $c) {
            DB::table('contracts')->insertGetId([
                'tenant_id'=>$tenantId,'created_by_id'=>$c['rep'],
                'account_id'=>$c['account'],'contract_number'=>$c['number'],
                'status'=>$c['status'],'term_months'=>$c['term'],
                'monthly_value'=>$c['monthly'],'annual_value'=>$c['monthly']*12,
                'service_start_date'=>$c['start'],'service_end_date'=>$c['end'],
                'auto_renew'=>false,'renewal_notice_days'=>90,
                'price_escalation_type'=>'none',
                'signers'=>json_encode($c['signers']),
                'signed_at'=>$c['status']!=='pending_signature'?$c['start']:null,
                'executed_at'=>$c['status']==='active'?$c['start']:null,
                'delivery_frequency'=>'weekly',
                'notes'=>'Standard commercial linen service agreement.',
                'created_at'=>now()->subDays(rand(5,400)),'updated_at'=>now(),
            ]);
        }

        $this->command->info('✅ LinenTrack sample data seeded successfully!');
        $this->command->info('');
        $this->command->info('Login credentials:');
        $this->command->info('  Admin:  sarah@premierlinensvc.com / password');
        $this->command->info('  Rep 1:  james@premierlinensvc.com / password');
        $this->command->info('  Rep 2:  maria@premierlinensvc.com / password');
    }
}
