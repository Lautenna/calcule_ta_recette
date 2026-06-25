<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\User;
use App\Mailer\ConfirmationMailer;
use Psr\Log\LoggerInterface;

/**
 * Traitement de l'inscription publique (POST /api/users) :
 * 1. génère le jeton de confirmation (compte non vérifié) ;
 * 2. délègue au hashage du mot de passe + persistance ;
 * 3. envoie l'email de confirmation.
 *
 * @implements ProcessorInterface<User, User>
 */
final class UserRegistrationProcessor implements ProcessorInterface
{
    public function __construct(
        private UserPasswordHasher $passwordHasher,
        private ConfirmationMailer $confirmationMailer,
        private LoggerInterface $logger,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($data instanceof User) {
            // Nouveau compte : non vérifié tant que l'email n'est pas confirmé.
            $data->startEmailConfirmation();
        }

        // Hashage du mot de passe + persistance (processor Doctrine sous-jacent).
        $result = $this->passwordHasher->process($data, $operation, $uriVariables, $context);

        if ($result instanceof User) {
            // L'échec d'envoi ne doit pas faire échouer l'inscription : le compte
            // est créé, l'utilisateur arrive sur l'écran « vérifie tes mails » et
            // peut demander un renvoi. On journalise pour diagnostic.
            try {
                $this->confirmationMailer->send($result);
            } catch (\Throwable $e) {
                $this->logger->error('Échec d\'envoi de l\'email de confirmation à {email}: {error}', [
                    'email' => $result->getEmail(),
                    'error' => $e->getMessage(),
                    'exception' => $e,
                ]);
            }
        }

        return $result;
    }
}
