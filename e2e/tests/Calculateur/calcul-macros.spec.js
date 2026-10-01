import { test, expect } from '@playwright/test'
import { CalculateurPage } from '../../pages/CalculateurPage'
import { recetteACalculer } from '../../fixtures/ingredients'

/**
 * Suite : Recette — exactitude du calcul nutritionnel
 *
 *   TC_RECETTE_003 — PAR PORTION = total de la recette ÷ nombre de portions
 *   TC_RECETTE_004 — les macros elles-mêmes sont justes, de la saisie au total
 *
 * C'est LA raison d'être de l'application : un utilisateur qui compose sa recette
 * ne peut pas vérifier le résultat, il le prend pour argent comptant. Un calcul
 * faux ne se voit pas à l'écran — d'où deux cas dédiés, dont les attendus sont
 * posés à la main dans le JDD (fixtures/ingredients.js) et jamais recalculés avec
 * la formule de l'application.
 *
 * Découpage en deux cas plutôt qu'un seul : ils échouent pour des raisons
 * différentes. TC_RECETTE_004 met en cause la mise à l'échelle des valeurs pour
 * 100 g ou la somme ; TC_RECETTE_003, la division par les portions. Un cas unique
 * qui échoue ne dirait pas lequel des deux est en cause.
 *
 * Aucun compte nécessaire : le calculateur est public.
 */

/**
 * Compose la recette du JDD dans le calculateur et déplie le détail.
 *
 * Préalable commun aux deux cas, et la saisie n'est l'objet ni de l'un ni de
 * l'autre : elle est déjà couverte par TC_INGREDIENT_001 à 005. Chaque ingrédient
 * est saisi dans SA carte (cf. `CalculateurPage.composer`), ce qui garantit
 * qu'aucune valeur du JDD n'atterrit dans la ligne voisine — auquel cas le
 * tableau serait faux pour une raison étrangère au calcul.
 */
async function composerLaRecette(calculateur) {
  await calculateur.aller()
  await calculateur.composer(recetteACalculer.ingredients)
  await calculateur.afficherDetailParIngredient()
}

test.describe('Recette — exactitude du calcul nutritionnel', () => {
  test('TC_RECETTE_003_macro_calcul_portion — les valeurs par portion sont le total de la recette divisé par le nombre de portions', async ({ page }) => {
    const calculateur = new CalculateurPage(page)
    const { total, parPortion } = recetteACalculer

    await test.step('Étant donné une recette dont le total est connu', async () => {
      await composerLaRecette(calculateur)

      // Point de départ du cas : sans un total juste, un « par portion » juste ne
      // voudrait rien dire. Son détail, lui, est vérifié par TC_RECETTE_004.
      await expect
        .poll(() => calculateur.valeursDe(calculateur.ligneTotal), {
          message: 'le total de la recette doit être celui attendu avant toute division',
        })
        .toEqual(total)
    })

    for (const { portions, attendu } of parPortion) {
      await test.step(`Quand l'utilisateur règle la recette sur ${portions} portions`, async () => {
        await calculateur.reglerPortions(portions)
      })

      await test.step(`Alors chaque portion vaut le total divisé par ${portions}`, async () => {
        await expect
          .poll(() => calculateur.valeursDe(calculateur.ligneParPortion), {
            message: `chaque colonne doit valoir son total divisé par ${portions}`,
          })
          .toEqual(attendu)
      })

      await test.step(`Et le total de la recette, lui, reste inchangé`, async () => {
        // Le curseur ne doit rien changer à la recette elle-même : c'est
        // l'affichage du résultat qui se divise, pas les quantités saisies. Une
        // application qui diviserait le total en place donnerait un résultat
        // faux au réglage suivant — d'où ce contrôle à chaque itération.
        expect(
          await calculateur.valeursDe(calculateur.ligneTotal),
          'changer le nombre de portions ne doit pas modifier le total de la recette',
        ).toEqual(total)
      })

      await test.step(`Et la roue des macronutriments annonce la même énergie par portion`, async () => {
        // Deuxième affichage de la même valeur : les deux doivent découler du
        // même calcul, sinon l'utilisateur lit deux chiffres contradictoires sur
        // un même écran.
        await expect(
          calculateur.roueMacros(attendu.energie),
          `la roue doit annoncer ${attendu.energie} kcal par portion`,
        ).toBeVisible()
      })
    }
  })

  test('TC_RECETTE_004_macro_calcul — chaque macro est mise à l’échelle de la quantité, puis additionnée', async ({ page }) => {
    const calculateur = new CalculateurPage(page)
    const { ingredients, total, pour100g } = recetteACalculer

    await test.step('Étant donné une recette de deux ingrédients aux valeurs connues', async () => {
      await composerLaRecette(calculateur)
    })

    for (const { nom, quantite, contribution } of ingredients) {
      await test.step(`Alors « ${nom} » compte pour sa quantité (${quantite} g), pas pour ses valeurs pour 100 g`, async () => {
        // Les valeurs saisies décrivent 100 g de produit : la ligne du tableau
        // doit les avoir ramenées à la quantité réellement utilisée
        // (× quantité / 100). C'est l'erreur la plus facile à commettre — et la
        // plus invisible, puisque le tableau reste plausible.
        await expect
          .poll(() => calculateur.valeursDe(calculateur.ligneIngredient(nom)), {
            message: `la ligne « ${nom} » doit valoir ses valeurs pour 100 g × ${quantite} / 100`,
          })
          .toEqual(contribution)
      })
    }

    await test.step('Et le total de la recette est la somme des deux lignes', async () => {
      expect(
        await calculateur.valeursDe(calculateur.ligneTotal),
        'le total doit additionner les contributions, poids compris',
      ).toEqual(total)
    })

    await test.step('Et la ligne « Pour 100g » ramène ce total à 100 g', async () => {
      // Le total pèse 400 g : la colonne « Pour 100 g » doit donc valoir le quart
      // du total, et sa propre quantité afficher 100 g.
      expect(
        await calculateur.valeursDe(calculateur.lignePour100g),
        'le total doit être ramené au poids de référence de 100 g',
      ).toEqual(pour100g)
    })
  })
})
