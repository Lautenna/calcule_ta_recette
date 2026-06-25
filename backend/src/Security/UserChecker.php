<?php

namespace App\Security;

use App\Entity\User;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAccountStatusException;
use Symfony\Component\Security\Core\User\UserCheckerInterface;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Refuse la connexion des comptes dont l'email n'a pas encore été confirmé.
 */
final class UserChecker implements UserCheckerInterface
{
    public function checkPreAuth(UserInterface $user): void
    {
        if (!$user instanceof User) {
            return;
        }

        if (!$user->isVerified()) {
            throw new CustomUserMessageAccountStatusException(
                "Ton adresse email n'a pas encore été confirmée. Vérifie ta boîte mail (et tes spams)."
            );
        }
    }

    public function checkPostAuth(UserInterface $user): void
    {
        // Rien à vérifier après l'authentification.
    }
}
