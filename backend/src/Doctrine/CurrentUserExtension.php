<?php

namespace App\Doctrine;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\OwnedByUserInterface;
use App\Entity\User;
use Doctrine\ORM\QueryBuilder;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * Restreint les collections des ressources possédées (OwnedByUserInterface)
 * aux entités appartenant à l'utilisateur connecté. Chaque utilisateur ne voit
 * donc que ses propres ingrédients et recettes via GET /ingredients et /recettes.
 */
final class CurrentUserExtension implements QueryCollectionExtensionInterface
{
    public function __construct(private Security $security)
    {
    }

    public function applyToCollection(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = [],
    ): void {
        if (!is_a($resourceClass, OwnedByUserInterface::class, true)) {
            return;
        }

        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $parameter = $queryNameGenerator->generateParameterName('currentUser');

        $queryBuilder
            ->andWhere(sprintf('%s.user = :%s', $alias, $parameter))
            ->setParameter($parameter, $user);
    }
}
