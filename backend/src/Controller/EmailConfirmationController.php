<?php

namespace App\Controller;

use App\Mailer\ConfirmationMailer;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Confirmation d'email après inscription (routes publiques).
 */
class EmailConfirmationController extends AbstractController
{
    /**
     * Valide le jeton reçu par mail et active le compte.
     */
    #[Route('/api/confirm-email', name: 'api_confirm_email', methods: ['POST'])]
    public function confirm(
        Request $request,
        UserRepository $users,
        EntityManagerInterface $em,
    ): JsonResponse {
        $token = (string) (json_decode($request->getContent(), true)['token'] ?? '');
        if ($token === '') {
            return new JsonResponse(['message' => 'Jeton manquant.'], Response::HTTP_BAD_REQUEST);
        }

        $user = $users->findOneByConfirmationToken($token);
        if (!$user) {
            return new JsonResponse(
                ['message' => 'Ce lien de confirmation est invalide ou a déjà été utilisé.'],
                Response::HTTP_NOT_FOUND,
            );
        }

        if ($user->isVerified()) {
            return new JsonResponse(['message' => 'Ce compte est déjà confirmé.'], Response::HTTP_OK);
        }

        if (!$user->isConfirmationTokenValid()) {
            return new JsonResponse(
                ['message' => 'Ce lien a expiré. Demande un nouvel email de confirmation.'],
                Response::HTTP_GONE,
            );
        }

        $user->confirmEmail();
        $em->flush();

        return new JsonResponse(['message' => 'Adresse confirmée. Tu peux maintenant te connecter.'], Response::HTTP_OK);
    }

    /**
     * Renvoie un nouvel email de confirmation. Réponse volontairement neutre
     * pour ne pas révéler si l'email existe ou non.
     */
    #[Route('/api/resend-confirmation', name: 'api_resend_confirmation', methods: ['POST'])]
    public function resend(
        Request $request,
        UserRepository $users,
        EntityManagerInterface $em,
        ConfirmationMailer $mailer,
    ): JsonResponse {
        $email = (string) (json_decode($request->getContent(), true)['email'] ?? '');
        $neutral = new JsonResponse(
            ['message' => 'Si un compte non confirmé existe pour cet email, un nouveau lien vient d\'être envoyé.'],
            Response::HTTP_OK,
        );

        if ($email === '') {
            return $neutral;
        }

        $user = $users->findOneByEmail($email);
        if ($user && !$user->isVerified()) {
            $user->startEmailConfirmation();
            $em->flush();
            $mailer->send($user);
        }

        return $neutral;
    }
}
