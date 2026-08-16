<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class AuthController extends Controller
{
    /**
     * Handle user login and return Sanctum token.
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        if (Auth::attempt($credentials)) {
            $user = Auth::user();
            
            if (!$user->is_active) {
                // Logout the user since they are inactive
                Auth::logout();
                return response()->json([
                    'message' => 'Akun Anda telah dinonaktifkan. Hubungi Admin.'
                ], 403);
            }

            $user->load('role'); // Load role relation

            // Generate token
            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Login successful',
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => $user
            ]);
        }

        return response()->json([
            'message' => 'Invalid credentials'
        ], 401);
    }

    /**
     * Handle user logout (revoke token).
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    /**
     * Get the authenticated user details.
     */
    public function me(Request $request)
    {
        $user = $request->user()->load('role');
        return response()->json($user);
    }
}
