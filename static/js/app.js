/**
 * Script principal du simulateur Poulet aux Baffes
 * ===============================================
 * - Récupère les paramètres du formulaire
 * - Envoie une requête JSON à /simulate
 * - Affiche la courbe T(t) avec Chart.js
 */

document.addEventListener("DOMContentLoaded", () => {
  const warningDiv = document.getElementById("warning");
  const form = document.getElementById("sim-form");
  const TmaxSpan = document.getElementById("Tmax");
  const ctx = document.getElementById("tempChart").getContext("2d");
  let chart = null;
  const vInput = document.getElementById("v");
  const mHandInput = document.getElementById("m_hand");
  const fInput = document.getElementById("f");
  const etaInput = document.getElementById("eta");
  const TairInput = document.getElementById("T_air");
  const durationInput = document.getElementById("duration");
  const EslapSpan = document.getElementById("Eslap");
  const PbaffesSpan = document.getElementById("Pbaffes");
  const TeqSpan = document.getElementById("Teq");

    // Boutons de scénario
document.getElementById("scenario-normal").addEventListener("click", () => {
    vInput.value = 10;
    mHandInput.value = 1;
    fInput.value = 1;
    etaInput.value = 0.3;
    TairInput.value = 20;
    durationInput.value = 3600;
    });

document.getElementById("scenario-boxeur").addEventListener("click", () => {
    vInput.value = 15;
    mHandInput.value = 1.2;
    fInput.value = 2;
    etaInput.value = 0.4;
    TairInput.value = 30;
    durationInput.value = 3600;
    });

document.getElementById("scenario-extrême").addEventListener("click", () => {
    vInput.value = 25;
    mHandInput.value = 1.5;
    fInput.value = 5;
    etaInput.value = 0.5;
    TairInput.value = 40;
    durationInput.value = 7200;
    });

  form.addEventListener("submit", async (event) => {
    event.preventDefault(); // Empêche le rechargement de la page

    // Récupération des valeurs du formulaire
    const v = parseFloat(document.getElementById("v").value);
    const m_hand = parseFloat(document.getElementById("m_hand").value);
    const f = parseFloat(document.getElementById("f").value);
    const eta = parseFloat(document.getElementById("eta").value);
    const duration = parseFloat(document.getElementById("duration").value);
    const T_air = parseFloat(document.getElementById("T_air").value);

    const payload = { v, m_hand, f, eta, duration, T_air };
    const warnings = [];

    if (v > 20) {
    warnings.push("La vitesse de claque dépasse 20 m/s : très au-dessus de ce qu'un humain peut produire.");
    }
    if (f > 5) {
    warnings.push("La fréquence dépasse 5 claques/s : irréaliste sur la durée pour un humain.");
    }
    if (eta > 0.6) {
    warnings.push("Un rendement η > 0,6 est très optimiste pour un choc inélastique.");
    }
    if (T_air > 45) {
    warnings.push("Une température d'air > 45 °C correspond déjà à une chaleur extrême.");
    }
    // Constantes physiques (doivent être cohérentes avec app.py)
    const H = 10.0;  // W/(m^2*K)
    const A = 0.2;   // m^2

    // Calcul des grandeurs dérivées
    const E_kin = 0.5 * m_hand * v * v;    // J
    const E_slap = eta * E_kin;            // J utiles
    const P_baffes = E_slap * f;           // W

    // T_eq = T_air + P_baffes / (h A)
    const Teq = T_air + P_baffes / (H * A);

    // Mettre à jour l'affichage (arrondis)
    EslapSpan.textContent = E_slap.toFixed(1);
    PbaffesSpan.textContent = P_baffes.toFixed(1);
    TeqSpan.textContent = Teq.toFixed(1);

    // Afficher ou cacher le message
    if (warnings.length > 0) {
    warningDiv.style.display = "block";
    warningDiv.textContent = warnings.join(" ");
    } else {
    warningDiv.style.display = "none";
    warningDiv.textContent = "";
    }

    try {
      const response = await fetch("/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Erreur HTTP " + response.status);
      }

      const data = await response.json();
      const times = data.times; // en secondes
      const temps = data.temps; // en °C

      // Convertir les temps en minutes pour l'affichage
      const timesMinutes = times.map((t) => t / 60.0);

      // Construire les points {x: temps_en_min, y: température}
      const points = timesMinutes.map((tm, i) => ({
        x: tm,
        y: temps[i],
      }));

      // Mettre à jour / créer le graphique
      if (chart) {
        // On met à jour les données
        chart.data.datasets[0].data = points;
        // On met à jour la borne max de l'axe X
        chart.options.scales.x.min = 0;
        chart.options.scales.x.max = Math.max(...timesMinutes);
        chart.update();
      } else {
        chart = new Chart(ctx, {
          type: "line",
          data: {
            // Pas de "labels" ici : pour un axe linéaire,
            // on utilise directement x dans les points {x, y}
            datasets: [
              {
                label: "Température du poulet (°C)",
                data: points,
                parsing: false, // important pour que Chart.js comprenne {x, y}
                borderColor: "rgba(255, 99, 132, 1)",
                backgroundColor: "rgba(255, 99, 132, 0.2)",
                borderWidth: 2,
                pointRadius: 0,
              },
            ],
          },
          options: {
            responsive: true,
            scales: {
              x: {
                type: "linear",
                position: "bottom",
                title: {
                  display: true,
                  text: "Temps (minutes)",
                },
                min: 0,
                max: Math.max(...timesMinutes),
                ticks: {
                  // Une graduation tous les 5 minutes
                  stepSize: 5,
                },
              },
              y: {
                title: {
                  display: true,
                  text: "Température (°C)",
                },
                suggestedMin: 15,
                suggestedMax: 80,
              },
            },
          },
        });
      }

      // Afficher la température maximale atteinte
      const Tmax = Math.max(...temps);
      TmaxSpan.textContent = Tmax.toFixed(1);
    } catch (err) {
      console.error("Erreur pendant la simulation :", err);
      alert("Une erreur s'est produite pendant la simulation.");
    }
  });
});