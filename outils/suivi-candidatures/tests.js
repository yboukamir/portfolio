/* ==========================================================================
   Suivi de candidatures — affichage des tests dans le navigateur
   Les cas de test vivent dans cas-de-tests.js, partagés avec la ligne de
   commande. Ce fichier ne fait que présenter leurs résultats.
   ========================================================================== */

(function () {
  "use strict";

  var resultats = CasDeTests();

  var reussis = resultats.filter(function (r) { return r.ok; }).length;
  var total = resultats.length;

  var resume = document.getElementById("resume");
  resume.className = "resume " + (reussis === total ? "ok" : "echec");
  resume.textContent = reussis === total
    ? total + " tests passés"
    : (total - reussis) + " test(s) en échec sur " + total;

  var liste = document.getElementById("resultats");
  resultats.forEach(function (r) {
    var li = document.createElement("li");
    li.className = r.ok ? "ok" : "echec";

    var etat = document.createElement("span");
    etat.className = "puce";
    etat.textContent = r.ok ? "OK" : "ÉCHEC";

    var nom = document.createElement("span");
    nom.textContent = r.nom;

    li.appendChild(etat);
    li.appendChild(nom);

    if (!r.ok) {
      var msg = document.createElement("p");
      msg.className = "message";
      msg.textContent = r.message;
      li.appendChild(msg);
    }
    liste.appendChild(li);
  });

  // Permet de lire le bilan depuis l'extérieur (console, automatisation).
  window.__resultatsTests = { total: total, reussis: reussis, echecs: total - reussis };
})();
