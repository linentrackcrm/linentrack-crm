<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->with('tenant')->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Account is deactivated'], 403);
        }

        $user->update(['last_login_at' => now()]);

        // Revoke old tokens and create fresh one
        $user->tokens()->delete();
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => array_merge($user->toArray(), [
                'avatar_url' => $user->avatar_url,
                'tenant'     => $user->tenant,
            ]),
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'company_name' => 'required|string|max:200',
            'name'         => 'required|string|max:100',
            'email'        => 'required|email|unique:users',
            'password'     => 'required|string|min:8',
            'phone'        => 'nullable|string',
        ]);

        // Create tenant
        $tenant = Tenant::create([
            'name'       => $request->company_name,
            'slug'       => \Str::slug($request->company_name) . '-' . rand(100, 999),
            'plan'       => 'growth',
            'phone'      => $request->phone,
            'email'      => $request->email,
            'is_active'  => true,
            'rate_card'  => [
                'fnb'        => ['price' => 0.38, 'label' => 'F&B Linens'],
                'uniforms'   => ['price' => 0.95, 'label' => 'Uniforms'],
                'terry'      => ['price' => 0.42, 'label' => 'Bath & Terry'],
                'bed'        => ['price' => 0.55, 'label' => 'Bed Linens'],
                'mats'       => ['price' => 2.80, 'label' => 'Floor Mats'],
                'healthcare' => ['price' => 0.65, 'label' => 'Healthcare'],
                'spa'        => ['price' => 0.52, 'label' => 'Spa & Salon'],
            ],
        ]);

        // Create admin user
        $user = User::create([
            'tenant_id' => $tenant->id,
            'name'      => $request->name,
            'email'     => $request->email,
            'password'  => Hash::make($request->password),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'token'  => $token,
            'user'   => array_merge($user->toArray(), ['avatar_url' => $user->avatar_url]),
            'tenant' => $tenant,
        ], 201);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('tenant');
        return response()->json(array_merge($user->toArray(), [
            'avatar_url' => $user->avatar_url,
        ]));
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'name'     => 'sometimes|string|max:100',
            'phone'    => 'sometimes|nullable|string',
            'title'    => 'sometimes|nullable|string',
            'territory'=> 'sometimes|nullable|string',
            'password' => 'sometimes|string|min:8',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        return response()->json(array_merge($user->fresh()->toArray(), ['avatar_url' => $user->avatar_url]));
    }
}
