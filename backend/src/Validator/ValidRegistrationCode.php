<?php

namespace App\Validator;

use Symfony\Component\Validator\Constraint;

/**
 * Vérifie que le code d'invitation fourni correspond au code attendu
 * (configuré via la variable d'environnement REGISTRATION_CODE).
 */
#[\Attribute(\Attribute::TARGET_PROPERTY)]
final class ValidRegistrationCode extends Constraint
{
    public string $message = "Le code d'autorisation est invalide.";
}
