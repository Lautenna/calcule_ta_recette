<?php

namespace App\Doctrine;

use ApiPlatform\Doctrine\Orm\Extension\QueryCollectionExtensionInterface;
use ApiPlatform\Doctrine\Orm\Util\QueryNameGeneratorInterface;
use ApiPlatform\Metadata\Operation;
use App\Entity\Aliment;
use Doctrine\ORM\QueryBuilder;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Classe les résultats de recherche d'aliments par pertinence plutôt que par id.
 *
 * Quand on filtre sur ?nom=carotte, on veut « Carotte, crue » (ingrédient brut)
 * avant « Salade de céleri et carotte rémoulade ». Ordre appliqué :
 *   1. les noms qui COMMENCENT par le terme,
 *   2. puis ceux dont un mot commence par le terme,
 *   3. puis les autres correspondances partielles,
 * et à pertinence égale, les noms les plus COURTS d'abord (= aliments simples).
 */
final class AlimentSearchOrderExtension implements QueryCollectionExtensionInterface
{
    public function __construct(private RequestStack $requestStack)
    {
    }

    public function applyToCollection(
        QueryBuilder $queryBuilder,
        QueryNameGeneratorInterface $queryNameGenerator,
        string $resourceClass,
        ?Operation $operation = null,
        array $context = [],
    ): void {
        if (Aliment::class !== $resourceClass) {
            return;
        }

        $term = trim((string) $this->requestStack->getCurrentRequest()?->query->get('nom', ''));
        if ('' === $term) {
            return;
        }

        $alias = $queryBuilder->getRootAliases()[0];
        $prefix = $queryNameGenerator->generateParameterName('nomPrefix');
        $word = $queryNameGenerator->generateParameterName('nomWord');

        $queryBuilder
            ->addSelect(sprintf(
                'CASE WHEN %1$s.nom LIKE :%2$s THEN 0 WHEN %1$s.nom LIKE :%3$s THEN 1 ELSE 2 END AS HIDDEN relevance',
                $alias,
                $prefix,
                $word,
            ))
            ->addOrderBy('relevance', 'ASC')
            ->addOrderBy(sprintf('LENGTH(%s.nom)', $alias), 'ASC')
            ->addOrderBy(sprintf('%s.nom', $alias), 'ASC')
            ->setParameter($prefix, $term.'%')
            ->setParameter($word, '% '.$term.'%');
    }
}
