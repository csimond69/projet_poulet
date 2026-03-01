"""
Application Poulet aux Baffes
=============================
Mini site Flask qui simule la température
d'un poulet giflé en fonction de paramètres
(énergie de la claque, fréquence, etc.).

Retour JSON + affichage graphique côté navigateur.
"""

from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


# ─────────────────────────────────────────
# Paramètres physiques "globaux"
# ─────────────────────────────────────────
T_AIR = 20.0       # °C, température ambiante
M_CHICKEN = 1.5    # kg, masse du poulet
C = 4000.0         # J/(kg*K), capacité thermique massique
H = 10.0           # W/(m^2*K), convection air-poulet
A = 0.2            # m^2, surface approximative du poulet


def simulate_temperature(v=10.0, f=1.0, m_hand=0.7, eta=0.3,
                         T_air=20.0, duration=3600.0, dt=1.0):
    """
    Simule l'évolution de la température du poulet sur 'duration' secondes.

    v      : vitesse de la claque (m/s)
    f      : fréquence de claques (1/s)
    m_hand : masse efficace de la main (kg)
    eta    : fraction de l'énergie cinétique qui chauffe le poulet
    duration : durée totale (s)
    dt     : pas de temps (s)

    Retourne:
      - times : liste des temps (s)
      - temps : liste des températures (°C)
    """
    import math

    n_steps = int(duration / dt) + 1
    times = [i * dt for i in range(n_steps)]
    temps = [T_air] * n_steps   

    # énergie par claque
    E_kin = 0.5 * m_hand * v**2           # J
    E_slap = eta * E_kin                  # J utiles dans le poulet
    slap_period = 1.0 / f                 # s entre deux claques

    next_slap_time = 0.0

    for i in range(1, n_steps):
        t = times[i]

        # 1) refroidissement vers l'air
        T_prev = temps[i - 1]
        dT_cool = -(H * A * (T_prev - T_air) / (M_CHICKEN * C)) * dt
        T_new = T_prev + dT_cool

        # 2) claque éventuelle
        if t >= next_slap_time:
            dT_slap = E_slap / (M_CHICKEN * C)
            T_new += dT_slap
            next_slap_time += slap_period

        temps[i] = T_new

    return times, temps


# ─────────────────────────────────────────
# Routes Flask
# ─────────────────────────────────────────
@app.route("/")
def index():
    """
    Page principale : formulaire + zone de graphique.
    """
    return render_template("index.html")


@app.route("/simulate", methods=["POST"])
def simulate():
    """
    Endpoint JSON : reçoit les paramètres en JSON,
    renvoie temps + température en JSON.
    """
    data = request.get_json(force=True)  # force=True pour être sûr

    # Récupération des paramètres avec valeurs par défaut
    v = float(data.get("v", 10.0))
    f = float(data.get("f", 1.0))
    m_hand = float(data.get("m_hand", 0.7))
    eta = (M_CHICKEN / (M_CHICKEN + m_hand))**2
    duration = float(data.get("duration", 3600.0))
    T_air = float(data.get("T_air", 20.0))

    # Sécurité basique
    v = max(0.1, min(v, 100.0))
    f = max(0.1, min(f, 50.0))
    m_hand = max(0.1, min(m_hand, 5.0))
    eta = max(0.0, min(eta, 1.0))
    duration = max(10.0, min(duration, 7200.0))

    times, temps = simulate_temperature(v=v, f=f,
                                        m_hand=m_hand,
                                        eta=eta,
                                        T_air=T_air,
                                        duration=duration,
                                        dt=0.5)

    # Envoi en JSON
    return jsonify({
        "times": times,   # en secondes
        "temps": temps,   # en °C
        "eta": eta
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)