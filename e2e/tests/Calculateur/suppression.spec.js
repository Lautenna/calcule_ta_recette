import { test, expect } from '@playwright/test'
import { CalculateurPage } from '../../pages/CalculateurPage'
import { CHAMPS_NUTRITION } from '../../pages/CarteIngredient'
import { ingredientInvente, ingredientsMultiples } from '../../fixtures/ingredients'

/**
 * Suite : Calculateur — suppression d'un ingrédient
 *
 *   TC_INGREDIENT_006 — une seule ligne  → elle est REMISE À ZÉRO, pas retirée
 *   TC_INGREDIENT_007 — plusieurs lignes → seule la ligne visée est retirée
 *
 * Deux comportements différents pour un même bouton, et c'est voulu : le
 * calculateur garde toujours au moins une ligne, pour que l'utilisateur ne se
 * retrouve jamais devant un formulaire vide. D'où deux cas de test.
 *
 * Aucun compte nécessaire — le calculateur est public.
 */
test.describe('Calculateur — suppression d’un ingrédient', () => {
  test('TC_INGREDIENT_006_suppression_si_1_ingrédient — supprimer la seule ligne ne la retire pas : tous ses champs sont vidés', async ({ page }) => {
    const calculateur = new CalculateurPage(page)
    const carte = calculateur.carteIngredient

    await test.step('Étant donné une seule ligne, renseignée et validée', async () => {
      await calculateur.aller()
      await carte.saisirEtValider(ingredientInvente)

      await expect(calculateur.cartes, 'le calculateur ne doit compter qu’une ligne').toHaveCount(1)
      await expect
        .poll(() => calculateur.valeurParPortion('energie'), {
          message: 'la ligne doit compter dans le tableau avant suppression',
        })
        .toBeGreaterThan(0)
    })

    await test.step('Quand on la supprime', async () => {
      await carte.boutonSupprimer.click()
    })

    await test.step('Alors la ligne subsiste, revenue à son état de départ', async () => {
      // La corbeille ne retire pas la dernière ligne, elle la vide : on retrouve
      // la première étape de l'assistant, comme à l'ouverture de la page.
      await expect(calculateur.cartes, 'la ligne ne doit pas disparaître').toHaveCount(1)
      await expect(carte.etapeChoixType, 'la ligne doit revenir à la première étape').toBeVisible()
      await expect(carte.syntheseNom, 'la synthèse doit avoir disparu').toBeHidden()
      await expect(carte.boutonModifier).toBeHidden()
    })

    await test.step('Et le tableau nutritionnel ne compte plus rien', async () => {
      expect(
        await calculateur.valeurParPortion('energie'),
        'la ligne supprimée ne doit plus peser dans le calcul',
      ).toBe(0)
    })

    await test.step('Et tous les champs de la ligne sont vides', async () => {
      // Contrôle du vidage réel, et non du seul retour à la première étape : une
      // ligne qui garderait ses valeurs les réinjecterait dans le calcul dès sa
      // réouverture.
      await carte.ouvrirSaisieManuelle()

      await expect(carte.champNom, 'le nom doit être vide').toHaveValue('')
      await expect(carte.champQuantite, 'la quantité doit être vide').toHaveValue('')
      for (const { cle, libelle } of CHAMPS_NUTRITION) {
        await expect(carte.champNutrition(cle), `${libelle} doit être vide`).toHaveValue('')
      }
    })
  })

  test('TC_INGREDIENT_007_suppression_si_plusieurs_ingrédient — avec plusieurs lignes, seule la ligne supprimée disparaît', async ({ page }) => {
    const calculateur = new CalculateurPage(page)
    const { conserve, supprime } = ingredientsMultiples

    /**
     * Une carte est un objet à part entière, désigné par son rang : les
     * sélecteurs de la première ne peuvent donc pas déborder sur la seconde. Sans
     * ce cadrage, le test ne pourrait affirmer que « ce nom est quelque part dans
     * la page », pas « c'est bien la ligne restante qui le porte ».
     */
    const premiereLigne = calculateur.carte(0)
    const secondeLigne = calculateur.carte(1)

    /** Énergie par portion avec les DEUX lignes — repère de comparaison. */
    let energieAvecDeuxLignes = 0

    await test.step('Étant donné deux lignes renseignées et validées', async () => {
      await calculateur.aller()
      await calculateur.composer([conserve, supprime])

      await expect(premiereLigne.syntheseNom).toHaveText(conserve.nom)
      await expect(secondeLigne.syntheseNom).toHaveText(supprime.nom)

      energieAvecDeuxLignes = await calculateur.valeurParPortion('energie')
      expect(energieAvecDeuxLignes, 'les deux lignes doivent compter dans le calcul').toBeGreaterThan(0)
    })

    await test.step('Quand on supprime la seconde ligne', async () => {
      await secondeLigne.boutonSupprimer.click()
    })

    await test.step('Alors elle disparaît, et elle seule', async () => {
      await expect(calculateur.cartes, 'il ne doit rester qu’une ligne').toHaveCount(1)

      // La ligne survivante est nommée, à sa place : c'est ce qui distingue une
      // suppression correcte d'une application qui aurait retiré la BONNE ligne
      // par hasard, en gardant les valeurs de la mauvaise.
      await expect(
        premiereLigne.syntheseNom,
        'la ligne restante doit être celle qu’on a conservée',
      ).toHaveText(conserve.nom)
      await expect(premiereLigne.syntheseQuantite).toContainText(`${conserve.quantite} g`)
    })

    await test.step('Et le tableau nutritionnel ne compte plus que la ligne restante', async () => {
      // On compare au repère relevé plus haut au lieu de recalculer un attendu :
      // le total doit baisser (la ligne supprimée ne compte plus) sans tomber à
      // zéro (la ligne conservée, elle, compte toujours).
      const energieRestante = await calculateur.valeurParPortion('energie')

      expect(energieRestante, 'le total doit baisser après la suppression')
        .toBeLessThan(energieAvecDeuxLignes)
      expect(energieRestante, 'la ligne conservée doit continuer de compter')
        .toBeGreaterThan(0)
    })
  })
})
