/* ==========================================================================
   Suivi de candidatures — logique métier
   Fonctions pures : elles ne touchent ni au DOM, ni au localStorage, et
   renvoient toujours le même résultat pour les mêmes entrées. C'est ce qui
   les rend testables — voir tests.html.

   Exposé en global plutôt qu'en module ES, pour rester cohérent avec le reste
   du projet et fonctionner même en ouvrant le fichier sans serveur.
   ========================================================================== */

var SuiviLogique = (function () {
  "use strict";

  /* L'ordre définit celui des filtres et des statistiques. */
  var STATUTS = [
    { code: "a-postuler", libelle: "À postuler" },
    { code: "envoyee",    libelle: "Envoyée" },
    { code: "relancee",   libelle: "Relancée" },
    { code: "entretien",  libelle: "Entretien" },
    { code: "offre",      libelle: "Offre" },
    { code: "refus",      libelle: "Refus" }
  ];

  var CODES = STATUTS.map(function (s) { return s.code; });

  var LIMITES = { entreprise: 120, poste: 120, lien: 500, notes: 2000 };

  function libelleStatut(code) {
    for (var i = 0; i < STATUTS.length; i++) {
      if (STATUTS[i].code === code) return STATUTS[i].libelle;
    }
    return code;
  }

  function creerId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* Garde-fou à la lecture : un fichier importé peut contenir n'importe quoi.
     Une candidature sans entreprise ni poste n'est pas exploitable. */
  function estValide(c) {
    return Boolean(c) && typeof c === "object" &&
           typeof c.entreprise === "string" && c.entreprise.trim() !== "" &&
           typeof c.poste === "string" && c.poste.trim() !== "";
  }

  /* Ramène n'importe quel objet à la forme attendue : champs présents, types
     corrects, longueurs bornées, statut connu. L'identifiant peut être injecté
     pour rendre la fonction déterministe pendant les tests. */
  function nettoyer(c, idParDefaut) {
    return {
      id:         String(c.id || idParDefaut || creerId()),
      entreprise: String(c.entreprise).trim().slice(0, LIMITES.entreprise),
      poste:      String(c.poste).trim().slice(0, LIMITES.poste),
      date:       typeof c.date === "string" ? c.date.slice(0, 10) : "",
      statut:     CODES.indexOf(c.statut) !== -1 ? c.statut : "envoyee",
      lien:       typeof c.lien === "string" ? c.lien.trim().slice(0, LIMITES.lien) : "",
      notes:      typeof c.notes === "string" ? c.notes.trim().slice(0, LIMITES.notes) : ""
    };
  }

  function formaterDate(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });
  }

  function filtrer(liste, filtre) {
    if (filtre === "toutes" || !filtre) return liste.slice();
    return liste.filter(function (c) { return c.statut === filtre; });
  }

  /* Les plus récentes d'abord ; celles sans date passent à la fin.
     Ne modifie pas le tableau reçu. */
  function trier(liste) {
    return liste.slice().sort(function (a, b) {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
  }

  function compter(liste) {
    var total = { toutes: liste.length };
    CODES.forEach(function (code) {
      total[code] = liste.filter(function (c) { return c.statut === code; }).length;
    });
    return total;
  }

  /* Un lien mal formé ferait un lien mort dans la liste : on le refuse ici.
     Renvoie le message d'erreur, ou une chaîne vide si le champ est correct. */
  function validerChamp(nom, valeur) {
    var v = typeof valeur === "string" ? valeur.trim() : "";

    if (nom === "entreprise") {
      return v === "" ? "L'entreprise est obligatoire." : "";
    }
    if (nom === "poste") {
      return v === "" ? "L'intitulé du poste est obligatoire." : "";
    }
    if (nom === "lien") {
      if (v === "") return "";
      return /^https?:\/\/.+/i.test(v) ? "" : "Le lien doit commencer par http:// ou https://";
    }
    return "";
  }

  /* Fusion plutôt que remplacement : importer ne doit jamais faire perdre ce
     qui est déjà là. Les identifiants déjà connus sont ignorés. */
  function fusionnerImport(existantes, brutes) {
    var valides = (Array.isArray(brutes) ? brutes : [])
      .filter(estValide)
      .map(function (c) { return nettoyer(c); });

    var connus = existantes.map(function (c) { return c.id; });
    var nouvelles = valides.filter(function (c) { return connus.indexOf(c.id) === -1; });

    return {
      liste:     existantes.concat(nouvelles),
      ajoutees:  nouvelles.length,
      ignorees:  valides.length - nouvelles.length,
      rejetees:  (Array.isArray(brutes) ? brutes.length : 0) - valides.length
    };
  }

  return {
    STATUTS: STATUTS,
    LIMITES: LIMITES,
    libelleStatut: libelleStatut,
    creerId: creerId,
    estValide: estValide,
    nettoyer: nettoyer,
    formaterDate: formaterDate,
    filtrer: filtrer,
    trier: trier,
    compter: compter,
    validerChamp: validerChamp,
    fusionnerImport: fusionnerImport
  };
})();
