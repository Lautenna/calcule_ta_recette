<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\State\ProduitProvider;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Serializer\Annotation\SerializedName;

/**
 * Produit récupéré par code-barres depuis OpenFoodFacts (API publique).
 * Ressource en lecture seule, non persistée : le provider interroge OFF à la volée
 * et renvoie les valeurs nutritionnelles pour 100 g, au même format qu'un Aliment.
 */
#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/produits/{code}',
            provider: ProduitProvider::class,
        ),
    ],
    normalizationContext: ['groups' => ['produit:read']],
)]
class Produit
{
    #[ApiProperty(identifier: true)]
    #[Groups(['produit:read'])]
    public string $code = '';

    #[Groups(['produit:read'])]
    public string $nom = '';

    #[Groups(['produit:read'])]
    public ?string $marque = null;

    #[Groups(['produit:read'])]
    #[SerializedName('energie_kcal')]
    public ?float $energieKcal = null;

    #[Groups(['produit:read'])]
    #[SerializedName('energie_kj')]
    public ?float $energieKj = null;

    #[Groups(['produit:read'])]
    #[SerializedName('graisses')]
    public ?float $graisses = null;

    #[Groups(['produit:read'])]
    #[SerializedName('graisses_sat')]
    public ?float $graissesSat = null;

    #[Groups(['produit:read'])]
    #[SerializedName('glucides')]
    public ?float $glucides = null;

    #[Groups(['produit:read'])]
    #[SerializedName('sucres')]
    public ?float $sucres = null;

    #[Groups(['produit:read'])]
    #[SerializedName('proteines')]
    public ?float $proteines = null;

    #[Groups(['produit:read'])]
    #[SerializedName('sel')]
    public ?float $sel = null;

    #[Groups(['produit:read'])]
    #[SerializedName('fibres')]
    public ?float $fibres = null;

    #[Groups(['produit:read'])]
    #[SerializedName('fer')]
    public ?float $fer = null;

    #[Groups(['produit:read'])]
    #[SerializedName('calcium')]
    public ?float $calcium = null;
}
