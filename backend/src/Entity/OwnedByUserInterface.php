<?php

namespace App\Entity;

/**
 * Ressource appartenant à un utilisateur. Le propriétaire est posé
 * automatiquement à la création par App\State\OwnerAssigner, et les
 * collections sont filtrées sur l'utilisateur courant par
 * App\Doctrine\CurrentUserExtension.
 */
interface OwnedByUserInterface
{
    public function getUser(): ?User;

    public function setUser(?User $user): static;
}
