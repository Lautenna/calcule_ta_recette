<?php

namespace App\Controller;

use App\Mailer\PasswordResetMailer;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Réinitialisation du mot de passe oublié (routes publiques).
 */
class PasswordResetController extends AbstractController
{
    /**
     * Demande de réinitialisation : envoie un email avec un lien si un compte
     * existe. Réponse volontairement neutre pour ne pas révéler si l'email existe.
     */
    #[Route('/api/forgot-password', name: 'api_forgot_password', methods: ['POST'])]
    public function forgot(
        Request $request,
        UserRepository $users,
        EntityManagerInterface $em,
        PasswordResetMailer $mailer,
    ): JsonResponse {
        $email = (string) (json_decode($request->getContent(), true)['email'] ?? '');
        $neutral = new JsonResponse(
            ['message' => 'Si un compte existe pour cet email, un lien de réinitialisation vient d\'être envoyé.'],
            Response::HTTP_OK,
        );

        if ($email === '') {
            return $neutral;
        }

        $user = $users->findOneByEmail($email);
        if ($user) {
            $user->startPasswordReset();
            $em->flush();
            $mailer->send($user);
        }

        return $neutral;
    }

    /**
     * Valide le jeton reçu par mail et enregistre le nouveau mot de passe.
     */
    #[Route('/api/reset-password', name: 'api_reset_password', methods: ['POST'])]
    public function reset(
        Request $request,
        UserRepository $users,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher,
    ): JsonResponse {
        $data = json_decode($request->getContent(), true) ?? [];
        $token = (string) ($data['token'] ?? '');
        $plainPassword = (string) ($data['plainPassword'] ?? '');

        if ($token === '') {
            return new JsonResponse(['message' => 'Jeton manquant.'], Response::HTTP_BAD_REQUEST);
        }

        if (mb_strlen($plainPassword) < 6) {
            return new JsonResponse(
                ['message' => 'Le mot de passe doit faire au moins 6 caractères.'],
                Response::HTTP_BAD_REQUEST,
            );
        }

        $user = $users->findOneByResetToken($token);
        if (!$user) {
            return new JsonResponse(
                ['message' => 'Ce lien de réinitialisation est invalide ou a déjà été utilisé.'],
                Response::HTTP_NOT_FOUND,
            );
        }

        if (!$user->isResetTokenValid()) {
            return new JsonResponse(
                ['message' => 'Ce lien a expiré. Demande un nouveau lien de réinitialisation.'],
                Response::HTTP_GONE,
            );
        }

        $user->setPassword($hasher->hashPassword($user, $plainPassword));
        $user->clearPasswordReset();
        $em->flush();

        return new JsonResponse(
            ['message' => 'Mot de passe mis à jour. Tu peux maintenant te connecter.'],
            Response::HTTP_OK,
        );
    }
}
