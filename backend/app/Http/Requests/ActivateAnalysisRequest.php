<?php

namespace App\Http\Requests;

use App\Enums\AnalysisAddon;
use App\Enums\AnalysisReason;
use App\Models\AnalysisMethod;
use App\Models\Aquarium;
use App\Models\Voucher;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Barcode aktivieren (POST /analyses): Das Paket kommt vom Barcode, die Methode vorläufig aus
 * Paket und Wasserart des Beckens. Mit Osmose-Becken entsteht zusätzlich eine Osmose-Probe.
 */
class ActivateAnalysisRequest extends FormRequest
{
    public const COMMENT_MAX_LENGTH = 2000;

    private ?Voucher $voucher = null;

    private ?AnalysisMethod $analysisMethod = null;

    private ?AnalysisMethod $osmosisMethod = null;

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('barcode'))) {
            $this->merge(['barcode' => strtoupper(trim($this->input('barcode')))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $ownAquarium = Rule::exists('aquariums', 'id')->where('user_id', $this->user()->id);

        return [
            'barcode' => ['required', 'string', 'max:19'],
            'aquarium_id' => ['required', 'string', $ownAquarium],
            'reason' => ['sometimes', 'nullable', Rule::enum(AnalysisReason::class)],
            'addons' => ['sometimes', 'array'],
            'addons.*' => ['distinct', Rule::enum(AnalysisAddon::class)],
            'osmosis_aquarium_id' => [
                'sometimes', 'nullable', 'string', 'different:aquarium_id',
                Rule::exists('aquariums', 'id')->where('user_id', $this->user()->id)->where('water_type', Aquarium::OSMOSIS),
            ],
            'comment' => ['sometimes', 'nullable', 'string', 'max:'.self::COMMENT_MAX_LENGTH],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'barcode.required' => 'Bitte geben Sie den Barcode der Probe an.',
            'barcode.max' => 'Dieser Barcode ist ungültig.',
            'aquarium_id.required' => 'Bitte wählen Sie das Aquarium der Probe.',
            'aquarium_id.exists' => 'Dieses Aquarium wurde nicht gefunden.',
            'reason.enum' => 'Dieser Anlass wird nicht unterstützt.',
            'addons.*.enum' => 'Dieses Add-on wird nicht unterstützt.',
            'addons.*.distinct' => 'Ein Add-on kann nur einmal gebucht werden.',
            'osmosis_aquarium_id.exists' => 'Diese Osmosequelle wurde nicht gefunden.',
            'osmosis_aquarium_id.different' => 'Die Osmosequelle muss ein anderes Profil sein.',
            'comment.max' => 'Der Kommentar darf höchstens '.self::COMMENT_MAX_LENGTH.' Zeichen lang sein.',
        ];
    }

    /**
     * Prüfungen, die Barcode, Paket und Becken zusammen betreffen.
     *
     * @return list<callable>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $this->voucher = Voucher::with('package')->firstWhere('code', $this->validated('barcode'));
            if (! $this->voucher) {
                $validator->errors()->add('barcode', 'Dieser Barcode ist ungültig.');

                return;
            }
            if ($this->voucher->analysis()->exists()) {
                $validator->errors()->add('barcode', 'Dieser Barcode wurde bereits verwendet.');

                return;
            }

            $package = $this->voucher->package;
            $aquarium = Aquarium::find($this->validated('aquarium_id'));
            $this->analysisMethod = $package->methodFor($aquarium->water_type);
            if (! $this->analysisMethod) {
                $validator->errors()->add('aquarium_id', "Das Paket {$package->name['de']} passt nicht zu einem Becken mit {$aquarium->water_type}.");

                return;
            }

            if ($this->validated('osmosis_aquarium_id')) {
                $this->osmosisMethod = $package->includes_osmosis ? $package->methodFor(Aquarium::OSMOSIS) : null;
                if (! $this->osmosisMethod) {
                    $validator->errors()->add('osmosis_aquarium_id', "Das Paket {$package->name['de']} enthält keine Osmose-Auswertung.");
                }
            }
        }];
    }

    public function voucher(): Voucher
    {
        return $this->voucher;
    }

    public function analysisMethod(): AnalysisMethod
    {
        return $this->analysisMethod;
    }

    public function osmosisMethod(): ?AnalysisMethod
    {
        return $this->osmosisMethod;
    }
}
