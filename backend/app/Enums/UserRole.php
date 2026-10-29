<?php

namespace App\Enums;

enum UserRole: string
{
    case Endnutzer = 'endnutzer';
    case Haendler = 'haendler';
    case Subadmin = 'subadmin';
    case Admin = 'admin';
}
