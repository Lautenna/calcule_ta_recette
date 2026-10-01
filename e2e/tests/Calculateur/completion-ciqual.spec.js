import { test, expect } from '@playwright/test'
import { CalculateurPage } from '../../pages/CalculateurPage'
import { CHAMPS_NUTRITION } from '../../pages/CarteIngredient'
import { alimentCiqual, PROPRIETE_API, ingredientInvente } from '../../fixtures/ingredients'

/**
 * Suite : Calculateur — complétion automatique depuis la base Ciqual (ANSES)
 *
 *   TC_INGREDIENT_001 — sélectionner un aliment complète énergie, P, G et L
 *   TC_INGREDIENT_003 — sans sélection, rien n'est complété : un ingrédient
 *                       inventé reste saisissable à la main
 *
 * Les deux cas partent du même écran et ne diffèrent que par l'action : cliquer
 * ou non la suggestion. C'est ce contraste qui prouve que la complétion vient
 * bien de la sélection, et de nulle part ailleurs.
 *
 * Prérequis JDD : la table `aliment` doit être peuplée côté backend
 * (`php bin/console app:import-ciqual`). Aucun compte nécessaire — le
 * calculateur est public, les tests jouent en visiteur anonyme.
 */
test.describe('Calculateur — complétion depuis la base Ciqual', () => {
  test('TC_INGREDIENT_001_completer_automatiquement_information_via_ciqual — sélectionner un aliment de la base Ciqual complète automatiquement énergie, P, G et L', async ({ page }) => {
    const calculateur = new CalculateurPage(page)
    const carte = calculateur.carteIngredient

    /** L'aliment tel que l'API l'a renvoyé — attendu du formulaire. */
    let alimentApi

    await test.step("Étant donné le formulaire de saisie d'un ingrédient, vierge", async () => {
      await calculateur.aller()
      await carte.ouvrirSaisieManuelle()

      // Sans ce contrôle, des champs déjà remplis passeraient pour une
      // complétion automatique réussie.
      for (const { cle, libelle } of CHAMPS_NUTRITION) {
        await expect(carte.champNutrition(cle), `${libelle} doit partir vide`).toHaveValue('')
      }
    })

    await test.step("Quand on recherche un aliment de la base et qu'on sélectionne la suggestion", async () => {
      const rechercheCiqual = carte.attendreRechercheCiqual(alimentCiqual.termeRecherche)
      await carte.rechercher(alimentCiqual.termeRecherche)

      const reponse = await rechercheCiqual
      expect(reponse.ok(), `l'API Ciqual doit répondre correctement (reçu ${reponse.status()})`).toBe(true)

      const membres = (await reponse.json()).member ?? []
      alimentApi = membres.find((aliment) => aliment.nom === alimentCiqual.nom)
      expect(
        alimentApi,
        `précondition JDD : « ${alimentCiqual.nom} » doit exister dans la base Ciqual `
        + '(php bin/console app:import-ciqual)',
      ).toBeTruthy()

      await carte.suggestionCiqual(alimentCiqual).click()
    })

    await test.step("Alors le nom retenu est celui de l'aliment, sans son groupe alimentaire", async () => {
      // La suggestion affiche « nom · groupe » pour lever l'ambiguïté entre
      // homonymes ; ce repère de lecture ne doit pas polluer le nom saisi.
      await expect(carte.champNom).toHaveValue(alimentCiqual.nom)
    })

    await test.step('Et les quatre valeurs nutritionnelles reprennent exactement celles servies par l’API', async () => {
      for (const { cle, libelle } of CHAMPS_NUTRITION) {
        const valeurApi = alimentApi[PROPRIETE_API[cle]]

        // Une valeur nulle ou absente viderait de sens l'assertion suivante : le
        // champ resterait vide et le test passerait pour de mauvaises raisons.
        expect(valeurApi, `l'API doit servir une valeur exploitable pour ${libelle}`).toBeGreaterThan(0)

        await expect(
          carte.champNutrition(cle),
          `${libelle} doit reprendre la valeur de l'API`,
        ).toHaveValue(String(valeurApi))
      }
    })

    await test.step("Et l'application ne propose pas de mémoriser cet aliment, déjà présent en base", async () => {
      await expect(carte.boutonEnregistrerDansMesIngredients).toBeHidden()
    })
  })

  test('TC_INGREDIENT_003_completer_à_la_main_information — sans sélection de suggestion, aucune complétion automatique : un ingrédient inventé reste saisissable', async ({ page }) => {
    const calculateur = new CalculateurPage(page)
    const carte = calculateur.carteIngredient

    await test.step("Étant donné le formulaire de saisie d'un ingrédient", async () => {
      await calculateur.aller()
      await carte.ouvrirSaisieManuelle()
    })

    await test.step("Quand on tape le nom d'un aliment connu SANS sélectionner la suggestion", async () => {
      const rechercheCiqual = carte.attendreRechercheCiqual(alimentCiqual.termeRecherche)
      await carte.rechercher(alimentCiqual.termeRecherche)
      await rechercheCiqual

      // Témoin positif : la suggestion est bien là, à portée de clic. C'est ce
      // qui donne son sens à l'assertion suivante — les champs restent vides
      // parce qu'on n'a rien sélectionné, pas parce que la recherche est muette.
      await expect(carte.suggestionCiqual(alimentCiqual)).toBeVisible()
    })

    await test.step("Alors aucune valeur n'est complétée : la saisie seule ne déclenche rien", async () => {
      for (const { cle, libelle } of CHAMPS_NUTRITION) {
        await expect(
          carte.champNutrition(cle),
          `${libelle} doit rester vide faute de sélection`,
        ).toHaveValue('')
      }
    })

    await test.step('Quand on saisit à la place un ingrédient inventé, absent de toute base', async () => {
      const rechercheInventee = carte.attendreRechercheCiqual(ingredientInvente.nom)
      await carte.rechercher(ingredientInvente.nom)

      // On vérifie la précondition là où elle vit : la base ne connaît
      // effectivement pas ce produit. Le test reste valable si le contenu de la
      // base évolue — il échouerait avec un diagnostic clair.
      const total = (await (await rechercheInventee).json()).totalItems ?? 0
      expect(
        total,
        `précondition JDD : « ${ingredientInvente.nom} » ne doit correspondre à aucun aliment de la base`,
      ).toBe(0)
    })

    await test.step("Alors plus aucune suggestion n'est proposée, et les champs restent vides", async () => {
      await expect(carte.suggestions, 'la liste de suggestions doit disparaître').toHaveCount(0)
      await expect(carte.champNom, 'le nom saisi doit être conservé tel quel').toHaveValue(ingredientInvente.nom)
      for (const { cle, libelle } of CHAMPS_NUTRITION) {
        await expect(carte.champNutrition(cle), `${libelle} doit rester vide`).toHaveValue('')
      }
    })

    await test.step("Et l'application reconnaît une saisie manuelle en proposant de la mémoriser", async () => {
      // Miroir de TC_INGREDIENT_001, où ce bouton est absent : l'application
      // distingue bien un aliment issu d'une base d'un ingrédient inventé.
      await expect(carte.boutonEnregistrerDansMesIngredients).toBeVisible()
    })

    await test.step("Et l'ingrédient inventé, complété à la main, est accepté et compté", async () => {
      await carte.saisirQuantite(ingredientInvente.quantite)
      await carte.remplirNutrition(ingredientInvente.nutrition)
      await carte.terminer()

      await expect(carte.boutonModifier).toBeVisible()
      await expect(carte.syntheseNom).toHaveText(ingredientInvente.nom)
      await expect(carte.syntheseQuantite).toContainText(`${ingredientInvente.quantite} g`)

      await expect
        .poll(() => calculateur.valeurParPortion('energie'), {
          message: "l'ingrédient inventé doit peser dans le tableau nutritionnel",
        })
        .toBeGreaterThan(0)
    })
  })
})
