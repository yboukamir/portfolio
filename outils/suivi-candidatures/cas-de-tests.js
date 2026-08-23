/* ==========================================================================
   Suivi de candidatures — cas de test
   Ne dépend ni du DOM ni de Node : le même fichier sert à tests.html (dans le
   navigateur) et à outils/executer-tests.js (en ligne de commande, pour la CI).
   Renvoie un tableau de résultats ; l'affichage est la responsabilité de
   l'appelant.
   ========================================================================== */

(function (racine, fabrique) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = fabrique(require("./logique.js"));
  } else {
    racine.CasDeTests = fabrique(racine.SuiviLogique);
  }
})(typeof window !== "undefined" ? window : globalThis, function (L) {
  "use strict";

  return function executer() {
    var resultats = [];

    function test(nom, fn) {
      try { fn(); resultats.push({ nom: nom, ok: true }); }
      catch (e) { resultats.push({ nom: nom, ok: false, message: e.message }); }
    }

  function egal(obtenu, attendu, precision) {
    var a = JSON.stringify(obtenu), b = JSON.stringify(attendu);
    if (a !== b) {
      throw new Error((precision ? precision + " — " : "") + "attendu " + b + ", obtenu " + a);
    }
  }

  function vrai(valeur, precision) {
    if (valeur !== true) throw new Error((precision || "condition") + " devrait être vraie");
  }

  function faux(valeur, precision) {
    if (valeur !== false) throw new Error((precision || "condition") + " devrait être fausse");
  }


  /* ══════════ estValide ══════════ */

  test("estValide accepte une candidature complète", function () {
    vrai(L.estValide({ entreprise: "ACME", poste: "Développeur" }));
  });

  test("estValide refuse une entreprise vide", function () {
    faux(L.estValide({ entreprise: "   ", poste: "Développeur" }));
  });

  test("estValide refuse un poste manquant", function () {
    faux(L.estValide({ entreprise: "ACME" }));
  });

  test("estValide refuse null, une chaîne et un nombre", function () {
    faux(L.estValide(null), "null");
    faux(L.estValide("ACME"), "chaîne");
    faux(L.estValide(42), "nombre");
  });


  /* ══════════ nettoyer ══════════ */

  test("nettoyer conserve les champs valides", function () {
    var c = L.nettoyer({
      id: "abc", entreprise: "ACME", poste: "Dev",
      date: "2026-08-23", statut: "entretien",
      lien: "https://exemple.be", notes: "Contact : Marie"
    });
    egal(c, {
      id: "abc", entreprise: "ACME", poste: "Dev",
      date: "2026-08-23", statut: "entretien",
      lien: "https://exemple.be", notes: "Contact : Marie"
    });
  });

  test("nettoyer supprime les espaces autour des textes", function () {
    var c = L.nettoyer({ entreprise: "  ACME  ", poste: "  Dev  " }, "x");
    egal(c.entreprise, "ACME");
    egal(c.poste, "Dev");
  });

  test("nettoyer remplace un statut inconnu par « envoyee »", function () {
    egal(L.nettoyer({ entreprise: "A", poste: "B", statut: "n-importe-quoi" }, "x").statut, "envoyee");
  });

  test("nettoyer borne la longueur des champs", function () {
    var long = new Array(500).join("a");
    var c = L.nettoyer({ entreprise: long, poste: long, notes: long, lien: long }, "x");
    egal(c.entreprise.length, L.LIMITES.entreprise, "entreprise");
    egal(c.poste.length, L.LIMITES.poste, "poste");
  });

  test("nettoyer neutralise les champs de mauvais type", function () {
    var c = L.nettoyer({ entreprise: "A", poste: "B", date: 20260823, notes: null, lien: {} }, "x");
    egal(c.date, "", "date numérique");
    egal(c.notes, "", "notes null");
    egal(c.lien, "", "lien objet");
  });

  test("nettoyer attribue un identifiant quand il manque", function () {
    vrai(L.nettoyer({ entreprise: "A", poste: "B" }).id.length > 0);
  });


  /* ══════════ validerChamp ══════════ */

  test("validerChamp exige l'entreprise", function () {
    egal(L.validerChamp("entreprise", ""), "L'entreprise est obligatoire.");
    egal(L.validerChamp("entreprise", "  "), "L'entreprise est obligatoire.");
    egal(L.validerChamp("entreprise", "ACME"), "");
  });

  test("validerChamp accepte un lien vide", function () {
    egal(L.validerChamp("lien", ""), "");
  });

  test("validerChamp refuse un lien sans protocole", function () {
    vrai(L.validerChamp("lien", "exemple.be").length > 0);
    vrai(L.validerChamp("lien", "ftp://exemple.be").length > 0);
  });

  test("validerChamp accepte http et https", function () {
    egal(L.validerChamp("lien", "http://exemple.be"), "");
    egal(L.validerChamp("lien", "https://exemple.be/offre"), "");
  });


  /* ══════════ trier ══════════ */

  test("trier place les plus récentes en premier", function () {
    var liste = [
      { id: "1", date: "2026-01-10" },
      { id: "2", date: "2026-08-23" },
      { id: "3", date: "2026-05-02" }
    ];
    egal(L.trier(liste).map(function (c) { return c.id; }), ["2", "3", "1"]);
  });

  /* Les deux ordres d'entrée sont testés à dessein : avec seulement deux
     éléments, le moteur n'appelle le comparateur qu'une fois, dans un sens.
     Un seul ordre laissait passer une inversion du test « pas de date ». */
  test("trier renvoie les candidatures sans date à la fin", function () {
    var sansPuisAvec = [{ id: "sans", date: "" }, { id: "avec", date: "2026-08-23" }];
    var avecPuisSans = [{ id: "avec", date: "2026-08-23" }, { id: "sans", date: "" }];

    egal(L.trier(sansPuisAvec).map(function (c) { return c.id; }), ["avec", "sans"], "sans date en premier");
    egal(L.trier(avecPuisSans).map(function (c) { return c.id; }), ["avec", "sans"], "sans date en second");
  });

  test("trier gère plusieurs candidatures sans date", function () {
    var liste = [
      { id: "sans1", date: "" },
      { id: "avec", date: "2026-08-23" },
      { id: "sans2", date: "" }
    ];
    var ids = L.trier(liste).map(function (c) { return c.id; });
    egal(ids[0], "avec", "la datée passe devant");
    egal(ids.length, 3, "aucune perte");
  });

  test("trier ne modifie pas le tableau d'origine", function () {
    var liste = [{ id: "1", date: "2026-01-01" }, { id: "2", date: "2026-12-31" }];
    L.trier(liste);
    egal(liste.map(function (c) { return c.id; }), ["1", "2"]);
  });


  /* ══════════ filtrer et compter ══════════ */

  test("filtrer « toutes » renvoie tout", function () {
    var liste = [{ statut: "envoyee" }, { statut: "refus" }];
    egal(L.filtrer(liste, "toutes").length, 2);
  });

  test("filtrer par statut ne garde que celui demandé", function () {
    var liste = [{ statut: "envoyee" }, { statut: "refus" }, { statut: "envoyee" }];
    egal(L.filtrer(liste, "envoyee").length, 2);
  });

  test("compter donne le total et le détail par statut", function () {
    var liste = [{ statut: "envoyee" }, { statut: "refus" }, { statut: "envoyee" }];
    var n = L.compter(liste);
    egal(n.toutes, 3, "total");
    egal(n.envoyee, 2, "envoyée");
    egal(n.refus, 1, "refus");
    egal(n.entretien, 0, "entretien");
  });


  /* ══════════ fusionnerImport ══════════ */

  test("fusionnerImport ajoute les nouvelles candidatures", function () {
    var r = L.fusionnerImport(
      [{ id: "a", entreprise: "A", poste: "P" }],
      [{ id: "b", entreprise: "B", poste: "P" }]
    );
    egal(r.ajoutees, 1);
    egal(r.liste.length, 2);
  });

  test("fusionnerImport ignore un identifiant déjà présent", function () {
    var r = L.fusionnerImport(
      [{ id: "a", entreprise: "A", poste: "P" }],
      [{ id: "a", entreprise: "A modifiée", poste: "P" }]
    );
    egal(r.ajoutees, 0, "ajoutées");
    egal(r.ignorees, 1, "ignorées");
    egal(r.liste.length, 1, "taille finale");
  });

  test("fusionnerImport ne perd jamais l'existant", function () {
    var existantes = [{ id: "a", entreprise: "A", poste: "P" }];
    var r = L.fusionnerImport(existantes, []);
    egal(r.liste.length, 1);
  });

  test("fusionnerImport rejette les entrées inexploitables", function () {
    var r = L.fusionnerImport([], [{ entreprise: "", poste: "P" }, null, "texte"]);
    egal(r.ajoutees, 0, "ajoutées");
    egal(r.rejetees, 3, "rejetées");
  });

  test("fusionnerImport survit à autre chose qu'un tableau", function () {
    var r = L.fusionnerImport([], { entreprise: "A" });
    egal(r.liste.length, 0);
  });


  /* ══════════ formaterDate et libelleStatut ══════════ */

  test("formaterDate renvoie une chaîne vide si la date est absente", function () {
    egal(L.formaterDate(""), "");
    egal(L.formaterDate(null), "");
  });

  test("formaterDate ignore une date invalide", function () {
    egal(L.formaterDate("pas-une-date"), "");
  });

  test("formaterDate produit un libellé lisible", function () {
    vrai(L.formaterDate("2026-08-23").indexOf("2026") !== -1);
  });

  test("libelleStatut traduit les codes connus", function () {
    egal(L.libelleStatut("a-postuler"), "À postuler");
    egal(L.libelleStatut("offre"), "Offre");
  });

  test("libelleStatut renvoie le code s'il est inconnu", function () {
    egal(L.libelleStatut("inconnu"), "inconnu");
  });



    return resultats;
  };
});
