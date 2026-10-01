import { test, expect } from '@playwright/test'
import { CalculateurPage } from '../../pages/CalculateurPage'
import { CHAMPS_NUTRITION } from '../../pages/CarteIngredient'
import { alimentCiqual, ingredientInvente, quantiteValide } from '../../fixtures/ingredients'

/**
 * Suite : Calculateur — validation d'un ingrédient (bouton « Terminer »)
 *
 * Ce que la validation refuse, et ce qu'elle produit quand elle accepte :
 *
 *   TC_INGREDIENT_002 — quantité manquante → refus
 *   TC_INGREDIENT_004 — valeurs nutritionnelles manquantes → refus
 *   TC_INGREDIENT_005 — carte complète → repliement sur la ligne de synthèse
 *
 * Aucun compte nécessaire — le calculateur est public.
 */
test.describe('Calculateur — validation d’un ingrédient', () => {
  /** Valeurs nutritionnelles du JDD, privées d'une macro (pour tester son absence). */
  function nutritionSauf(cle) {
    const valeurs = { ...ingredientInvente.nutrition }
    delete valeurs[cle]

    return valeurs
  }

  test('TC_INGREDIENT_002_completer_quantité_recette — sans quantité, l’ingrédient ne peut pas être validé ni compté dans la recette', async ({ page }) => {
    const calculateur = new CalculateurPage(page)
    const carte = calculateur.carteIngredient

    await test.step('Étant donné un aliment Ciqual sélectionné, dont il ne manque QUE la quantité', async () => {
      await calculateur.aller()
      await carte.ouvrirSaisieManuelle()

      const rechercheCiqual = carte.attendreRechercheCiqual(alimentCiqual.termeRecherche)
      await carte.rechercher(alimentCiqual.termeRecherche)
      await rechercheCiqual
      await carte.suggestionCiqual(alimentCiqual).click()

      // Point clé du scénario : tout le reste est complet. Si la validation est
      // refusée, la quantité en est la seule cause possible.
      await expect(carte.champQuantite, 'la quantité doit rester vide').toHaveValue('')
      for (const { cle, libelle } of CHAMPS_NUTRITION) {
        await expect(carte.champNutrition(cle), `${libelle} doit être renseigné`).not.toHaveValue('')
      }
    })

    await test.step('Quand on tente de valider la carte sans saisir de quantité', async () => {
      await carte.terminer()
    })

    await test.step('Alors la validation est refusée et la quantité est signalée en erreur', async () => {
      await expect(carte.champQuantite).toHaveAttribute('aria-invalid', 'true')

      const messageErreur = await carte.messageErreurDe(carte.champQuantite)
      await expect(messageErreur).toHaveText('Quantité obligatoire')
    })

    await test.step('Et le refus porte bien sur la quantité, pas sur le reste de la carte', async () => {
      await carte.attendreChampValide(carte.champNom, 'le nom')
      for (const { cle, libelle } of CHAMPS_NUTRITION) {
        await carte.attendreChampValide(carte.champNutrition(cle), libelle)
      }
    })

    await test.step("Et la carte reste ouverte en saisie : rien n'est validé", async () => {
      await expect(carte.boutonModifier, 'la carte ne doit pas se replier').toBeHidden()
      await expect(carte.etapeSaisie, 'le formulaire doit rester affiché').toBeVisible()
    })

    await test.step("Et l'ingrédient ne compte pas dans le tableau nutritionnel", async () => {
      // Un ingrédient sans quantité ne pèse rien : le calcul ne doit jamais
      // reposer sur une saisie incomplète.
      expect(
        await calculateur.valeurParPortion('energie'),
        "l'énergie par portion doit rester nulle tant que la quantité manque",
      ).toBe(0)
    })

    await test.step('Quand la quantité est enfin saisie, la validation passe et le calcul se fait', async () => {
      await carte.saisirQuantite(quantiteValide)
      await carte.terminer()

      await expect(carte.boutonModifier, 'la carte doit se replier une fois validée').toBeVisible()
      await expect(carte.syntheseNom).toHaveText(alimentCiqual.nom)
      await expect(carte.syntheseQuantite).toContainText(`${quantiteValide} g`)

      await expect
        .poll(() => calculateur.valeurParPortion('energie'), {
          message: "l'énergie par portion doit être calculée à partir de la quantité saisie",
        })
        .toBeGreaterThan(0)
    })
  })

  test('TC_INGREDIENT_004_completer_macro_manuel — les quatre valeurs nutritionnelles sont exigées avant toute validation', async ({ page }) => {
    const calculateur = new CalculateurPage(page)
    const carte = calculateur.carteIngredient

    await test.step('Étant donné un ingrédient inventé dont seuls le nom et la quantité sont renseignés', async () => {
      await calculateur.aller()
      await carte.ouvrirSaisieManuelle()
      await carte.rechercher(ingredientInvente.nom)
      await carte.saisirQuantite(ingredientInvente.quantite)
    })

    await test.step('Quand on tente de valider sans aucune valeur nutritionnelle', async () => {
      await carte.terminer()
    })

    await test.step('Alors les quatre champs sont signalés en erreur et la carte reste ouverte', async () => {
      for (const { cle, libelle } of CHAMPS_NUTRITION) {
        await expect(carte.champNutrition(cle), `${libelle} doit être signalé obligatoire`)
          .toHaveAttribute('aria-invalid', 'true')

        const messageErreur = await carte.messageErreurDe(carte.champNutrition(cle))
        await expect(messageErreur).toHaveText('Obligatoire')
      }

      await expect(carte.boutonModifier, 'la carte ne doit pas se replier').toBeHidden()
      await carte.attendreChampValide(carte.champQuantite, 'la quantité')
    })

    /**
     * Vérifier le refus « toutes valeurs vides » ne suffit pas : une validation
     * qui n'exigerait que l'énergie passerait ce contrôle. On reprend donc le
     * scénario en ne laissant manquer qu'UNE macro à la fois — seule façon de
     * prouver que chacune est réellement exigée.
     */
    for (const { cle, libelle } of CHAMPS_NUTRITION) {
      await test.step(`Et la validation reste refusée lorsque seul ${libelle} manque`, async () => {
        await carte.remplirNutrition(nutritionSauf(cle))
        await carte.terminer()

        await expect(carte.champNutrition(cle), `${libelle} doit être signalé manquant`)
          .toHaveAttribute('aria-invalid', 'true')
        await expect(carte.boutonModifier, 'la carte ne doit pas se replier').toBeHidden()

        // Les trois autres étant renseignées, elles ne doivent pas être mises en
        // cause : le message doit désigner la bonne case à corriger.
        for (const autre of CHAMPS_NUTRITION.filter((champ) => champ.cle !== cle)) {
          await carte.attendreChampValide(carte.champNutrition(autre.cle), autre.libelle)
        }
      })
    }

    await test.step('Alors la validation ne passe qu’une fois les quatre valeurs renseignées', async () => {
      await carte.remplirNutrition(ingredientInvente.nutrition)
      await carte.terminer()

      await expect(carte.boutonModifier, 'la carte doit se replier une fois validée').toBeVisible()
      await expect(carte.syntheseNom).toHaveText(ingredientInvente.nom)
    })
  })

  test('TC_INGREDIENT_005_validation_ingrédient — le bouton « Terminer » replie la carte sur sa synthèse, sans rien perdre de la saisie', async ({ page }) => {
    const calculateur = new CalculateurPage(page)
    const carte = calculateur.carteIngredient

    /**
     * Énergie par portion AVANT validation : elle ne doit pas bouger.
     */
    let energieAvantValidation = 0

    await test.step('Étant donné un ingrédient entièrement renseigné, pas encore validé', async () => {
      await calculateur.aller()
      await carte.ouvrirSaisieManuelle()
      await carte.rechercher(ingredientInvente.nom)
      await carte.saisirQuantite(ingredientInvente.quantite)
      await carte.remplirNutrition(ingredientInvente.nutrition)

      await expect(carte.boutonModifier, 'la carte ne doit pas encore être validée').toBeHidden()
      await expect(carte.syntheseNom, 'aucune synthèse avant validation').toBeHidden()

      energieAvantValidation = await calculateur.valeurParPortion('energie')
      expect(energieAvantValidation, 'la saisie doit déjà alimenter le calcul').toBeGreaterThan(0)
    })

    await test.step('Quand on appuie sur « Terminer »', async () => {
      await carte.terminer()
    })

    await test.step('Alors la carte se replie sur une synthèse : nom, quantité et énergie', async () => {
      // Le repère (`data-testid`) dit OÙ lire, l'assertion dit QUOI : un écart de
      // valeur se lit alors dans le rapport (« 90 g » au lieu de « 75 g »), là où
      // une recherche par texte se contenterait de ne rien trouver.
      await expect(carte.boutonModifier).toBeVisible()
      await expect(carte.syntheseNom).toHaveText(ingredientInvente.nom)
      await expect(carte.syntheseQuantite).toContainText(`${ingredientInvente.quantite} g`)
      await expect(carte.syntheseEnergie).toContainText(`${ingredientInvente.nutrition.energie} kcal`)
    })

    await test.step('Et le formulaire de saisie cède la place', async () => {
      await expect(carte.etapeSaisie).toBeHidden()
      await expect(carte.champNom).toBeHidden()
      await expect(carte.boutonTerminer).toBeHidden()
    })

    await test.step('Et la validation ne change rien au calcul déjà affiché', async () => {
      // Ni perte, ni double comptage : valider met en forme, ça ne recalcule pas.
      expect(
        await calculateur.valeurParPortion('energie'),
        'la validation ne doit pas modifier le tableau nutritionnel',
      ).toBe(energieAvantValidation)
    })

    await test.step('Et « Modifier » rouvre la carte avec toutes ses valeurs conservées', async () => {
      await carte.boutonModifier.click()

      await expect(carte.champNom).toHaveValue(ingredientInvente.nom)
      await expect(carte.champQuantite).toHaveValue(ingredientInvente.quantite)
      for (const { cle, libelle } of CHAMPS_NUTRITION) {
        await expect(
          carte.champNutrition(cle),
          `${libelle} doit avoir été conservé à la validation`,
        ).toHaveValue(ingredientInvente.nutrition[cle])
      }
    })

    await test.step('Et « Annuler les modifications » ramène à la carte validée', async () => {
      await carte.lienAnnulerModifications.click()

      await expect(carte.boutonModifier).toBeVisible()
      await expect(carte.syntheseNom).toHaveText(ingredientInvente.nom)
    })
  })
})
