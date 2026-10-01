import { test, expect } from '@playwright/test'
import { ConnexionPage } from '../../pages/ConnexionPage'
import { CalculateurPage } from '../../pages/CalculateurPage'
import { utilisateurAvecRecette } from '../../fixtures/utilisateurs'
import { recetteEnregistree } from '../../fixtures/ingredients'

/**
 * Suite : Calculateur — réutiliser une recette enregistrée comme ingrédient
 *
 *   TC_INGREDIENT_010 — une recette du compte s'ajoute comme ingrédient
 *
 * Une recette déjà enregistrée peut servir d'ingrédient dans une nouvelle
 * recette (une base, une sauce…). L'application calcule alors son profil pour
 * 100 g depuis sa composition, et l'utilisateur en indique une quantité en
 * grammes, comme pour n'importe quel ingrédient.
 *
 * Prérequis JDD : le compte `utilisateurAvecRecette` doit exister et posséder la
 * recette `recetteEnregistree` (`npm run seed` garantit les deux).
 */
test.describe('Calculateur — recette enregistrée comme ingrédient', () => {
  test('TC_INGREDIENT_010_ajout_recette_enregistré — un utilisateur ajoute une de ses recettes comme ingrédient, avec son profil pour 100 g', async ({ page }) => {
    const connexion = new ConnexionPage(page)
    const calculateur = new CalculateurPage(page)
    const carte = calculateur.carteIngredient

    await test.step('Étant donné un utilisateur connecté qui possède une recette enregistrée', async () => {
      await connexion.ouvrirSession(utilisateurAvecRecette)
      await calculateur.aller()
    })

    await test.step('Quand il choisit le type « Recette » puis la sélectionne dans la liste', async () => {
      await carte.choixTypeRecette.click()

      // La liste est désactivée quand le compte n'a aucune recette : attendre
      // qu'elle soit utilisable vérifie au passage que les recettes du compte ont
      // bien été chargées.
      await expect(carte.champRecette, 'la liste des recettes doit être utilisable').toBeEnabled()
      await carte.choisirRecette(recetteEnregistree.nom)
    })

    await test.step('Alors le profil nutritionnel pour 100 g de la recette est calculé et affiché', async () => {
      // Attendu calculé à la main depuis la composition amorcée par seed.sql :
      // c'est ce qui prouve que l'application ramène bien la recette entière à
      // 100 g, au lieu de reprendre les valeurs d'un de ses ingrédients.
      //
      // Le profil est LU là où l'application l'affiche, puis comparé mot pour mot
      // à l'attendu : un chiffre faux se lit alors dans le rapport, au lieu d'un
      // simple « élément introuvable » qui n'apprendrait rien.
      await expect(carte.profilRecette)
        .toHaveText(carte.profilRecetteAttendu(recetteEnregistree.profilPour100g))
    })

    await test.step("Et l'application ne propose pas de la mémoriser comme ingrédient", async () => {
      // Une recette est déjà enregistrée par nature : le bouton ⭐ n'aurait aucun
      // sens ici (comparer avec TC_INGREDIENT_011, où il est bien proposé).
      await expect(carte.boutonEnregistrerDansMesIngredients).toBeHidden()
    })

    await test.step('Quand il en saisit une quantité et valide', async () => {
      await carte.champQuantiteRecette.fill(recetteEnregistree.quantite)
      await carte.terminer()
    })

    await test.step('Alors la ligne validée est clairement identifiée comme une recette', async () => {
      await expect(carte.boutonModifier, 'la carte doit se replier une fois validée').toBeVisible()
      await expect(carte.syntheseNom).toHaveText(recetteEnregistree.nom)
      await expect(carte.marqueurRecette, 'la ligne doit être signalée « recette »').toBeVisible()
      await expect(carte.syntheseQuantite).toContainText(`${recetteEnregistree.quantite} g`)
      await expect(carte.syntheseEnergie)
        .toContainText(`${recetteEnregistree.profilPour100g.energie} kcal`)
    })

    await test.step('Et elle compte dans le tableau nutritionnel de la nouvelle recette', async () => {
      await expect
        .poll(() => calculateur.valeurParPortion('energie'), {
          message: 'la recette réutilisée doit peser dans le calcul',
        })
        .toBeGreaterThan(0)
    })
  })
})
