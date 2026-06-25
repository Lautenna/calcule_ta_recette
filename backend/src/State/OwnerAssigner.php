<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\OwnedByUserInterface;
use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Pose l'utilisateur courant comme propriétaire d'une ressource à sa création,
 * puis délègue la persistance au processor Doctrine par défaut d'API Platform.
 *
 * @implements ProcessorInterface<OwnedByUserInterface, OwnedByUserInterface>
 */
final class OwnerAssigner implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        private Security $security,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($data instanceof OwnedByUserInterface && null === $data->getUser()) {
            $user = $this->security->getUser();
            if ($user instanceof User) {
                $data->setUser($user);
            }
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}
