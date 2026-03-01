document.addEventListener("DOMContentLoaded", () => {
  const warningDiv = document.getElementById("warning");
  const form = document.getElementById("sim-form");
  const TmaxSpan = document.getElementById("Tmax");
  const ctx = document.getElementById("tempChart").getContext("2d");
  const EslapSpan = document.getElementById("Eslap");
  const PbaffesSpan = document.getElementById("Pbaffes");
  const TeqSpan = document.getElementById("Teq");
  const etaDisplay = document.getElementById("eta-display");

  const vInput = document.getElementById("v");
  const mHandInput = document.getElementById("m_hand");
  const fInput = document.getElementById("f");
  const TairInput = document.getElementById("T_air");
  const durationInput = document.getElementById("duration");

  let chart = null;

  // Info bubbles on "i"
  document.querySelectorAll(".info").forEach((icon) => {
    icon.addEventListener("click", () => {
      const text = icon.getAttribute("data-info");
      let box = icon.nextElementSibling;
      if (!box || !box.classList.contains("info-text")) {
        box = document.createElement("div");
        box.className = "info-text";
        box.textContent = text;
        icon.parentNode.insertBefore(box, icon.nextSibling);
      } else {
        box.remove();
      }
    });
  });

  // Physical constants (must match app.py)
  const CHICKEN_MASS = 1.5;  // kg
  const H = 10.0;            // W/(m^2*K)
  const A = 0.2;             // m^2

  // Preset scenarios
  const btnScenarioNormal = document.getElementById("scenario-normal");
  if (btnScenarioNormal) {
    btnScenarioNormal.addEventListener("click", () => {
      vInput.value = 10;
      mHandInput.value = 1;
      fInput.value = 1;
      TairInput.value = 20;
      durationInput.value = 3600;
    });
  }

  const btnScenarioBoxer = document.getElementById("scenario-boxeur");
  if (btnScenarioBoxer) {
    btnScenarioBoxer.addEventListener("click", () => {
      vInput.value = 15;
      mHandInput.value = 1.2;
      fInput.value = 2;
      TairInput.value = 30;
      durationInput.value = 3600;
    });
  }

  const btnScenarioCrazy = document.getElementById("scenario-extrême"); // ou "scenario-extrême" si tu as changé l'id dans le HTML
  if (btnScenarioCrazy) {
    btnScenarioCrazy.addEventListener("click", () => {
      vInput.value = 25;
      mHandInput.value = 1.5;
      fInput.value = 5;
      TairInput.value = 40;
      durationInput.value = 7200;
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const v = parseFloat(vInput.value);
    const mHand = parseFloat(mHandInput.value);
    const f = parseFloat(fInput.value);
    const duration = parseFloat(durationInput.value);
    const T_air = parseFloat(TairInput.value);

    // η = (M / (M + m))²
    const eta = Math.pow(CHICKEN_MASS / (CHICKEN_MASS + mHand), 2);
    if (etaDisplay) etaDisplay.textContent = eta.toFixed(2);

    const payload = { v, m_hand: mHand, f, duration, T_air };

    const warnings = [];
    if (v > 20) {
      warnings.push("La vitesse de claque dépasse 20 m/s : très au-dessus de ce qu'un humain peut produire.");
    }
    if (f > 2) {
      warnings.push("La fréquence dépasse 2 claques/s : irréaliste sur la durée pour un humain.");
    }
    if (T_air > 40) {
      warnings.push("Une température d'air > 40 °C correspond déjà à une chaleur extrême (canicule).");
    }

    if (warnings.length > 0) {
      warningDiv.style.display = "block";
      warningDiv.innerHTML = warnings.map((w) => "• " + w).join("<br>");
    } else {
      warningDiv.style.display = "none";
      warningDiv.innerHTML = "";
    }

    // Derived quantities
    const E_kin = 0.5 * mHand * v * v;
    const E_slap = eta * E_kin;
    const P_baffes = E_slap * f;
    const Teq = T_air + P_baffes / (H * A);

    EslapSpan.textContent = E_slap.toFixed(1);
    PbaffesSpan.textContent = P_baffes.toFixed(1);
    TeqSpan.textContent = Teq.toFixed(1);

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
      const timesSec = data.times;
      const temps = data.temps;

      const timesMin = timesSec.map((t) => t / 60.0);
      const points = timesMin.map((tm, i) => ({
        x: tm,
        y: temps[i],
      }));

      if (chart) {
        chart.data.datasets[0].data = points;
        chart.options.scales.x.min = 0;
        chart.options.scales.x.max = Math.max(...timesMin);
        chart.update();
      } else {
        chart = new Chart(ctx, {
          type: "line",
          data: {
            datasets: [
              {
                label: "Température du poulet (°C)",
                data: points,
                parsing: false,
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
                max: Math.max(...timesMin),
                ticks: {
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

      const Tmax = Math.max(...temps);
      TmaxSpan.textContent = Tmax.toFixed(1);
    } catch (err) {
      console.error("Erreur pendant la simulation :", err);
      alert("Une erreur s'est produite pendant la simulation.");
    }
  });
});