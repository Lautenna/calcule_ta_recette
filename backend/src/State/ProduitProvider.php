<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\Produit;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Fournit un Produit à partir d'un code-barres en interrogeant l'API publique
 * OpenFoodFacts (v2). Les valeurs sont normalisées pour 100 g, au format Aliment.
 *
 * @implements ProviderInterface<Produit>
 */
final class ProduitProvider implements ProviderInterface
{
    private const ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product/%s.json';

    // OpenFoodFacts demande un User-Agent identifiant l'application (politique d'usage).
    private const USER_AGENT = 'CalculateurRecette/1.0 (https://github.com/Lautenna/calculateur_recette)';

    public function __construct(
        private readonly HttpClientInterface $httpClient,
    ) {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): ?Produit
    {
        $code = (string) ($uriVariables['code'] ?? '');

        // Un code-barres EAN/UPC ne contient que des chiffres (8 à 14 caractères).
        if (!preg_match('/^\d{8,14}$/', $code)) {
            throw new NotFoundHttpException('Code-barres invalide.');
        }

        try {
            $response = $this->httpClient->request('GET', sprintf(self::ENDPOINT, $code), [
                'query' => ['fields' => 'product_name,product_name_fr,brands,nutriments,image_front_small_url,image_front_url,image_url'],
                'headers' => ['User-Agent' => self::USER_AGENT],
                'timeout' => 8,
            ]);
            // 2nd argument à false : ne lève pas d'exception sur un code HTTP non-2xx,
            // OFF renvoyant parfois 404 pour un produit inconnu.
            $data = $response->toArray(false);
        } catch (HttpExceptionInterface) {
            throw new NotFoundHttpException('Service OpenFoodFacts indisponible.');
        }

        // status = 1 : produit trouvé ; sinon code-barres inconnu de la base.
        if (1 !== ($data['status'] ?? 0) || empty($data['product'])) {
            throw new NotFoundHttpException('Produit introuvable dans OpenFoodFacts.');
        }

        $product = $data['product'];
        $nutriments = $product['nutriments'] ?? [];

        $produit = new Produit();
        $produit->code = $code;
        $produit->nom = trim((string) ($product['product_name_fr'] ?? $product['product_name'] ?? '')) ?: 'Produit '.$code;
        $produit->marque = $this->firstBrand($product['brands'] ?? null);

        // Vignette de face (200px) en priorité, avec repli sur les autres tailles.
        $photo = $product['image_front_small_url'] ?? $product['image_front_url'] ?? $product['image_url'] ?? null;
        $produit->photo = is_string($photo) && '' !== $photo ? $photo : null;

        $produit->energieKcal = $this->num($nutriments, 'energy-kcal_100g');
        $produit->energieKj = $this->num($nutriments, 'energy-kj_100g');
        $produit->graisses = $this->num($nutriments, 'fat_100g');
        $produit->graissesSat = $this->num($nutriments, 'saturated-fat_100g');
        $produit->glucides = $this->num($nutriments, 'carbohydrates_100g');
        $produit->sucres = $this->num($nutriments, 'sugars_100g');
        $produit->proteines = $this->num($nutriments, 'proteins_100g');
        $produit->sel = $this->num($nutriments, 'salt_100g');
        $produit->fibres = $this->num($nutriments, 'fiber_100g');
        // OFF exprime fer et calcium en grammes pour 100 g ; Ciqual les attend en mg.
        $produit->fer = $this->num($nutriments, 'iron_100g', 1000);
        $produit->calcium = $this->num($nutriments, 'calcium_100g', 1000);

        return $produit;
    }

    /**
     * Extrait une valeur nutritionnelle (éventuellement absente ou en chaîne),
     * applique un facteur de conversion d'unité et arrondit à 2 décimales.
     */
    private function num(array $nutriments, string $key, float $factor = 1): ?float
    {
        if (!isset($nutriments[$key]) || '' === $nutriments[$key] || !is_numeric($nutriments[$key])) {
            return null;
        }

        return round((float) $nutriments[$key] * $factor, 2);
    }

    /**
     * OFF concatène les marques par des virgules ; on ne garde que la première.
     */
    private function firstBrand(?string $brands): ?string
    {
        if (null === $brands || '' === trim($brands)) {
            return null;
        }

        return trim(explode(',', $brands)[0]);
    }
}
