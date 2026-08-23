# Mon site

Site vitrine / portfolio en HTML, CSS et JavaScript purs. **Aucune installation, aucun build** :
double-clique sur `index.html` et le site s'ouvre dans ton navigateur.

## Structure

```
Mon site/
├─ index.html        ← tout le contenu et le texte du site
├─ css/style.css     ← toute l'apparence (couleurs, tailles, espacements)
├─ js/script.js      ← les interactions (menu, thème, formulaire)
├─ assets/           ← tes images (photo, captures de projets)
└─ README.md         ← ce fichier
```

## Voir le site en local

Le plus simple : double-clique sur `index.html`.

Certaines fonctions (polices distantes, futures requêtes réseau) se comportent mieux via un vrai
serveur. Un petit serveur sans dépendance est fourni — lance-le depuis le dossier du site :

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File .claude/serve.ps1
```

Puis ouvre <http://localhost:5500>. `Ctrl+C` dans la fenêtre pour l'arrêter.

## Par où commencer

Tout ce qu'il y a à personnaliser est marqué par un texte évident (`Ton Nom`, `Nom du projet`,
`ton@email.com`). Dans l'ordre :

1. **`index.html`** — remplace `Ton Nom` partout (titre de l'onglet, logo, hero, pied de page),
   écris ton texte « À propos », tes 3 projets, ton email et tes liens de réseaux sociaux.
2. **Ta photo** — dépose l'image dans `assets/`, puis dans `index.html` remplace le bloc
   `<span class="photo-placeholder">…</span>` par
   `<img src="assets/photo.jpg" alt="Portrait de Ton Nom">`.
3. **Les couleurs** — dans `css/style.css`, tout est en haut, section 1.
   Changer `--accent` suffit à retoner tout le site. Attention : il y a **trois**
   endroits à modifier (thème clair, puis les deux blocs du thème sombre — celui
   du `@media` et celui du `[data-theme="dark"]`, qui doivent rester identiques).

   `--accent` sert aussi pour du petit texte (liens, intitulés de section) : vise
   au moins **4,5:1** de contraste avec le fond, sinon le texte devient dur à lire.
   Vérifie sur [contrastchecker](https://webaim.org/resources/contrastchecker/).
   Le teal actuel est à 5,5:1 en clair et 10,2:1 en sombre.

   `--erreur` et `--succes` (messages du formulaire) suivent la même règle et sont
   choisis loin de `--accent` sur la roue chromatique : rouge 0°, vert 105°,
   teal 175°. Si tu changes `--accent` pour une teinte chaude, décale le rouge
   d'erreur vers un cramoisi (~340°) pour garder l'écart.

## Ce qui marche déjà

- Responsive (mobile, tablette, ordinateur) avec menu burger
- Thème clair / sombre : suit le réglage du système, et le bouton mémorise le choix
- Apparition des éléments au défilement, désactivée si le système demande moins d'animations
- Lien de navigation surligné selon la section visible
- Accessibilité : lien d'évitement, contours de focus visibles, HTML sémantique, labels de formulaire
- Validation du formulaire de contact

## Le formulaire de contact (Formspree)

Le site n'affiche aucune adresse email — choix délibéré : une adresse en clair se fait
aspirer par les robots à spam. Le formulaire est donc **le seul moyen de te joindre**
depuis le site (avec LinkedIn en secours, en pied de page).

Il poste vers **Formspree**, qui fait suivre les messages par mail. L'adresse de
destination est configurée dans ton compte Formspree : elle n'apparaît **nulle part**
dans le code, donc elle n'est pas récoltable.

- l'attribut `action` du `<form>` porte l'endpoint `https://formspree.io/f/mljrvvkd` ;
- `js/script.js` (section 6) poste en `fetch` avec l'en-tête `Accept: application/json`,
  pour que Formspree réponde en JSON au lieu de rediriger vers sa page de remerciement —
  le visiteur reste sur ta page et voit ton propre message ;
- un champ caché `_subject` fixe l'objet du mail (« Nouveau message depuis ton
  portfolio ») ; le champ `email` du visiteur sert d'adresse de réponse, tu peux donc
  répondre directement au mail ;
- un champ-piège nommé `_gotcha`, invisible et hors du parcours clavier, fait rejeter
  les envois de robots. Le nom est imposé par Formspree.

**Pour changer l'adresse de réception** : dans ton compte Formspree, pas dans le code.

**Le quota gratuit est de 50 messages par mois.** Large pour un portfolio, mais si tu
approches la limite, Formspree t'avertit.

### Attention en local

Contrairement à l'ancien montage Netlify Forms, Formspree fonctionne aussi depuis
`localhost`. Un test depuis ton ordinateur **envoie donc un vrai message** dans ta boîte.

### Pourquoi pas Netlify Forms

Le site a d'abord utilisé Netlify Forms, qui enregistrait bien les messages. Mais les
**notifications par mail sont passées en offre payante** : les messages arrivaient dans
le tableau de bord sans que rien ne prévienne. Inutilisable pour une recherche d'emploi.
## Mettre le site en ligne (gratuit)

**Netlify Drop** — le plus rapide : va sur [app.netlify.com/drop](https://app.netlify.com/drop)
et glisse le dossier `Mon site` dans la page. Le site est en ligne en quelques secondes.

**GitHub Pages** — désormais possible : depuis le passage à Formspree, le formulaire
fonctionne quel que soit l'hébergeur. Si tu veux un historique des versions :


```bash
git init && git add . && git commit -m "Première version du site"
```

Puis crée un dépôt sur GitHub, pousse le code, et dans *Settings → Pages* choisis la branche
`main`. Le site sera sur `https://ton-pseudo.github.io/nom-du-depot/`.

## À faire ensuite (idées)

- Une page par projet, au lieu du lien `#`
- Une vraie favicon et une image de partage (Open Graph) dans `assets/`
- Un `sitemap.xml` et un `robots.txt` pour le référencement
