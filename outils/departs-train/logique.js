/* ==========================================================================
   Départs de train — logique métier
   Fonctions pures : ni DOM, ni réseau, ni horloge implicite. Elles traduisent
   ce que renvoie l'API iRail en données prêtes à afficher.

   C'est le code le plus exposé de l'outil : une API tierce peut changer un
   format sans prévenir. Les tests (tests.html) figent le comportement attendu.
   ========================================================================== */

var DepartsLogique = (function () {
  "use strict";

  /* iRail renvoie tout en chaînes de caractères, y compris les nombres et les
     booléens. On normalise une fois ici plutôt que de convertir partout. */
  function normaliser(brut) {
    var liste = (brut && brut.departures && brut.departures.departure) || [];
    if (!Array.isArray(liste)) return [];

    return liste.map(function (d) {
      var infos = d.vehicleinfo || {};
      var horodatage = parseInt(d.time, 10);

      return {
        // Un horodatage illisible donne NaN : formaterHeure le rattrape.
        horodatage:  isNaN(horodatage) ? NaN : horodatage * 1000,
        retard:      Math.round((parseInt(d.delay, 10) || 0) / 60),
        supprime:    d.canceled !== "0" && d.canceled !== 0 && d.canceled !== undefined,
        destination: d.station || "",
        // « ? » signifie « quai non attribué » : on le traite comme absent.
        quai:        d.platform && d.platform !== "?" ? d.platform : "",
        ligne:       infos.shortname || infos.type || "",
        type:        infos.type || ""
      };
    });
  }

  function formaterHeure(ms) {
    var d = new Date(ms);
    if (isNaN(d.getTime())) return "--:--";
    return d.toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit" });
  }

  /* Heure réellement attendue sur le quai. */
  function heureReelle(depart) {
    if (isNaN(depart.horodatage)) return NaN;
    return depart.horodatage + depart.retard * 60000;
  }

  /* Un départ supprimé n'a pas d'heure de rattrapage à annoncer : afficher
     « +7 min » sur un train qui ne partira pas serait trompeur. */
  function afficheRetard(depart) {
    return depart.retard > 0 && !depart.supprime;
  }

  function libelleLigne(depart) {
    if (!depart.ligne) return "";
    return depart.type === "BUS" ? depart.ligne + " · bus de remplacement" : depart.ligne;
  }

  function libelleQuai(depart) {
    return depart.quai || "—";
  }

  /* Traduit une panne en message destiné à l'utilisateur. On distingue les cas
     parce qu'ils appellent des réactions différentes : corriger une saisie,
     réessayer, ou attendre. */
  function messageErreur(nom) {
    if (nom === "GareInconnue") return "gare-inconnue";
    if (nom === "TropLent")     return "trop-lent";
    return "reseau";
  }

  return {
    normaliser: normaliser,
    formaterHeure: formaterHeure,
    heureReelle: heureReelle,
    afficheRetard: afficheRetard,
    libelleLigne: libelleLigne,
    libelleQuai: libelleQuai,
    messageErreur: messageErreur
  };
})();

/* Utilisable dans le navigateur (variable globale) comme en ligne de commande
   (require), pour que les mêmes tests tournent dans les deux environnements. */
if (typeof module !== "undefined" && module.exports) {
  module.exports = DepartsLogique;
}
