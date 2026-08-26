/* ==========================================================================
   Suivi de candidatures
   Application autonome, sans dépendance ni serveur. Les données vivent dans
   le localStorage du navigateur.

   1. Constantes · 2. Stockage · 3. Rendu · 4. Formulaire
   5. Filtres · 6. Import / export · 7. Démarrage
   Le site est en thème clair uniquement depuis le 26/08/2026.
   ========================================================================== */

(function () {
  "use strict";

  /* ========== 1. CONSTANTES ========== */

  var CLE_STOCKAGE = "suivi-candidatures";

  /* Toute la logique métier vit dans logique.js, testée par tests.html.
     Ce fichier ne s'occupe que du DOM et du stockage. */
  var L = SuiviLogique;
  var STATUTS = L.STATUTS;

  var $ = function (id) { return document.getElementById(id); };

  var candidatures = [];
  var filtreActif = "toutes";

  /* Éléments du DOM, récupérés une fois. */
  var formulaire   = $("formulaire");
  var listeEl      = $("liste");
  var videEl       = $("vide");
  var statsEl      = $("stats");
  var filtresEl    = $("filtres");
  var noteEl       = $("note-donnees");
  var modeEl       = $("mode-formulaire");
  var boutonValider = $("bouton-valider");
  var boutonAnnuler = $("bouton-annuler");


  /* ========== 2. STOCKAGE ========== */

  function charger() {
    try {
      var brut = localStorage.getItem(CLE_STOCKAGE);
      var donnees = brut ? JSON.parse(brut) : [];
      return Array.isArray(donnees) ? donnees.filter(L.estValide) : [];
    } catch (e) {
      // Données corrompues ou localStorage indisponible : on repart à vide
      // plutôt que de casser la page.
      return [];
    }
  }

  function enregistrer() {
    try {
      localStorage.setItem(CLE_STOCKAGE, JSON.stringify(candidatures));
      return true;
    } catch (e) {
      afficherNote("Impossible d'enregistrer : le stockage du navigateur est plein ou désactivé.", "echec");
      return false;
    }
  }


  /* ========== 3. RENDU ========== */

  /* On construit le DOM par createElement plutôt qu'en concaténant du HTML :
     le nom d'une entreprise peut contenir n'importe quel caractère. */
  function creerLigne(c) {
    var ligne = document.createElement("article");
    ligne.className = "candidature";

    var pastille = document.createElement("span");
    pastille.className = "pastille";
    pastille.setAttribute("data-statut", c.statut);
    pastille.textContent = L.libelleStatut(c.statut);

    var corps = document.createElement("div");
    corps.className = "candidature-corps";

    var titre = document.createElement("h3");
    titre.className = "candidature-titre";
    titre.textContent = c.poste;

    var entreprise = document.createElement("div");
    entreprise.className = "candidature-entreprise";
    entreprise.textContent = c.entreprise;

    corps.appendChild(titre);
    corps.appendChild(entreprise);

    if (c.notes) {
      var notes = document.createElement("p");
      notes.className = "candidature-notes";
      notes.textContent = c.notes;
      corps.appendChild(notes);
    }

    var meta = document.createElement("div");
    meta.className = "candidature-meta";

    if (c.date) {
      var dateEl = document.createElement("span");
      dateEl.textContent = L.formaterDate(c.date);
      meta.appendChild(dateEl);
    }
    if (c.lien) {
      var lien = document.createElement("a");
      lien.href = c.lien;
      lien.target = "_blank";
      lien.rel = "noopener noreferrer";
      lien.textContent = "Voir l'annonce";
      meta.appendChild(lien);
    }
    if (meta.childNodes.length) corps.appendChild(meta);

    var actions = document.createElement("div");
    actions.className = "candidature-actions";

    var modifier = document.createElement("button");
    modifier.type = "button";
    modifier.className = "btn-mini";
    modifier.textContent = "Modifier";
    modifier.setAttribute("aria-label", "Modifier la candidature " + c.poste + " chez " + c.entreprise);
    modifier.addEventListener("click", function () { editer(c.id); });

    var supprimer = document.createElement("button");
    supprimer.type = "button";
    supprimer.className = "btn-mini danger";
    supprimer.textContent = "Supprimer";
    supprimer.setAttribute("aria-label", "Supprimer la candidature " + c.poste + " chez " + c.entreprise);
    supprimer.addEventListener("click", function () { supprimerCandidature(c.id); });

    actions.appendChild(modifier);
    actions.appendChild(supprimer);

    ligne.appendChild(pastille);
    ligne.appendChild(corps);
    ligne.appendChild(actions);
    return ligne;
  }

  function afficher() {
    var visibles = L.trier(L.filtrer(candidatures, filtreActif));

    listeEl.textContent = "";
    visibles.forEach(function (c) { listeEl.appendChild(creerLigne(c)); });

    if (candidatures.length === 0) {
      videEl.textContent = "Aucune candidature pour l'instant. Ajoute la première avec le formulaire ci-dessus.";
      videEl.hidden = false;
    } else if (visibles.length === 0) {
      videEl.textContent = "Aucune candidature avec ce statut.";
      videEl.hidden = false;
    } else {
      videEl.hidden = true;
    }

    afficherStats();
    majFiltres();
  }

  function afficherStats() {
    statsEl.textContent = "";

    var total = document.createElement("div");
    total.className = "stat";
    total.innerHTML = '<span class="stat-nombre"></span><span class="stat-libelle"></span>';
    total.querySelector(".stat-nombre").textContent = String(candidatures.length);
    total.querySelector(".stat-libelle").textContent = "Total";
    statsEl.appendChild(total);

    STATUTS.forEach(function (s) {
      var n = candidatures.filter(function (c) { return c.statut === s.code; }).length;
      if (!n) return; // On n'affiche pas les statuts vides : moins de bruit.

      var bloc = document.createElement("div");
      bloc.className = "stat";
      var nombre = document.createElement("span");
      nombre.className = "stat-nombre";
      nombre.textContent = String(n);
      var libelle = document.createElement("span");
      libelle.className = "stat-libelle";
      libelle.textContent = s.libelle;
      bloc.appendChild(nombre);
      bloc.appendChild(libelle);
      statsEl.appendChild(bloc);
    });
  }


  /* ========== 4. FORMULAIRE ========== */

  /* Les règles vivent dans logique.js ; ici on ne fait qu'afficher leur verdict. */
  function validerFormulaire() {
    var ok = true;

    ["entreprise", "poste", "lien"].forEach(function (nom) {
      var input = $(nom);
      var erreur = L.validerChamp(nom, input.value);
      input.closest(".champ").classList.toggle("invalide", erreur !== "");
      $("erreur-" + nom).textContent = erreur;

      /* La bordure rouge ne dit rien à un lecteur d'écran : aria-invalid le
         signale, aria-describedby (dans le HTML) fait lire le message. */
      if (erreur !== "") input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");

      if (erreur !== "") ok = false;
    });

    return ok;
  }

  function reinitialiser() {
    formulaire.reset();
    $("identifiant").value = "";
    $("date").value = new Date().toISOString().slice(0, 10);
    $("statut").value = "envoyee";
    modeEl.textContent = "Nouvelle candidature";
    boutonValider.textContent = "Ajouter";
    boutonAnnuler.hidden = true;
    formulaire.querySelectorAll(".champ").forEach(function (c) { c.classList.remove("invalide"); });
    formulaire.querySelectorAll(".erreur").forEach(function (e) { e.textContent = ""; });
  }

  function editer(id) {
    var c = candidatures.filter(function (x) { return x.id === id; })[0];
    if (!c) return;

    $("identifiant").value = c.id;
    $("entreprise").value  = c.entreprise;
    $("poste").value       = c.poste;
    $("date").value        = c.date;
    $("statut").value      = c.statut;
    $("lien").value        = c.lien;
    $("notes").value       = c.notes;

    modeEl.textContent = "Modifier la candidature";
    boutonValider.textContent = "Enregistrer";
    boutonAnnuler.hidden = false;

    formulaire.scrollIntoView({ block: "start" });
    $("entreprise").focus();
  }

  function supprimerCandidature(id) {
    var c = candidatures.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    if (!window.confirm("Supprimer la candidature « " + c.poste + " » chez " + c.entreprise + " ?")) return;

    candidatures = candidatures.filter(function (x) { return x.id !== id; });
    enregistrer();
    // Si on supprimait la ligne en cours d'édition, le formulaire doit suivre.
    if ($("identifiant").value === id) reinitialiser();
    afficher();
    afficherNote("Candidature supprimée.", "");
  }

  formulaire.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (!validerFormulaire()) {
      var premier = formulaire.querySelector(".champ.invalide input");
      if (premier) premier.focus();
      return;
    }

    var donnee = L.nettoyer({
      id:         $("identifiant").value,
      entreprise: $("entreprise").value,
      poste:      $("poste").value,
      date:       $("date").value,
      statut:     $("statut").value,
      lien:       $("lien").value,
      notes:      $("notes").value
    });

    var existante = $("identifiant").value !== "";
    if (existante) {
      candidatures = candidatures.map(function (c) { return c.id === donnee.id ? donnee : c; });
    } else {
      candidatures.push(donnee);
    }

    enregistrer();
    reinitialiser();
    afficher();
    afficherNote(existante ? "Candidature mise à jour." : "Candidature ajoutée.", "succes");
  });

  boutonAnnuler.addEventListener("click", reinitialiser);


  /* ========== 5. FILTRES ========== */

  function construireFiltres() {
    filtresEl.textContent = "";

    var choix = [{ code: "toutes", libelle: "Toutes" }].concat(STATUTS);
    choix.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "filtre";
      b.textContent = c.libelle;
      b.setAttribute("data-filtre", c.code);
      b.setAttribute("aria-pressed", String(filtreActif === c.code));
      b.addEventListener("click", function () {
        filtreActif = c.code;
        afficher();
      });
      filtresEl.appendChild(b);
    });
  }

  function majFiltres() {
    filtresEl.querySelectorAll(".filtre").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-filtre") === filtreActif));
    });
  }


  /* ========== 6. IMPORT / EXPORT ========== */

  function afficherNote(texte, classe) {
    noteEl.className = "form-note" + (classe ? " " + classe : "");
    noteEl.textContent = texte;
  }

  $("bouton-exporter").addEventListener("click", function () {
    if (candidatures.length === 0) {
      afficherNote("Rien à exporter pour l'instant.", "");
      return;
    }
    var contenu = JSON.stringify(candidatures, null, 2);
    var blob = new Blob([contenu], { type: "application/json" });
    var url = URL.createObjectURL(blob);

    var a = document.createElement("a");
    a.href = url;
    a.download = "candidatures-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    afficherNote(candidatures.length + " candidature(s) exportée(s).", "succes");
  });

  $("fichier-import").addEventListener("change", function (ev) {
    var fichier = ev.target.files && ev.target.files[0];
    if (!fichier) return;

    var lecteur = new FileReader();
    lecteur.onload = function () {
      try {
        var donnees = JSON.parse(lecteur.result);
        if (!Array.isArray(donnees)) throw new Error("format");

        var fusion = L.fusionnerImport(candidatures, donnees);
        if (fusion.ajoutees === 0 && fusion.ignorees === 0) {
          afficherNote("Aucune candidature exploitable dans ce fichier.", "echec");
          return;
        }

        candidatures = fusion.liste;
        enregistrer();
        afficher();
        afficherNote(fusion.ajoutees + " candidature(s) importée(s), " +
                     fusion.ignorees + " déjà présente(s).", "succes");
      } catch (e) {
        afficherNote("Fichier illisible : il doit s'agir d'un export JSON de cet outil.", "echec");
      } finally {
        ev.target.value = ""; // Permet de réimporter le même fichier.
      }
    };
    lecteur.onerror = function () {
      afficherNote("Impossible de lire le fichier.", "echec");
    };
    lecteur.readAsText(fichier);
  });

  $("bouton-vider").addEventListener("click", function () {
    if (candidatures.length === 0) {
      afficherNote("Il n'y a rien à effacer.", "");
      return;
    }
    if (!window.confirm("Effacer les " + candidatures.length +
                        " candidature(s) ? Cette action est définitive. " +
                        "Pense à exporter avant.")) return;

    candidatures = [];
    enregistrer();
    reinitialiser();
    afficher();
    afficherNote("Toutes les candidatures ont été effacées.", "");
  });


  /* ========== 7. DÉMARRAGE ========== */

  candidatures = charger().map(function (c) { return L.nettoyer(c); });
  construireFiltres();
  reinitialiser();
  afficher();

})();
