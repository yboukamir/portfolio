/* ==========================================================================
   Départs de train — cas de test
   Ne dépend ni du DOM ni de Node : le même fichier sert à tests.html (dans le
   navigateur) et à outils/executer-tests.js (en ligne de commande, pour la CI).
   Aucun appel réseau : les réponses de l'API sont simulées.
   ========================================================================== */

(function (racine, fabrique) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = fabrique(require("./logique.js"));
  } else {
    racine.CasDeTests = fabrique(racine.DepartsLogique);
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
    if (a !== b) throw new Error((precision ? precision + " — " : "") + "attendu " + b + ", obtenu " + a);
  }
  function vrai(v, p) { if (v !== true) throw new Error((p || "condition") + " devrait être vraie"); }
  function faux(v, p) { if (v !== false) throw new Error((p || "condition") + " devrait être fausse"); }

  /* Fabrique une réponse iRail minimale, avec les champs sous forme de chaînes
     comme le fait réellement l'API. */
  function reponse(departs) {
    return { departures: { number: String(departs.length), departure: departs } };
  }
  function depart(champs) {
    var base = {
      time: "1787433600", delay: "0", canceled: "0",
      station: "Namur", platform: "5",
      vehicleinfo: { shortname: "IC 1832", type: "IC" }
    };
    for (var k in champs) base[k] = champs[k];
    return base;
  }


  /* ══════════ normaliser : structure ══════════ */

  test("normaliser rend un tableau vide si la réponse est vide", function () {
    egal(L.normaliser({}), []);
    egal(L.normaliser(null), []);
    egal(L.normaliser({ departures: {} }), []);
  });

  test("normaliser convertit l'horodatage en millisecondes", function () {
    var d = L.normaliser(reponse([depart({ time: "1787433600" })]))[0];
    egal(d.horodatage, 1787433600000);
  });

  test("normaliser convertit le retard de secondes en minutes", function () {
    egal(L.normaliser(reponse([depart({ delay: "420" })]))[0].retard, 7);
    egal(L.normaliser(reponse([depart({ delay: "0" })]))[0].retard, 0);
  });

  test("normaliser arrondit le retard à la minute la plus proche", function () {
    egal(L.normaliser(reponse([depart({ delay: "100" })]))[0].retard, 2, "100 s");
    egal(L.normaliser(reponse([depart({ delay: "89" })]))[0].retard, 1, "89 s");
  });

  test("normaliser traite « ? » comme un quai non attribué", function () {
    egal(L.normaliser(reponse([depart({ platform: "?" })]))[0].quai, "");
    egal(L.normaliser(reponse([depart({ platform: "5" })]))[0].quai, "5");
  });

  test("normaliser détecte une suppression", function () {
    vrai(L.normaliser(reponse([depart({ canceled: "1" })]))[0].supprime, "canceled=1");
    faux(L.normaliser(reponse([depart({ canceled: "0" })]))[0].supprime, "canceled=0");
  });

  test("normaliser reprend le nom court du véhicule", function () {
    var d = L.normaliser(reponse([depart({ vehicleinfo: { shortname: "S1 1234", type: "S1" } })]))[0];
    egal(d.ligne, "S1 1234");
    egal(d.type, "S1");
  });

  test("normaliser retombe sur le type si le nom court manque", function () {
    var d = L.normaliser(reponse([depart({ vehicleinfo: { type: "IC" } })]))[0];
    egal(d.ligne, "IC");
  });


  /* ══════════ normaliser : robustesse ══════════ */

  test("normaliser survit à un véhicule sans information", function () {
    var d = L.normaliser(reponse([depart({ vehicleinfo: undefined })]))[0];
    egal(d.ligne, "", "ligne");
    egal(d.type, "", "type");
  });

  test("normaliser survit à une destination absente", function () {
    egal(L.normaliser(reponse([depart({ station: undefined })]))[0].destination, "");
  });

  test("normaliser neutralise un retard illisible", function () {
    egal(L.normaliser(reponse([depart({ delay: "inconnu" })]))[0].retard, 0);
    egal(L.normaliser(reponse([depart({ delay: undefined })]))[0].retard, 0);
  });

  test("normaliser signale un horodatage illisible plutôt que d'inventer une heure", function () {
    var d = L.normaliser(reponse([depart({ time: "pas-un-nombre" })]))[0];
    vrai(isNaN(d.horodatage));
  });

  test("normaliser survit à une liste qui n'en est pas une", function () {
    egal(L.normaliser({ departures: { departure: "texte" } }), []);
  });

  test("normaliser traite plusieurs départs d'un coup", function () {
    var liste = L.normaliser(reponse([
      depart({ station: "Namur" }),
      depart({ station: "Mons" }),
      depart({ station: "Liège-Guillemins" })
    ]));
    egal(liste.length, 3);
    egal(liste.map(function (d) { return d.destination; }), ["Namur", "Mons", "Liège-Guillemins"]);
  });


  /* ══════════ heureReelle et afficheRetard ══════════ */

  test("heureReelle ajoute le retard à l'heure théorique", function () {
    var d = L.normaliser(reponse([depart({ time: "1787433600", delay: "420" })]))[0];
    egal(L.heureReelle(d), 1787433600000 + 7 * 60000);
  });

  test("heureReelle vaut l'heure théorique sans retard", function () {
    var d = L.normaliser(reponse([depart({ delay: "0" })]))[0];
    egal(L.heureReelle(d), d.horodatage);
  });

  test("heureReelle reste illisible si l'horodatage l'est", function () {
    var d = L.normaliser(reponse([depart({ time: "x", delay: "420" })]))[0];
    vrai(isNaN(L.heureReelle(d)));
  });

  test("afficheRetard est vrai quand le train est en retard", function () {
    vrai(L.afficheRetard({ retard: 7, supprime: false }));
  });

  test("afficheRetard est faux sans retard", function () {
    faux(L.afficheRetard({ retard: 0, supprime: false }));
  });

  /* Annoncer « +7 min » sur un train supprimé laisserait croire qu'il passera. */
  test("afficheRetard est faux si le train est supprimé, même en retard", function () {
    faux(L.afficheRetard({ retard: 7, supprime: true }));
  });


  /* ══════════ libellés ══════════ */

  test("libelleLigne signale un bus de remplacement", function () {
    egal(L.libelleLigne({ ligne: "BUS 705723", type: "BUS" }), "BUS 705723 · bus de remplacement");
  });

  test("libelleLigne laisse un train inchangé", function () {
    egal(L.libelleLigne({ ligne: "IC 1832", type: "IC" }), "IC 1832");
  });

  test("libelleLigne rend une chaîne vide si la ligne est inconnue", function () {
    egal(L.libelleLigne({ ligne: "", type: "" }), "");
  });

  test("libelleQuai affiche un tiret quand le quai est inconnu", function () {
    egal(L.libelleQuai({ quai: "" }), "—");
    egal(L.libelleQuai({ quai: "5" }), "5");
  });


  /* ══════════ formaterHeure ══════════ */

  test("formaterHeure produit une heure sur deux chiffres", function () {
    vrai(/^\d{2}:\d{2}$/.test(L.formaterHeure(1787433600000)));
  });

  test("formaterHeure signale une heure illisible sans planter", function () {
    egal(L.formaterHeure(NaN), "--:--");
    egal(L.formaterHeure("texte"), "--:--");
  });


  /* ══════════ messageErreur ══════════ */

  test("messageErreur distingue les trois pannes", function () {
    egal(L.messageErreur("GareInconnue"), "gare-inconnue");
    egal(L.messageErreur("TropLent"), "trop-lent");
    egal(L.messageErreur("TypeError"), "reseau");
    egal(L.messageErreur(undefined), "reseau");
  });



    return resultats;
  };
});
