<?php

namespace App\Enums;

enum AnalysisStatus: string
{
    case Registered = 'registered';
    case Received = 'received';
    case InAnalysis = 'in_analysis';
    case Completed = 'completed';
}
