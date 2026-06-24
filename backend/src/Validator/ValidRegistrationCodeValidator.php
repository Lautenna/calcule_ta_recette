<?php

namespace App\Validator;

use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;

final class ValidRegistrationCodeValidator extends ConstraintValidator
{
    public function __construct(
        #[Autowire('%env(REGISTRATION_CODE)%')]
        private string $expectedCode,
    ) {
    }

    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof ValidRegistrationCode) {
            throw new UnexpectedTypeException($constraint, ValidRegistrationCode::class);
        }

        // La présence du code est gérée par NotBlank ; ici on ne valide
        // que la correspondance si une valeur est fournie.
        if (null === $value || '' === $value) {
            return;
        }

        // Comparaison à temps constant pour éviter les attaques temporelles.
        if (!hash_equals($this->expectedCode, (string) $value)) {
            $this->context->buildViolation($constraint->message)->addViolation();
        }
    }
}
