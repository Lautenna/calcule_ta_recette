import { test, expect } from '@playwright/test'
import { ConnexionPage } from '../../pages/ConnexionPage'
import { CalculateurPage } from '../../pages/CalculateurPage'
import { ProfilPage } from '../../pages/ProfilPage'
import { CHAMPS_NUTRITION } from '../../pages/CarteIngredient'
import { supprimerIngredient } from '../../fixtures/backend'
import { utilisateurMesIngredients, utilisateurValide } from '../../fixtures/utilisateurs'
import { ingredientAEnregistrer } from '../../fixtures/ingredients'

/**
 * Suite : Calculateur — mémoriser un ingrédient saisi à la main (bouton ⭐)
 *
 *   TC_INGREDIENT_011 — connecté     → l'ingrédient est enregistré, et réutilisable
 *   TC_INGREDIENT_012 — non connecté → une connexion est proposée, rien n'est enregistré
 *
 * Le bouton ⭐ est proposé à tout le monde : c'est l'issue du clic qui dépend de
 * la session. D'où deux cas, pour les deux issues.
 *
 * Prérequis JDD : `utilisateurMesIngredients` et `utilisateurValide` doivent
 * exister en base, email confirmé (`npm run seed`).
 */
test.describe('Calculateur — enregistrer un ingrédient', () => {
  /**
   * Nom de l'ingrédient créé par CETTE exécution, suffixé par l'indice du worker
   * Playwright qui la joue.
   *
   * Le compte de test est partagé, et son contenu fait partie de ce que le test
   * vérifie. Deux exécutions simultanées du même cas (`--repeat-each`, réessais
   * en parallèle) enregistreraient donc le même ingrédient dans la même liste :
   * l'une effacerait celui de l'autre, ou en trouverait deux. Le test échouerait
   * sans que l'application y soit pour rien — le pire défaut d'une suite
   * automatisée.
   *
   * Un worker ne joue qu'un test à la fois : son indice suffit donc à garantir
   * que deux exécutions concurrentes ne manipulent jamais le même ingrédient.
   */
  const nomIngredient = () => `${ingredientAEnregistrer.nom} (poste ${test.info().workerIndex})`

  /**
   * On supprime cet ingrédient avant ET après le test : avant, parce qu'une
   * exécution interrompue a pu le laisser derrière elle — le test ne prouverait
   * alors rien en le « retrouvant » dans le profil ; après, pour ne rien laisser
   * traîner en base.
   *
   * On ne vide PAS toute la liste du compte : cela effacerait l'ingrédient d'une
   * exécution concurrente.
   *
   * Sans effet pour le cas non connecté, qui n'enregistre rien.
   */
  test.beforeEach(() => supprimerIngredient(utilisateurMesIngredients.email, nomIngredient()))
  test.afterEach(() => supprimerIngredient(utilisateurMesIngredients.email, nomIngredient()))

  test('TC_INGREDIENT_011_enregistré_ingrédient_connecté — un utilisateur connecté mémorise un ingrédient saisi à la main et le réutilise ensuite', async ({ page }) => {
    const connexion = new ConnexionPage(page)
    const calculateur = new CalculateurPage(page)
    const profil = new ProfilPage(page)
    const carte = calculateur.carteIngredient

    /** Ingrédient du JDD, sous le nom propre à cette exécution. */
    const ingredient = { ...ingredientAEnregistrer, nom: nomIngredient() }

    await test.step('Étant donné un utilisateur connecté ayant saisi un ingrédient inventé', async () => {
      await connexion.ouvrirSession(utilisateurMesIngredients)
      await calculateur.aller()
      await carte.saisirEtValider(ingredient)

      await expect(
        carte.boutonEnregistrerDansMesIngredients,
        'l’application doit proposer de mémoriser un ingrédient saisi à la main',
      ).toBeVisible()
    })

    await test.step('Quand il clique sur « Enregistrer dans mes ingrédients »', async () => {
      await carte.boutonEnregistrerDansMesIngredients.click()
    })

    await test.step('Alors l’enregistrement est confirmé, et ne peut pas être rejoué', async () => {
      await expect(calculateur.notification)
        .toContainText(`« ${ingredient.nom} » ajouté à vos ingrédients.`)

      // Le bouton passe au participe passé et se désactive : c'est le garde-fou
      // contre le doublon créé par un second clic.
      await expect(carte.boutonIngredientEnregistre).toBeVisible()
      await expect(carte.boutonIngredientEnregistre, 'un second clic doit être impossible').toBeDisabled()
    })

    await test.step('Et l’ingrédient figure dans « Mes ingrédients », avec ses valeurs', async () => {
      await profil.aller()

      await expect(profil.sectionIngredients).toBeVisible()
      await expect(profil.ligneIngredient(ingredient.nom), 'l’ingrédient doit figurer dans la liste')
        .toHaveCount(1)

      // Le nom seul ne suffirait pas : on vérifie que les valeurs saisies ont
      // elles aussi été enregistrées, sinon l'ingrédient serait inutilisable.
      await expect(
        profil.resumeIngredient(ingredient.nom),
        'les valeurs nutritionnelles doivent avoir été enregistrées avec le nom',
      ).toHaveText(profil.resumeAttenduIngredient(ingredient.nutrition))
    })

    await test.step('Et il est désormais proposé en suggestion, et restitue ses valeurs', async () => {
      // C'est la raison d'être de l'enregistrement : le retrouver sans avoir à
      // ressaisir ses valeurs nutritionnelles.
      await calculateur.aller()
      await carte.ouvrirSaisieManuelle()
      await carte.rechercher(ingredient.termeRecherchePartiel)

      const suggestion = carte.suggestionPersonnelle(ingredient.nom)
      await expect(suggestion, 'l’ingrédient enregistré doit être proposé').toBeVisible()
      await suggestion.click()

      await expect(carte.champNom).toHaveValue(ingredient.nom)
      for (const { cle, libelle } of CHAMPS_NUTRITION) {
        await expect(
          carte.champNutrition(cle),
          `${libelle} doit être restitué depuis l’ingrédient enregistré`,
        ).toHaveValue(ingredient.nutrition[cle])
      }
    })
  })

  test('TC_INGREDIENT_012_enregistré_ingrédient_NonConnecté — un visiteur non connecté est invité à se connecter, et rien n’est enregistré', async ({ page }) => {
    const connexion = new ConnexionPage(page)
    const calculateur = new CalculateurPage(page)
    const carte = calculateur.carteIngredient

    /**
     * Requêtes d'enregistrement réellement émises par l'application.
     *
     * L'écran ne peut pas prouver qu'aucun enregistrement n'a été tenté : sans
     * session, un appel partirait, échouerait en 401, et l'utilisateur n'en
     * verrait rien. On écoute donc le réseau.
     */
    const tentativesEnregistrement = []
    page.on('request', (requete) => {
      if (requete.method() === 'POST' && requete.url().includes('/api/ingredients')) {
        tentativesEnregistrement.push(requete.url())
      }
    })

    await test.step('Étant donné un visiteur NON connecté ayant saisi un ingrédient inventé', async () => {
      await calculateur.aller()

      // L'application annonce elle-même le comportement attendu au visiteur.
      await expect(calculateur.mentionConnexionProposee).toBeVisible()

      await carte.saisirEtValider(ingredientAEnregistrer)
      await expect(
        carte.boutonEnregistrerDansMesIngredients,
        'le bouton reste proposé, même sans session',
      ).toBeVisible()
    })

    await test.step('Quand il clique sur « Enregistrer dans mes ingrédients »', async () => {
      await carte.boutonEnregistrerDansMesIngredients.click()
    })

    await test.step('Alors il est conduit vers la page de connexion', async () => {
      await expect(page).toHaveURL('/login')
      await expect(connexion.titre).toBeVisible()
    })

    await test.step('Et aucun enregistrement n’a été tenté', async () => {
      expect(
        tentativesEnregistrement,
        'aucune requête d’enregistrement ne doit partir sans session',
      ).toEqual([])

      const jeton = await page.evaluate(() => localStorage.getItem('auth_token'))
      expect(jeton, 'aucune session ne doit avoir été ouverte').toBeNull()
    })

    await test.step('Et une fois connecté, il est ramené au calculateur', async () => {
      // L'invitation tient sa promesse : le visiteur revient là où il en était,
      // et non sur une page sans rapport.
      // Compte volontairement en lecture seule : s'y connecter ne le modifie pas.
      await connexion.seConnecter(utilisateurValide.email, utilisateurValide.motDePasse)
      await expect(page).toHaveURL('/calculateur')
    })
  })
})
