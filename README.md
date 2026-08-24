# Portfolio — Yassine Boukamir

Site vitrine et deux outils web, en **HTML, CSS et JavaScript purs**.
Aucune dépendance, aucun build, aucun framework.

**En ligne : [boukamir.be](https://boukamir.be)**

[![Tests](https://github.com/yboukamir/portfolio/actions/workflows/tests.yml/badge.svg)](https://github.com/yboukamir/portfolio/actions/workflows/tests.yml)

---

## Structure

```
index.html                     Page unique : à propos, projets, compétences, contact
404.html                       Page d'erreur
robots.txt · sitemap.xml       Référencement
CNAME                          Domaine servi par GitHub Pages
.nojekyll                      Désactive Jekyll : les fichiers sont servis tels quels
_redirects                     Hérité de Netlify, sans effet ici (conservé au cas où)

css/tokens.css                 Couleurs et rythme — partagés par le site ET les outils
css/style.css                  Styles du portfolio
css/outils.css                 Coquille commune aux outils
css/tests.css                  Présentation des pages de tests

js/theme.js                    Bascule clair/sombre, partagée par les trois pages
js/script.js                   Interactions du portfolio

outils/suivi-candidatures/     Suivre ses candidatures (données locales)
  ├ logique.js                 Règles métier — fonctions pures
  ├ cas-de-tests.js            Les 31 cas, sans DOM ni Node
  ├ app.js                     DOM et stockage
  └ tests.html · tests.js      31 tests, sans dépendance

outils/departs-train/          Départs de train en direct (API iRail)
  ├ logique.js                 Traduction des réponses de l'API
  ├ cas-de-tests.js            Les 27 cas, réponses simulées
  ├ app.js                     DOM, réseau, rafraîchissement
  └ tests.html · tests.js      27 tests, réponses simulées

demos/ludobox/                 Boutique fictive : panier, quantités, tiroir latéral
demos/salle-obscure/           Cinéma fictif : séances, plan de salle, billet
                               Deux démonstrations d'interface, autonomes,
                               un seul fichier chacune, sans dépendance.

outils/executer-tests.js       Lance les 58 cas en ligne de commande
.github/workflows/tests.yml    Exécution automatique à chaque poussée
```

## Lancer en local

Un serveur sans dépendance est fourni :

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File .claude/serve.ps1
```

Sur macOS ou Linux :

```bash
python3 -m http.server 5500
```

Puis <http://localhost:5500>. Le serveur PowerShell envoie `Cache-Control: no-store`,
sans quoi le navigateur sert un CSS périmé après chaque modification.

## Les tests

Les deux outils sont couverts par des tests, sans installation ni dépendance :
**31 tests** pour le suivi de candidatures, **27** pour les départs de train.
Ouvre la page `tests.html` de chaque outil : ils s'exécutent au chargement.
Les tests des départs simulent les réponses de l'API — aucun appel réseau.

La logique métier vit dans `logique.js` — validation, nettoyage des données, tri,
filtrage, fusion à l'import. Des fonctions pures : pas de DOM, pas de `localStorage`,
même résultat pour les mêmes entrées. `app.js` les appelle plutôt que d'en garder
une copie, donc les tests portent bien sur le code qui tourne réellement.

**Si tu modifies `logique.js`, relance la page de tests.** Ils tournent aussi
automatiquement à chaque poussée sur GitHub, via `.github/workflows/tests.yml` —
voir le badge en haut de ce fichier.

En ligne de commande, si tu as Node :

```bash
node outils/executer-tests.js
```

Les cas de test vivent dans `cas-de-tests.js`, sans DOM ni Node : le même fichier
sert à la page HTML et au lanceur en ligne de commande. Il n'y a donc qu'une seule
source de vérité.

Pour vérifier que les tests protègent vraiment : casse volontairement une fonction
et recharge la page. Le test correspondant doit passer au rouge. Un test qui ne
devient jamais rouge ne protège de rien — c'est ainsi qu'un défaut a été trouvé
dans le test du tri, qui n'éprouvait qu'un seul ordre d'entrée.

## Les couleurs

Tout est dans `css/tokens.css`. Changer `--accent` suffit à retoner le site et les
outils — mais il y a **trois blocs** à modifier : le thème clair, puis les deux du
thème sombre (`@media` et `[data-theme="dark"]`), qui doivent rester identiques.

`--accent` sert aussi pour du petit texte. Vise au moins **4,5:1** de contraste avec
le fond — le teal actuel est à 5,5:1 en clair et 10,2:1 en sombre. Vérifie sur
[contrastchecker](https://webaim.org/resources/contrastchecker/).

`--erreur` et `--succes` sont volontairement éloignés de `--accent` sur la roue
chromatique — rouge 0°, vert 105°, teal 175° — pour que les messages du formulaire
restent distinguables, y compris en cas de daltonisme.

## Le formulaire de contact

Aucune adresse email n'est affichée sur le site : une adresse en clair se fait
aspirer par les robots à spam. Le formulaire poste vers **Formspree**, qui fait
suivre par mail ; l'adresse de réception est configurée chez eux, jamais dans le code.

- `action` porte l'endpoint Formspree ;
- `js/script.js` poste en `fetch` avec `Accept: application/json`, pour que Formspree
  réponde en JSON au lieu de rediriger — le visiteur reste sur la page ;
- un champ caché `_subject` fixe l'objet du mail ;
- un champ-piège `_gotcha`, invisible et hors du parcours clavier, fait rejeter les
  envois de robots.

⚠️ **Formspree fonctionne aussi depuis `localhost`** : tester le formulaire envoie
un vrai message.

## Déploiement

Automatique : chaque poussée sur `main` publie le site via **GitHub Pages**.
Rien à téléverser, donc aucun écart possible entre ce dépôt et ce qui est en
ligne.

Le domaine `boukamir.be` est chez OVH. L'apex porte les quatre `A` et les quatre
`AAAA` de GitHub Pages, `www` un `CNAME`. Le certificat est un Let's Encrypt
délivré et renouvelé par GitHub.

⚠️ **Ne jamais basculer les serveurs de noms** : la messagerie `@boukamir.be`
et l'enregistrement SPF vivent dans la zone DNS d'OVH.

## Choix techniques

- **Pas de framework.** Un portfolio et deux outils de cette taille n'en ont pas
  besoin ; l'absence de build rend le projet lisible et déployable tel quel.
- **Le DOM se construit avec `createElement` et `textContent`**, jamais par
  concaténation de HTML : les données viennent de saisies utilisateur.
- **Accessibilité** : `aria-live` sur les contenus qui changent seuls, `aria-pressed`
  sur les filtres, `aria-invalid` et `aria-describedby` reliant chaque message
  d'erreur à son champ, mention « nouvel onglet » pour les liens qui en ouvrent
  un, aucune information portée par la couleur seule,
  `prefers-reduced-motion` respecté.
- **Chaque cas d'erreur a son message.** Pas de « une erreur est survenue » unique :
  l'outil des trains distingue gare inconnue, API trop lente et réseau coupé, parce
  que l'utilisateur n'y répond pas de la même façon.
- **Tout est en français** — classes, variables, fonctions, commentaires.
- **Les commentaires expliquent pourquoi, pas quoi.** Beaucoup documentent un piège
  précis : l'attribut `hidden` écrasé par `display:flex`, le cache du navigateur sur
  le CSS, les champs techniques exclus de la validation.
