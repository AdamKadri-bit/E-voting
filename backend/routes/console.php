<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Polling closes at the hour the law fixes, not when an admin gets around to
// it — so sweep for elections past their window every minute.
Schedule::command('elections:auto-close')
    ->everyMinute()
    ->withoutOverlapping();
