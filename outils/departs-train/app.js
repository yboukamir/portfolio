/* ==========================================================================
   Départs de train
   Interroge l'API publique iRail (https://docs.irail.be/) directement depuis
   le navigateur. Aucun serveur intermédiaire, aucune clé d'authentification.

   1. Constantes · 2. Appel réseau · 3. Rendu · 4. Rafraîchissement
   5. Interface · 6. Démarrage
   La bascule de thème est dans ../../js/theme.js.
   ========================================================================== */

(function () {
  "use strict";

  /* ========== 1. CONSTANTES ========== */

  var API = "https://api.irail.be/liveboard/";
  var CLE_GARE = "departs-train-gare";
  var GARE_DEFAUT = "Charleroi-Central";
  var INTERVALLE = 60;          // secondes entre deux rafraîchissements
  var DELAI_MAX = 12000;        // abandon d'une requête trop lente (ms)

  var RACCOURCIS = [
    "Charleroi-Central", "Bruxelles-Midi", "Namur",
    "Mons", "Ottignies", "Liège-Guillemins"
  ];

  var $ = function (id) { return document.getElementById(id); };

  var gareActuelle = "";
  var chargementEnCours = false;
  var minuteur = null;
  var secondesRestantes = INTERVALLE;

  var etatEl        = $("etat");
  var departsEl     = $("departs");
  var majEl         = $("maj");
  var nomGareEl     = $("nom-gare");
  var compteurEl    = $("compte-a-rebours");
  var champGare     = $("gare");
  var erreurGareEl  = $("erreur-gare");
  var boutonChercher = $("bouton-chercher");


  /* ========== 2. APPEL RÉSEAU ========== */

  /* AbortController : sans délai maximum, une requête qui n'aboutit jamais
     laisse l'interface bloquée sur « Chargement » indéfiniment. */
  function interroger(gare) {
    var controleur = new AbortController();
    var expiration = setTimeout(function () { controleur.abort(); }, DELAI_MAX);

    var url = API + "?station=" + encodeURIComponent(gare) +
              "&format=json&lang=fr";

    return fetch(url, { signal: controleur.signal })
      .then(function (reponse) {
        clearTimeout(expiration);

        // iRail répond 404 ou 400 pour une gare inconnue : c'est une erreur
        // d'utilisateur, pas une panne. On la distingue pour le message.
        if (reponse.status === 400 || reponse.status === 404) {
          var erreurGare = new Error("gare-inconnue");
          erreurGare.nom = "GareInconnue";
          throw erreurGare;
        }
        if (!reponse.ok) throw new Error("HTTP " + reponse.status);
        return reponse.json();
      })
      .catch(function (e) {
        clearTimeout(expiration);
        if (e.name === "AbortError") {
          var lent = new Error("trop-lent");
          lent.nom = "TropLent";
          throw lent;
        }
        throw e;
      });
  }

  /* La logique métier — normalisation des réponses de l'API, libellés,
     règles d'affichage — vit dans logique.js, couverte par tests.html. */
  var L = DepartsLogique;

  function creerLigne(d) {
    var ligne = document.createElement("article");
    ligne.className = "depart" + (d.supprime ? " supprime" : "");

    /* --- Heures --- */
    var heures = document.createElement("div");
    heures.className = "depart-heures";

    if (L.afficheRetard(d)) {
      // Heure réelle en gros, heure théorique barrée en dessous.
      var reelle = document.createElement("span");
      reelle.className = "depart-heure";
      reelle.textContent = L.formaterHeure(L.heureReelle(d));

      var retard = document.createElement("span");
      retard.className = "depart-retard";
      retard.textContent = "+" + d.retard + " min";

      var theorique = document.createElement("span");
      theorique.className = "depart-heure decalee";
      theorique.textContent = L.formaterHeure(d.horodatage);

      heures.appendChild(reelle);
      heures.appendChild(retard);
      heures.appendChild(theorique);
    } else {
      var heure = document.createElement("span");
      heure.className = "depart-heure";
      heure.textContent = L.formaterHeure(d.horodatage);
      heures.appendChild(heure);
    }

    /* --- Destination --- */
    var destination = document.createElement("div");
    destination.className = "depart-destination";

    var vers = document.createElement("div");
    vers.className = "depart-vers";
    vers.textContent = d.destination;
    destination.appendChild(vers);

    if (d.ligne) {
      var ligneEl = document.createElement("div");
      ligneEl.className = "depart-ligne";
      ligneEl.textContent = L.libelleLigne(d);
      destination.appendChild(ligneEl);
    }
    if (d.supprime) {
      var etiquette = document.createElement("span");
      etiquette.className = "etiquette-supprime";
      etiquette.textContent = "Supprimé";
      destination.appendChild(etiquette);
    }

    /* --- Quai --- */
    var quai = document.createElement("div");
    quai.className = "depart-quai";
    var libelle = document.createElement("span");
    libelle.className = "quai-libelle";
    libelle.textContent = "Quai";
    var numero = document.createElement("span");
    numero.className = "quai-numero";
    numero.textContent = L.libelleQuai(d);
    quai.appendChild(libelle);
    quai.appendChild(numero);

    ligne.appendChild(heures);
    ligne.appendChild(destination);
    ligne.appendChild(quai);
    return ligne;
  }

  function afficherSquelette() {
    departsEl.textContent = "";
    for (var i = 0; i < 4; i++) {
      var s = document.createElement("div");
      s.className = "squelette";
      departsEl.appendChild(s);
    }
  }

  function afficherEtat(texte, echec) {
    etatEl.className = "etat" + (echec ? " echec" : "");
    etatEl.textContent = texte;
  }


  /* ========== 4. RAFRAÎCHISSEMENT ========== */

  function charger(gare, silencieux) {
    if (chargementEnCours) return;
    chargementEnCours = true;
    boutonChercher.disabled = true;

    // Au rafraîchissement automatique, on garde la liste précédente à l'écran :
    // la faire clignoter toutes les minutes serait pénible.
    if (!silencieux) {
      afficherSquelette();
      afficherEtat("Chargement des départs…", false);
    }

    interroger(gare)
      .then(function (donnees) {
        var departs = L.normaliser(donnees);
        departsEl.textContent = "";

        if (departs.length === 0) {
          afficherEtat("Aucun départ annoncé pour l'instant — c'est normal la nuit " +
                       "ou en cas d'interruption de trafic.", false);
        } else {
          departs.forEach(function (d) { departsEl.appendChild(creerLigne(d)); });
          afficherEtat(departs.length + " départ" + (departs.length > 1 ? "s" : "") +
                       " au départ de " + (donnees.station || gare) + ".", false);
        }

        gareActuelle = gare;
        nomGareEl.textContent = " · " + (donnees.station || gare);
        majEl.textContent = "Mis à jour à " + L.formaterHeure(Date.now()) +
                            ". Rafraîchissement automatique chaque minute.";
        memoriserGare(gare);
        majRaccourcis();
        relancerMinuteur();
      })
      .catch(function (e) {
        // On distingue les cas : l'utilisateur ne peut rien faire contre une
        // panne réseau, mais il peut corriger un nom de gare.
        if (e.nom === "GareInconnue") {
          afficherEtat("Gare inconnue : « " + gare + " ». Vérifie l'orthographe, " +
                       "ou choisis-en une dans la liste.", true);
          if (!silencieux) departsEl.textContent = "";
          arreterMinuteur();
        } else if (e.nom === "TropLent") {
          afficherEtat("L'API met trop de temps à répondre. Réessaie dans un instant.", true);
          if (!silencieux) departsEl.textContent = "";
          relancerMinuteur();
        } else {
          afficherEtat("Impossible de joindre l'API iRail. Vérifie ta connexion, " +
                       "ou le service est momentanément indisponible.", true);
          if (!silencieux) departsEl.textContent = "";
          relancerMinuteur();
        }
      })
      .then(function () {
        chargementEnCours = false;
        boutonChercher.disabled = false;
      });
  }

  function relancerMinuteur() {
    arreterMinuteur();
    secondesRestantes = INTERVALLE;
    majCompteur();

    minuteur = setInterval(function () {
      secondesRestantes--;
      majCompteur();
      if (secondesRestantes <= 0 && gareActuelle) {
        charger(gareActuelle, true); // silencieux : pas de squelette
      }
    }, 1000);
  }

  function arreterMinuteur() {
    if (minuteur) { clearInterval(minuteur); minuteur = null; }
    compteurEl.textContent = "";
  }

  function majCompteur() {
    compteurEl.textContent = secondesRestantes > 0 ? "dans " + secondesRestantes + " s" : "…";
  }

  /* Onglet caché : inutile d'interroger l'API pour personne. On reprend, et on
     rafraîchit tout de suite, quand l'utilisateur revient. */
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      arreterMinuteur();
    } else if (gareActuelle) {
      charger(gareActuelle, true);
    }
  });


  /* ========== 5. INTERFACE ========== */

  function memoriserGare(gare) {
    try { localStorage.setItem(CLE_GARE, gare); } catch (e) {}
  }

  function gareMemorisee() {
    try { return localStorage.getItem(CLE_GARE) || ""; } catch (e) { return ""; }
  }

  function construireRaccourcis() {
    var conteneur = $("raccourcis");
    conteneur.textContent = "";

    RACCOURCIS.forEach(function (nom) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "raccourci";
      b.textContent = nom;
      b.setAttribute("data-gare", nom);
      b.addEventListener("click", function () {
        champGare.value = nom;
        erreurGareEl.textContent = "";
        charger(nom, false);
      });
      conteneur.appendChild(b);
    });
  }

  function majRaccourcis() {
    $("raccourcis").querySelectorAll(".raccourci").forEach(function (b) {
      var actif = b.getAttribute("data-gare") === gareActuelle;
      if (actif) { b.setAttribute("aria-current", "true"); }
      else { b.removeAttribute("aria-current"); }
    });
  }

  $("formulaire-gare").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var gare = champGare.value.trim();

    if (!gare) {
      erreurGareEl.textContent = "Indique une gare, ou choisis un raccourci.";
      champGare.setAttribute("aria-invalid", "true");
      champGare.focus();
      return;
    }
    erreurGareEl.textContent = "";
    champGare.removeAttribute("aria-invalid");
    charger(gare, false);
  });

  $("bouton-rafraichir").addEventListener("click", function () {
    if (gareActuelle) charger(gareActuelle, false);
  });


  /* ========== 6. DÉMARRAGE ========== */

  construireRaccourcis();

  var gareInitiale = gareMemorisee() || GARE_DEFAUT;
  champGare.value = gareInitiale;
  charger(gareInitiale, false);

})();
