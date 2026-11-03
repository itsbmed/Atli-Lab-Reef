<?php

namespace App\Enums;

/**
 * Anlass der Analyse. Alte Werte (analysis.reason): 1 routine, 2 algen, 3 cyanos, 4 rtn, 5 stn.
 */
enum AnalysisReason: string
{
    case Routine = 'routine';
    case Algen = 'algen';
    case Cyanos = 'cyanos';
    case Rtn = 'rtn';
    case Stn = 'stn';
}
