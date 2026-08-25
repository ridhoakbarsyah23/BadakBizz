<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class StaffController extends Controller
{
    /**
     * Get all users (staff)
     */
    public function index(Request $request)
    {
        // For simplicity, we just return all users. In a multi-tenant app we would filter by store_id.
        $query = User::with('role')->orderBy('id', 'DESC');
        
        if ($request->has('per_page')) {
            $perPage = $request->query('per_page', 10);
            return response()->json($query->paginate($perPage));
        }

        return response()->json($query->get());
    }

    /**
     * Store a newly created staff
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:6',
            'role_id' => 'required|exists:roles,id',
            'is_active' => 'boolean'
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role_id' => $validated['role_id'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Staff created successfully',
            'user' => $user->load('role')
        ], 201);
    }

    /**
     * Update the specified staff
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,'.$user->id,
            'password' => 'nullable|min:6',
            'role_id' => 'sometimes|exists:roles,id',
            'is_active' => 'boolean'
        ]);

        if (isset($validated['name'])) $user->name = $validated['name'];
        if (isset($validated['email'])) $user->email = $validated['email'];
        if (!empty($validated['password'])) $user->password = Hash::make($validated['password']);
        if (isset($validated['role_id'])) $user->role_id = $validated['role_id'];
        if (isset($validated['is_active'])) $user->is_active = $validated['is_active'];

        $user->save();

        return response()->json([
            'message' => 'Staff updated successfully',
            'user' => $user->load('role')
        ]);
    }
}
