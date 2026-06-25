<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Repository\IngredientRepository;
use App\State\OwnerAssigner;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Serializer\Annotation\SerializedName;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Ingrédient personnel enregistré par un utilisateur pour réutilisation.
 * Valeurs nutritionnelles pour 100g. Même forme sérialisée qu'un Aliment Ciqual.
 */
#[ORM\Entity(repositoryClass: IngredientRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(security: "is_granted('ROLE_USER')"),
        new Get(security: "is_granted('ROLE_USER') and object.getUser() == user"),
        new Post(
            security: "is_granted('ROLE_USER')",
            processor: OwnerAssigner::class,
        ),
        new Patch(security: "is_granted('ROLE_USER') and object.getUser() == user"),
        new Delete(security: "is_granted('ROLE_USER') and object.getUser() == user"),
    ],
    normalizationContext: ['groups' => ['ingredient:read']],
    denormalizationContext: ['groups' => ['ingredient:write']],
)]
class Ingredient implements OwnedByUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['ingredient:read'])]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?User $user = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 255)]
    #[Groups(['ingredient:read', 'ingredient:write'])]
    private string $nom = '';

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['ingredient:read', 'ingredient:write'])]
    private ?string $marque = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['ingredient:read', 'ingredient:write'])]
    #[SerializedName('energie_kcal')]
    private ?float $energieKcal = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['ingredient:read', 'ingredient:write'])]
    #[SerializedName('energie_kj')]
    private ?float $energieKj = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['ingredient:read', 'ingredient:write'])]
    #[SerializedName('graisses')]
    private ?float $graisses = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['ingredient:read', 'ingredient:write'])]
    #[SerializedName('graisses_sat')]
    private ?float $graissesSat = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['ingredient:read', 'ingredient:write'])]
    #[SerializedName('glucides')]
    private ?float $glucides = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['ingredient:read', 'ingredient:write'])]
    #[SerializedName('sucres')]
    private ?float $sucres = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['ingredient:read', 'ingredient:write'])]
    #[SerializedName('proteines')]
    private ?float $proteines = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['ingredient:read', 'ingredient:write'])]
    #[SerializedName('sel')]
    private ?float $sel = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['ingredient:read', 'ingredient:write'])]
    #[SerializedName('fibres')]
    private ?float $fibres = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['ingredient:read', 'ingredient:write'])]
    #[SerializedName('fer')]
    private ?float $fer = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['ingredient:read', 'ingredient:write'])]
    #[SerializedName('calcium')]
    private ?float $calcium = null;

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

    public function getMarque(): ?string
    {
        return $this->marque;
    }

    public function setMarque(?string $marque): static
    {
        $this->marque = $marque;
        return $this;
    }

    public function getEnergieKcal(): ?float
    {
        return $this->energieKcal;
    }

    public function setEnergieKcal(?float $energieKcal): static
    {
        $this->energieKcal = $energieKcal;
        return $this;
    }

    public function getEnergieKj(): ?float
    {
        return $this->energieKj;
    }

    public function setEnergieKj(?float $energieKj): static
    {
        $this->energieKj = $energieKj;
        return $this;
    }

    public function getGraisses(): ?float
    {
        return $this->graisses;
    }

    public function setGraisses(?float $graisses): static
    {
        $this->graisses = $graisses;
        return $this;
    }

    public function getGraissesSat(): ?float
    {
        return $this->graissesSat;
    }

    public function setGraissesSat(?float $graissesSat): static
    {
        $this->graissesSat = $graissesSat;
        return $this;
    }

    public function getGlucides(): ?float
    {
        return $this->glucides;
    }

    public function setGlucides(?float $glucides): static
    {
        $this->glucides = $glucides;
        return $this;
    }

    public function getSucres(): ?float
    {
        return $this->sucres;
    }

    public function setSucres(?float $sucres): static
    {
        $this->sucres = $sucres;
        return $this;
    }

    public function getProteines(): ?float
    {
        return $this->proteines;
    }

    public function setProteines(?float $proteines): static
    {
        $this->proteines = $proteines;
        return $this;
    }

    public function getSel(): ?float
    {
        return $this->sel;
    }

    public function setSel(?float $sel): static
    {
        $this->sel = $sel;
        return $this;
    }

    public function getFibres(): ?float
    {
        return $this->fibres;
    }

    public function setFibres(?float $fibres): static
    {
        $this->fibres = $fibres;
        return $this;
    }

    public function getFer(): ?float
    {
        return $this->fer;
    }

    public function setFer(?float $fer): static
    {
        $this->fer = $fer;
        return $this;
    }

    public function getCalcium(): ?float
    {
        return $this->calcium;
    }

    public function setCalcium(?float $calcium): static
    {
        $this->calcium = $calcium;
        return $this;
    }
}
