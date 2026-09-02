/* ==========================================================================
   boukamir.be — JavaScript des 4 pages publiques
   1. Menu mobile · 2. Formulaires (devis + audit) · 3. Année du pied de page

   Aucune dépendance. Le site est en quatre pages depuis le 31/08/2026 : il
   n'y a donc plus de lien de navigation « actif au défilement » — chaque page
   pose son aria-current="page" dans le HTML, ce qui marche aussi sans
   JavaScript. Les outils et les démos ont leur propre script.
   ========================================================================== */

(function () {
  "use strict";

  /* ========== 1. MENU MOBILE ==========
     Le menu piège le focus tant qu'il est ouvert et se referme à Échap : sans
     ça, la tabulation continue derrière le panneau, dans une page qu'on ne
     voit plus. */

  var bouton = document.getElementById("nav-toggle");
  var nav = document.getElementById("nav");

  function liensDuMenu() {
    return Array.prototype.slice.call(nav.querySelectorAll("a[href]"));
  }

  function menuOuvert() {
    return nav.classList.contains("is-open");
  }

  function ouvrirMenu() {
    nav.classList.add("is-open");
    bouton.setAttribute("aria-expanded", "true");
    bouton.textContent = "Fermer";
    var premier = liensDuMenu()[0];
    if (premier) premier.focus();
  }

  function fermerMenu(rendreLeFocus) {
    nav.classList.remove("is-open");
    bouton.setAttribute("aria-expanded", "false");
    bouton.textContent = "Menu";
    // On revient toujours sur le bouton, jamais sur ce qui était focalisé
    // avant : le menu ne s'ouvre que par lui, et mémoriser document.activeElement
    // rend le focus au <body> quand l'ouverture ne vient pas d'un clic réel.
    if (rendreLeFocus) bouton.focus();
  }

  if (bouton && nav) {
    bouton.addEventListener("click", function () {
      if (menuOuvert()) fermerMenu(true); else ouvrirMenu();
    });

    nav.addEventListener("click", function (ev) {
      if (ev.target.closest("a")) fermerMenu(false);
    });

    document.addEventListener("keydown", function (ev) {
      if (!menuOuvert()) return;

      if (ev.key === "Escape") {
        fermerMenu(true);
        return;
      }

      if (ev.key !== "Tab") return;

      // Piège à focus : on boucle sur les liens du menu et le bouton lui-même.
      var cibles = liensDuMenu().concat([bouton]);
      var premier = cibles[0];
      var dernier = cibles[cibles.length - 1];

      if (ev.shiftKey && document.activeElement === premier) {
        ev.preventDefault();
        dernier.focus();
      } else if (!ev.shiftKey && document.activeElement === dernier) {
        ev.preventDefault();
        premier.focus();
      }
    });

    // Le menu n'existe qu'en dessous de 760 px. Si la fenêtre s'élargit
    // pendant qu'il est ouvert, la règle CSS qui l'affiche disparaît : sans
    // cette remise à zéro, le bouton resterait « Fermer » et annoncerait un
    // panneau ouvert qui n'est plus là.
    window.matchMedia("(min-width: 761px)").addEventListener("change", function (ev) {
      if (ev.matches && menuOuvert()) fermerMenu(false);
    });
  }


  /* ========== 2. FORMULAIRES ==========
     Deux formulaires partagent ce code : la demande de devis (contact) et
     l'audit gratuit (accueil et services). Tous deux postent vers Formspree,
     qui fait suivre par mail. L'adresse de destination est configurée chez
     eux, jamais ici : c'est ce qui évite qu'un robot la récolte sur la page.

     ⚠️ Formspree fonctionne aussi depuis localhost : tester un formulaire
     envoie un vrai message. */

  var REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function messageDErreur(champ) {
    var valeur = champ.value.trim();

    if (champ.hasAttribute("required") && !valeur) {
      return "Ce champ est obligatoire.";
    }
    // Les champs facultatifs vides n'ont rien à valider : on ne reproche pas
    // son format à quelqu'un qui n'a rien écrit.
    if (!valeur) return "";

    if (champ.type === "email" && !REGEX_EMAIL.test(valeur)) {
      return "Cette adresse e-mail ne semble pas valide.";
    }
    if (champ.type === "url" && !/^https?:\/\/[^\s.]+\.[^\s]{2,}/.test(valeur)) {
      return "Écrivez l'adresse complète, en commençant par https://";
    }
    return "";
  }

  function validerChamp(champ) {
    var bloc = champ.closest(".field");
    var erreur = messageDErreur(champ);
    var messagerie = bloc ? bloc.querySelector(".erreur-champ") : null;

    if (bloc) bloc.classList.toggle("invalide", Boolean(erreur));
    if (messagerie) messagerie.textContent = erreur;

    if (erreur) champ.setAttribute("aria-invalid", "true");
    else champ.removeAttribute("aria-invalid");

    return !erreur;
  }

  function initialiserFormulaire(formulaire) {
    var etat = formulaire.querySelector(".form__status");

    // On ne valide que les champs visibles : le piège à robots « _gotcha »
    // ne doit surtout pas être contrôlé, et un champ caché rempli par erreur
    // bloquerait un envoi parfaitement légitime.
    var champs = Array.prototype.slice.call(
      formulaire.querySelectorAll(".field input, .field textarea")
    );

    champs.forEach(function (champ) {
      champ.addEventListener("blur", function () { validerChamp(champ); });
      champ.addEventListener("input", function () {
        var bloc = champ.closest(".field");
        // On ne re-valide en cours de frappe qu'un champ déjà signalé : sinon
        // on reproche une adresse incomplète à quelqu'un qui la tape encore.
        if (bloc && bloc.classList.contains("invalide")) validerChamp(champ);
      });
    });

    formulaire.addEventListener("submit", function (ev) {
      ev.preventDefault();

      var valide = champs.map(validerChamp).every(Boolean);
      if (!valide) {
        if (etat) {
          etat.className = "form__status small muted";
          etat.textContent = "Merci de corriger les champs indiqués.";
        }
        var premierInvalide = formulaire.querySelector(".field.invalide input, .field.invalide textarea");
        if (premierInvalide) premierInvalide.focus();
        return;
      }

      envoyer(formulaire, etat);
    });
  }

  function envoyer(formulaire, etat) {
    var bouton = formulaire.querySelector("button[type=submit]");
    var libelle = bouton ? bouton.textContent : "";

    if (bouton) {
      bouton.disabled = true;
      bouton.textContent = "Envoi en cours…";
    }
    if (etat) {
      etat.className = "form__status small muted";
      etat.textContent = "";
    }

    var donnees = new URLSearchParams(new FormData(formulaire)).toString();

    // L'en-tête « Accept » demande une réponse JSON plutôt qu'une redirection
    // vers la page de remerciement de Formspree : le visiteur reste ici.
    fetch(formulaire.action, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: donnees
    })
      .then(function (reponse) {
        if (!reponse.ok) throw new Error("HTTP " + reponse.status);
        if (etat) {
          etat.className = "form__status small succes";
          etat.textContent = "Merci, c'est envoyé. Je vous réponds sous 24 h ouvrées.";
        }
        formulaire.reset();
      })
      .catch(function () {
        if (etat) {
          etat.className = "form__status small echec";
          etat.textContent = "L'envoi a échoué. Réessayez dans un instant, ou écrivez-moi à bonjour@boukamir.be.";
        }
      })
      .then(function () {
        if (bouton) {
          bouton.disabled = false;
          bouton.textContent = libelle;
        }
      });
  }

  Array.prototype.forEach.call(
    document.querySelectorAll("form[data-formulaire]"),
    initialiserFormulaire
  );


  /* ========== 3. ANNÉE DU PIED DE PAGE ==========
     Écrite en dur dans le HTML pour que la mention reste juste sans
     JavaScript ; corrigée ici au 1er janvier, pour qu'elle ne vieillisse pas
     toute seule. */

  var annee = document.getElementById("annee");
  if (annee) annee.textContent = String(new Date().getFullYear());

})();
