<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Repository\RecetteRepository;
use App\State\OwnerAssigner;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: RecetteRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(security: "is_granted('ROLE_USER')"),
        new Get(security: "is_granted('ROLE_USER') and object.getUser() == user"),
        new Post(
            security: "is_granted('ROLE_USER')",
            denormalizationContext: ['groups' => ['recette:write']],
            processor: OwnerAssigner::class,
        ),
        new Patch(
            security: "is_granted('ROLE_USER') and object.getUser() == user",
            denormalizationContext: ['groups' => ['recette:write']],
        ),
        new Delete(security: "is_granted('ROLE_USER') and object.getUser() == user"),
    ],
    normalizationContext: ['groups' => ['recette:read']],
    denormalizationContext: ['groups' => ['recette:write']],
)]
class Recette implements OwnedByUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['recette:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    #[Groups(['recette:read', 'recette:write'])]
    private string $nom = '';

    #[ORM\Column]
    #[Assert\Positive]
    #[Groups(['recette:read', 'recette:write'])]
    private int $nombrePersonnes = 4;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['recette:read', 'recette:write'])]
    private ?string $description = null;

    /**
     * Composition de la recette : tableau d'ingrédients tel que produit par le
     * calculateur (nom, marque, quantite, valeurs nutritionnelles pour 100g…).
     *
     * @var array<int, array<string, mixed>>|null
     */
    #[ORM\Column(type: 'json', nullable: true)]
    #[Groups(['recette:read', 'recette:write'])]
    private ?array $composition = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;
        return $this;
    }

    public function getNom(): string
    {
        return $this->nom;
    }

    public function setNom(string $nom): static
    {
        $this->nom = $nom;
        return $this;
    }

    public function getNombrePersonnes(): int
    {
        return $this->nombrePersonnes;
    }

    public function setNombrePersonnes(int $nombrePersonnes): static
    {
        $this->nombrePersonnes = $nombrePersonnes;
        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;
        return $this;
    }

    /**
     * @return array<int, array<string, mixed>>|null
     */
    public function getComposition(): ?array
    {
        return $this->composition;
    }

    /**
     * @param array<int, array<string, mixed>>|null $composition
     */
    public function setComposition(?array $composition): static
    {
        $this->composition = $composition;
        return $this;
    }
}
