<?php

namespace App\Http\Controllers;

use App\Models\Table;
use Illuminate\Http\Request;

class TableController extends Controller
{
    public function index()
    {
        $tables = Table::all()
            ->sort(fn (Table $first, Table $second) => strnatcasecmp($first->name, $second->name))
            ->values();

        return response()->json($tables);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:tables,name',
            'status' => 'nullable|string|in:available,occupied,reserved',
        ]);

        $table = Table::create([
            'name' => $validated['name'],
            'status' => $validated['status'] ?? 'available',
        ]);

        return response()->json($table, 201);
    }

    public function update(Request $request, Table $table)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:tables,name,'.$table->id,
            'status' => 'sometimes|required|string|in:available,occupied,reserved',
        ]);

        $table->update($validated);

        return response()->json($table);
    }

    public function destroy(Table $table)
    {
        if ($table->status === 'occupied') {
            return response()->json(['message' => 'Occupied table cannot be deleted'], 422);
        }

        $table->delete();

        return response()->json(null, 204);
    }
}
