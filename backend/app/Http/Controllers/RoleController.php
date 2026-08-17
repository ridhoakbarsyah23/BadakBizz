<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    /**
     * Get all roles
     */
    public function index()
    {
        return response()->json(Role::all());
    }
}
