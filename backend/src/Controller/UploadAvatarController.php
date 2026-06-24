<?php

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapEntity;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\String\Slugger\SluggerInterface;

/**
 * Upload de la photo de profil (optionnelle).
 * Reçoit un fichier `photo` en multipart/form-data, le stocke dans
 * public/uploads/avatars/ et enregistre son chemin relatif sur l'utilisateur.
 */
class UploadAvatarController extends AbstractController
{
    private const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    private const MAX_SIZE = 2_097_152; // 2 Mo

    #[Route('/api/users/{id}/photo', name: 'api_user_upload_photo', methods: ['POST'])]
    public function __invoke(
        Request $request,
        #[MapEntity(id: 'id')] User $user,
        EntityManagerInterface $em,
        SluggerInterface $slugger,
    ): JsonResponse {
        // Seul le propriétaire du profil peut modifier sa photo.
        if ($this->getUser() !== $user) {
            return new JsonResponse(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        /** @var UploadedFile|null $file */
        $file = $request->files->get('photo');
        if (!$file instanceof UploadedFile) {
            return new JsonResponse(['message' => 'Aucun fichier "photo" reçu.'], Response::HTTP_BAD_REQUEST);
        }

        if (!in_array($file->getMimeType(), self::ALLOWED_MIME, true)) {
            return new JsonResponse(['message' => 'Format non supporté (jpeg, png, webp, gif).'], Response::HTTP_UNSUPPORTED_MEDIA_TYPE);
        }

        if ($file->getSize() > self::MAX_SIZE) {
            return new JsonResponse(['message' => 'Fichier trop volumineux (max 2 Mo).'], Response::HTTP_REQUEST_ENTITY_TOO_LARGE);
        }

        $dir = $this->getParameter('avatars_directory');
        $original = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $safeName = $slugger->slug($original)->lower();
        $newName = sprintf('%s-%s.%s', $safeName, uniqid(), $file->guessExtension());

        try {
            $file->move($dir, $newName);
        } catch (FileException) {
            return new JsonResponse(['message' => "Échec de l'enregistrement du fichier."], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        // Supprime l'ancienne photo si elle existe.
        $previous = $user->getPhotoProfil();
        if ($previous && str_starts_with($previous, '/uploads/avatars/')) {
            $previousPath = $this->getParameter('kernel.project_dir') . '/public' . $previous;
            if (is_file($previousPath)) {
                @unlink($previousPath);
            }
        }

        $relativePath = '/uploads/avatars/' . $newName;
        $user->setPhotoProfil($relativePath);
        $em->flush();

        return new JsonResponse(['photoProfil' => $relativePath], Response::HTTP_OK);
    }
}
