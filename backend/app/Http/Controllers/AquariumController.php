<?php

namespace App\Http\Controllers;

use App\Http\Requests\AquariumRequest;
use App\Http\Resources\AquariumResource;
use App\Models\Aquarium;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Aquarien des angemeldeten Nutzers. Fremde Aquarien gelten als nicht vorhanden (404).
 */
class AquariumController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $aquariums = $request->user()->aquariums()->with('links')->oldest()->oldest('id')->get();

        return response()->json(['aquariums' => AquariumResource::collection($aquariums)]);
    }

    public function store(AquariumRequest $request): JsonResponse
    {
        $aquarium = DB::transaction(function () use ($request) {
            $aquarium = $request->user()->aquariums()->create($request->aquariumData());
            $aquarium->syncLinks($request->links());

            return $aquarium;
        });

        return response()->json(['aquarium' => new AquariumResource($aquarium->refresh())], 201);
    }

    public function show(Request $request, string $aquarium): JsonResponse
    {
        return response()->json(['aquarium' => new AquariumResource($this->find($request, $aquarium))]);
    }

    public function update(AquariumRequest $request, string $aquarium): JsonResponse
    {
        $model = $this->find($request, $aquarium);

        DB::transaction(function () use ($model, $request) {
            $model->update($request->aquariumData());
            $model->syncLinks($request->links());
        });

        return response()->json(['aquarium' => new AquariumResource($model)]);
    }

    public function destroy(Request $request, string $aquarium): JsonResponse
    {
        // Verknüpfungen von und zu diesem Profil entfallen mit (Fremdschlüssel: cascadeOnDelete).
        $this->find($request, $aquarium)->delete();

        return response()->json(['message' => 'Aquarium gelöscht.']);
    }

    private function find(Request $request, string $id): Aquarium
    {
        return $request->user()->aquariums()->find($id) ?? abort(404, 'Aquarium nicht gefunden.');
    }
}
