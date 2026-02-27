<?php
// routes/web.php
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['status' => 'LinenTrack CRM API', 'version' => '1.0']);
});

Route::get('/up', function () {
    return response()->json(['status' => 'ok']);
});
