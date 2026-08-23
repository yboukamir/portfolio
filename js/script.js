/* ==========================================================================
   Mon site — interactions
   1. Thème clair/sombre · 2. Menu mobile · 3. En-tête au défilement
   4. Lien de nav actif · 5. Apparition au scroll · 6. Formulaire · 7. Année
   ========================================================================== */

(function () {
  "use strict";

  /* ========== 1. THÈME CLAIR / SOMBRE ========== */

  var racine = document.documentElement;
  var boutonTheme = document.getElementById("theme-toggle");

  // Rétablit le choix précédent de l'utilisateur, s'il en a fait un.
  try {
    var themeEnregistre = localStorage.getItem("theme");
    if (themeEnregistre === "dark" || themeEnregistre === "light") {
      racine.setAttribute("data-theme", themeEnregistre);
    }
  } catch (e) {
    /* localStorage indisponible (navigation privée) : on garde le thème système. */
  }

  if (boutonTheme) {
    boutonTheme.addEventListener("click", function () {
      var sombreSysteme = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var actuel = racine.getAttribute("data-theme") || (sombreSysteme ? "dark" : "light");
      var nouveau = actuel === "dark" ? "light" : "dark";

      racine.setAttribute("data-theme", nouveau);
      try { localStorage.setItem("theme", nouveau); } catch (e) {}
    });
  }


  /* ========== 2. MENU MOBILE ========== */

  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");

  function fermerMenu() {
    if (!nav || !burger) return;
    nav.classList.remove("ouvert");
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Ouvrir le menu");
  }

  if (burger && nav) {
    burger.addEventListener("click", function () {
      var ouvert = nav.classList.toggle("ouvert");
      burger.setAttribute("aria-expanded", String(ouvert));
      burger.setAttribute("aria-label", ouvert ? "Fermer le menu" : "Ouvrir le menu");
    });

    // On referme après un clic sur un lien, et avec la touche Échap.
    nav.addEventListener("click", function (ev) {
      if (ev.target.tagName === "A") fermerMenu();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") fermerMenu();
    });
  }


  /* ========== 3. EN-TÊTE AU DÉFILEMENT ========== */

  var header = document.querySelector(".site-header");

  function majHeader() {
    if (header) header.classList.toggle("defile", window.scrollY > 8);
  }
  majHeader();
  window.addEventListener("scroll", majHeader, { passive: true });


  /* ========== 4. LIEN DE NAVIGATION ACTIF ========== */

  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
  var liensNav = Array.prototype.slice.call(document.querySelectorAll(".nav a"));

  if (sections.length && liensNav.length && "IntersectionObserver" in window) {
    var observateurNav = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (!entree.isIntersecting) return;
        var id = entree.target.id;
        liensNav.forEach(function (lien) {
          lien.classList.toggle("actif", lien.getAttribute("href") === "#" + id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    sections.forEach(function (section) { observateurNav.observe(section); });
  }


  /* ========== 5. APPARITION AU SCROLL ========== */

  var elementsReveal = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var animationsReduites = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (animationsReduites || !("IntersectionObserver" in window)) {
    // Pas d'animation : on affiche tout immédiatement.
    elementsReveal.forEach(function (el) { el.classList.add("visible"); });
  } else {
    var observateurReveal = new IntersectionObserver(function (entrees, obs) {
      entrees.forEach(function (entree, i) {
        if (!entree.isIntersecting) return;
        // Léger décalage entre voisins pour un effet en cascade.
        setTimeout(function () { entree.target.classList.add("visible"); }, i * 70);
        obs.unobserve(entree.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    elementsReveal.forEach(function (el) { observateurReveal.observe(el); });
  }


  /* ========== 6. FORMULAIRE DE CONTACT ========== */
  /* Validation dans le navigateur, puis envoi vers Formspree, qui fait suivre
     par mail. L'adresse de destination est configurée chez eux, jamais ici. */

  var formulaire = document.getElementById("formulaire-contact");
  var note = document.getElementById("form-note");

  var REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validerChamp(input) {
    var champ = input.closest(".champ");
    var messageErreur = champ.querySelector(".erreur");
    var valeur = input.value.trim();
    var erreur = "";

    if (!valeur) {
      erreur = "Ce champ est obligatoire.";
    } else if (input.type === "email" && !REGEX_EMAIL.test(valeur)) {
      erreur = "Adresse email invalide.";
    } else if (input.id === "message" && valeur.length < 10) {
      erreur = "Message trop court (10 caractères minimum).";
    }

    champ.classList.toggle("invalide", Boolean(erreur));
    if (messageErreur) messageErreur.textContent = erreur;

    /* La bordure rouge ne dit rien à un lecteur d'écran. aria-invalid signale
       l'erreur, et aria-describedby (posé dans le HTML) fait lire le message
       au moment où l'utilisateur atteint le champ. */
    if (erreur) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");

    return !erreur;
  }

  if (formulaire) {
    // On ne valide que les champs visibles : le piège à robots « _gotcha »
    // ne doit surtout pas être contrôlé.
    var champs = Array.prototype.slice.call(
      formulaire.querySelectorAll(".champ input, .champ textarea")
    );

    // On ne signale l'erreur qu'après une première sortie du champ.
    champs.forEach(function (input) {
      input.addEventListener("blur", function () { validerChamp(input); });
      input.addEventListener("input", function () {
        if (input.closest(".champ").classList.contains("invalide")) validerChamp(input);
      });
    });

    formulaire.addEventListener("submit", function (ev) {
      ev.preventDefault();

      var valide = champs.map(validerChamp).every(Boolean);
      if (!valide) {
        if (note) {
          note.className = "form-note";
          note.textContent = "Merci de corriger les champs indiqués.";
        }
        var premierInvalide = formulaire.querySelector(".champ.invalide input, .champ.invalide textarea");
        if (premierInvalide) premierInvalide.focus();
        return;
      }

      envoyer();
    });

    /* Envoi vers Formspree, à l'adresse indiquée par l'attribut « action » du
       formulaire. Contrairement à Netlify Forms, ça fonctionne aussi en local :
       attention, un test depuis ton ordinateur envoie donc un vrai message. */
    function envoyer() {
      var bouton = formulaire.querySelector("button[type=submit]");
      var libelle = bouton ? bouton.textContent : "";

      if (bouton) {
        bouton.disabled = true;
        bouton.textContent = "Envoi en cours…";
      }
      if (note) {
        note.className = "form-note";
        note.textContent = "";
      }

      var donnees = new URLSearchParams(new FormData(formulaire)).toString();

      // L'en-tête « Accept » demande à Formspree une réponse JSON plutôt
      // qu'une redirection vers sa page de remerciement : le visiteur reste
      // sur la page, on affiche notre propre message.
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
          if (note) {
            note.className = "form-note succes";
            note.textContent = "Merci ! Ton message est bien parti, je réponds sous 48 h.";
          }
          formulaire.reset();
        })
        .catch(function () {
          if (note) {
            note.className = "form-note echec";
            note.textContent = "L'envoi a échoué. Réessaie dans un instant, ou contacte-moi via les liens en bas de page.";
          }
        })
        .then(function () {
          if (bouton) {
            bouton.disabled = false;
            bouton.textContent = libelle;
          }
        });
    }
  }


  /* ========== 7. ANNÉE COURANTE ========== */

  var annee = document.getElementById("annee");
  if (annee) annee.textContent = String(new Date().getFullYear());

})();
