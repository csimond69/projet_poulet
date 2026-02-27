import numpy as np
import matplotlib.pyplot as plt

# --- Paramètres physiques ---
m_chicken = 1.5      # kg
c = 4000.0           # J/(kg*K)
T_air = 20.0         # °C
T0 = 20.0            # température initiale du poulet

h = 10.0             # W/(m^2*K) coefficient de convection
A = 0.2              # m^2 surface du poulet

m_hand = 1        # kg, masse efficace main + bout d'avant-bras
v = 10.0             # m/s, vitesse de la claque
eta = 0.3            # fraction de l'énergie cinétique qui chauffe le poulet
f = 1.0              # claques par seconde

# --- Énergie par claque ---
E_kin = 0.5 * m_hand * v**2          # énergie cinétique de la main
E_slap = eta * E_kin                 # énergie utile pour le poulet (en J)
slap_period = 1.0 / f                # temps entre deux claques (s)

# --- Paramètres de simulation ---
t_end = 3600.0        # durée totale de la simulation (s), ici 1 heure
dt = 0.01             # pas de temps (s)
n_steps = int(t_end / dt)

# --- Tableaux pour stocker le temps et la température ---
t = np.linspace(0, t_end, n_steps)
T = np.zeros(n_steps)
T[0] = T0

next_slap_time = 0.0  # temps de la prochaine claque

# --- Boucle de simulation ---
for i in range(1, n_steps):
    # Temps courant
    ti = t[i]
    
    # 1) Refroidissement (pertes vers l'air)
    dT_cool = -(h * A * (T[i-1] - T_air) / (m_chicken * c)) * dt
    T[i] = T[i-1] + dT_cool
    
    # 2) Vérifier si c'est le moment d'une claque
    if ti >= next_slap_time:
        dT_slap = E_slap / (m_chicken * c)
        T[i] += dT_slap
        next_slap_time += slap_period

# --- Tracé ---
plt.figure(figsize=(8,4))
plt.plot(t/60.0, T, label="Température du poulet")
plt.axhline(60, color='r', linestyle='--', label='60 °C')
plt.xlabel("Temps (minutes)")
plt.ylabel("Température (°C)")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()