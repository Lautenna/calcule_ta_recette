<?php

namespace App\Controller;

use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;

/**
 * Renvoie l'utilisateur actuellement authentifié (à partir du JWT).
 * Permet au frontend de récupérer le profil complet après connexion.
 */
class MeController extends AbstractController
{
    #[Route('/api/me', name: 'api_me', methods: ['GET'])]
    public function __invoke(SerializerInterface $serializer): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return new JsonResponse(['message' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        $data = $serializer->serialize($user, 'json', ['groups' => ['user:read']]);

        return new JsonResponse($data, Response::HTTP_OK, [], true);
    }
}
