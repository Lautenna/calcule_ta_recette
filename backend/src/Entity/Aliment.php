<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiFilter;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Doctrine\Orm\Filter\SearchFilter;
use App\Repository\AlimentRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Serializer\Annotation\SerializedName;

/**
 * Un aliment de la table Ciqual (ANSES). Valeurs nutritionnelles pour 100g.
 * Ressource en lecture seule : alimentée uniquement par la commande app:import-ciqual.
 */
#[ORM\Entity(repositoryClass: AlimentRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_ciqual_code', columns: ['ciqual_code'])]
#[ORM\Index(name: 'idx_aliment_nom', columns: ['nom'])]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
    ],
    normalizationContext: ['groups' => ['aliment:read']],
    paginationItemsPerPage: 15,
)]
#[ApiFilter(SearchFilter::class, properties: ['nom' => 'partial'])]
class Aliment
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['aliment:read'])]
    private ?int $id = null;

    #[ORM\Column]
    #[Groups(['aliment:read'])]
    private int $ciqualCode = 0;

    #[ORM\Column(length: 255)]
    #[Groups(['aliment:read'])]
    private string $nom = '';

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['aliment:read'])]
    private ?string $groupe = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['aliment:read'])]
    #[SerializedName('energie_kcal')]
    private ?float $energieKcal = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['aliment:read'])]
    #[SerializedName('energie_kj')]
    private ?float $energieKj = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['aliment:read'])]
    #[SerializedName('graisses')]
    private ?float $graisses = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['aliment:read'])]
    #[SerializedName('graisses_sat')]
    private ?float $graissesSat = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['aliment:read'])]
    #[SerializedName('glucides')]
    private ?float $glucides = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['aliment:read'])]
    #[SerializedName('sucres')]
    private ?float $sucres = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['aliment:read'])]
    #[SerializedName('proteines')]
    private ?float $proteines = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['aliment:read'])]
    #[SerializedName('sel')]
    private ?float $sel = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['aliment:read'])]
    #[SerializedName('fibres')]
    private ?float $fibres = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['aliment:read'])]
    #[SerializedName('fer')]
    private ?float $fer = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['aliment:read'])]
    #[SerializedName('calcium')]
    private ?float $calcium = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCiqualCode(): int
    {
        return $this->ciqualCode;
    }

    public function setCiqualCode(int $ciqualCode): static
    {
        $this->ciqualCode = $ciqualCode;
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

    public function getGroupe(): ?string
    {
        return $this->groupe;
    }

    public function setGroupe(?string $groupe): static
    {
        $this->groupe = $groupe;
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
