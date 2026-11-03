<?php

namespace App\Http\Controllers;

use App\Enums\AnalysisStatus;
use App\Http\Requests\ActivateAnalysisRequest;
use App\Http\Resources\AnalysisResource;
use App\Models\Analysis;
use App\Models\Aquarium;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Analysen des angemeldeten Nutzers. Fremde Analysen gelten als nicht vorhanden (404).
 */
class AnalysisController extends Controller
{
    /** Für die Detailansicht, auch für mitgeschickte Proben. */
    private const DETAIL_RELATIONS = [
        'voucher', 'package', 'method.elements', 'aquarium:id,water_type', 'addons',
        'results.element.group', 'dosings.product', 'groupScores.group',
    ];

    /**
     * Hauptanalysen, neueste zuerst, ohne Messwerte. Mitgeschickte Proben stecken in der Detailansicht.
     * Mit ?include=details wie die Detailansicht – für Dashboard, Chronik und Trends, die alle
     * Messwerte auf einmal brauchen.
     */
    public function index(Request $request): JsonResponse
    {
        $relations = $request->query('include') === 'details'
            ? [...self::DETAIL_RELATIONS, 'children' => fn ($q) => $q->with(self::DETAIL_RELATIONS)->oldest()]
            : ['voucher', 'package', 'method', 'aquarium:id,water_type', 'addons'];

        $analyses = $request->user()->analyses()
            ->whereNull('parent_id')
            ->with($relations)
            ->withIssueCount()
            ->latest()->latest('id')
            ->get();

        return response()->json(['analyses' => AnalysisResource::collection($analyses)]);
    }

    public function show(Request $request, string $analysis): JsonResponse
    {
        return response()->json(['analysis' => new AnalysisResource($this->find($request->user(), $analysis))]);
    }

    /**
     * Barcode aktivieren. Mit Osmose-Becken entsteht zusätzlich eine Osmose-Probe ohne eigenen Barcode.
     */
    public function store(ActivateAnalysisRequest $request): JsonResponse
    {
        $user = $request->user();
        $voucher = $request->voucher();
        $aquarium = Aquarium::find($request->validated('aquarium_id'));

        $create = fn (Aquarium $aquarium, array $attributes) => Analysis::forceCreate($attributes + [
            'user_id' => $user->id,
            'aquarium_id' => $aquarium->id,
            'aquarium_name' => $aquarium->name,
            'package_id' => $voucher->package_id,
            'evaluation_scale_id' => $aquarium->evaluation_scale_id,
            'reason' => $request->validated('reason'),
            'status' => AnalysisStatus::Registered,
            'language' => $user->language,
        ]);

        try {
            $analysis = DB::transaction(function () use ($request, $voucher, $aquarium, $create) {
                $analysis = $create($aquarium, [
                    'voucher_id' => $voucher->id,
                    'method_id' => $request->analysisMethod()->id,
                    'customer_comment' => $request->validated('comment') ?: null,
                ]);
                foreach ($request->validated('addons') ?? [] as $addon) {
                    $analysis->addons()->create(['addon' => $addon]);
                }
                if ($osmosis = $request->osmosisMethod()) {
                    $create(Aquarium::find($request->validated('osmosis_aquarium_id')), [
                        'parent_id' => $analysis->id,
                        'method_id' => $osmosis->id,
                    ]);
                }

                return $analysis;
            });
        } catch (UniqueConstraintViolationException) {
            // Gleichzeitig mit demselben Barcode aktiviert: voucher_id ist eindeutig.
            throw ValidationException::withMessages(['barcode' => 'Dieser Barcode wurde bereits verwendet.']);
        }

        return response()->json(['analysis' => new AnalysisResource($this->find($user, $analysis->id))], 201);
    }

    private function find(User $user, string $id): Analysis
    {
        return $user->analyses()
            ->with([...self::DETAIL_RELATIONS, 'children' => fn ($q) => $q->with(self::DETAIL_RELATIONS)->oldest()])
            ->find($id) ?? abort(404, 'Analyse nicht gefunden.');
    }
}
