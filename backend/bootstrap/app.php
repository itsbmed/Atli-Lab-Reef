<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Das Frontend liest Fehlermeldungen aus { error } (siehe client/src/services/api.js).
        $exceptions->render(fn (ValidationException $e, Request $request) => $request->is('api/*')
            ? response()->json(['error' => $e->validator->errors()->first(), 'errors' => $e->errors()], $e->status)
            : null);

        $exceptions->render(fn (AuthenticationException $e, Request $request) => $request->is('api/*')
            ? response()->json(['error' => 'Nicht angemeldet.'], 401)
            : null);

        $exceptions->render(fn (ThrottleRequestsException $e, Request $request) => $request->is('api/*')
            ? response()->json(['error' => 'Zu viele Versuche. Bitte warten Sie einen Moment.'], 429, $e->getHeaders())
            : null);

        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            if ($request->is('api/*') && $response instanceof JsonResponse) {
                $data = $response->getData(true);
                if (is_array($data) && ! isset($data['error']) && isset($data['message'])) {
                    $response->setData(['error' => $data['message']] + $data);
                }
            }

            return $response;
        });
    })->create();
