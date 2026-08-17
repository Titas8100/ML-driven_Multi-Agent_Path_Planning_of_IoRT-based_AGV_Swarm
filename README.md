# ML-driven Multi-Agent Path Planning of IoRT-based AGV Swarm

Developed a real-time simulator and multi-agent coordination platform for Deep Q-Network (**PMR-Dueling Double DQN**) based path planning of an AGV Swarm with a Cyberpunk Neumorphic Human-Machine Interface (HMI).

[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen?style=for-the-badge&logo=github)](https://titas8100.github.io/ML-driven_Multi-Agent_Path_Planning_of_IoRT-based_AGV_Swarm/)
[![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)](https://pytorch.org/)
[![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)

<p align="center">
  <a href="https://titas8100.github.io/ML-driven_Multi-Agent_Path_Planning_of_IoRT-based_AGV_Swarm/" target="_blank">
    <img src="swarm_hmi_sim_thumbnail.png" alt="Simulation Preview" width="650"/>
  </a>
</p>

---

## 🌐 Live Web Demo

Experience the full interactive 4-bot swarm simulation directly in your browser:
👉 **[Launch Live Simulator on GitHub Pages](https://titas8100.github.io/ML-driven_Multi-Agent_Path_Planning_of_IoRT-based_AGV_Swarm/)**

*(Features a built-in client-side resilient router, enabling complete swarm coordination, NVIC preemption, and cascading traffic management out of the box without requiring a local Python backend).*

---

## 🚀 Key Features

*   **PMR-Dueling Double DQN Architecture**:
    *   Deep Reinforcement Learning utilizing **Dueling Networks** (Value Stream $V(s)$ and Advantage Stream $A(s, a)$).
    *   **Prioritized Experience Replay (PER)** with binary `SumTree` sampling and Importance Sampling corrections.
    *   **Least-Turns & Directional Momentum Optimization**: Encourages straight rectilinear paths and minimizes mechanical turning.
*   **IoRT Sensor-Based Ego-Centric State**:
    *   Bots process localized 6-element sensor arrays: `[DeltaX, DeltaY, ObsUp, ObsDown, ObsLeft, ObsRight]`, ensuring spatial invariance across the 9×9 grid.
*   **Advanced Swarm Traffic Management**:
    *   **NVIC-Style Preemption Interrupts**: Active mission bots automatically trigger preemption interrupts on idle/parked bots to vacate paths.
    *   **Recursive Cascading Corridor Unblocking**: Resolves dense multi-bot blockages by chain-vacating adjacent idle bots to open corridors.
    *   **10-Second Station Dwell Service**: Destination locking with automated handover to queued bots.
    *   **Pipelined Multi-Agent Advance**: Waiting bots travel concurrently and stage right outside the target (`Staging / Queued`), eliminating stationary delay.
    *   **Strict Physical Adjacency & Non-Jumping Realism**: Step-by-step 2-second locomotion (`STEP_INTERVAL_MS = 2000`) with zero diagonal jumps or teleportation.
*   **Interactive 9×9 Matrix Target Selector**:
    *   Tactile dropdown menu (`TGT: [Val]`) opening a visual 9×9 coordinate selector (`11` to `99`) for each AGV.
*   **Cyberpunk Neumorphic Interface**:
    *   Single-viewport locked layout with animated neon LED status indicators (Cyan, Lime, Yellow, Red, Orange).
    *   Dynamic BOTSQUAD companion typewriter header with contextual telemetry logs.

---

## 🛠️ Tech Stack

*   **Frontend**: HTML5, Vanilla CSS3 (Neumorphic Cyberpunk theme with Orbitron typography), JavaScript (ES6+ async/await swarm coordinator).
*   **Backend & API**: Python 3.8+, Flask, Flask-CORS.
*   **Deep Learning & Heuristics**: PyTorch, NumPy, Prioritized Experience Replay, Neural-Guided A* Search.
*   **Deployment**: GitHub Pages (Automated CI/CD via GitHub Actions).

---

## 📦 Local Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Titas8100/ML-driven_Multi-Agent_Path_Planning_of_IoRT-based_AGV_Swarm.git
cd ML-driven_Multi-Agent_Path_Planning_of_IoRT-based_AGV_Swarm
```

### 2. Setup Python Environment & Dependencies

#### Option A: Windows Automated Setup
Inside the project folder, run the setup script:
```cmd
cd models
setup_env.bat
```

#### Option B: Manual Cross-Platform Setup (Windows / macOS / Linux)
```bash
cd models
python -m venv venv

# Activate Virtual Environment:
# On Windows (PowerShell / Command Prompt):
venv\Scripts\activate
# On macOS / Linux:
source venv/bin/activate

# Install Dependencies:
pip install -r requirements.txt
```

### 3. Run the Flask AI Backend Server
With the virtual environment activated inside `models/`:
```bash
python JS_DQN.py
```
*(The Flask REST API starts on `http://localhost:5000` with the trained PMR-DQN model and Least-Turns Neural A\* search engine)*.

### 4. Launch the Frontend Interface

Open a **second terminal** in the project root directory and start a local HTTP server:
```bash
python -m http.server 8000
```
Open your browser and navigate to:
👉 **`http://localhost:8000/index.html`** *(or `http://localhost:8000/hmi_15.html`)*

> **Note**: The web interface also supports **Standalone Mode**. If you open `index.html` directly in your browser without running the Flask server, the built-in client-side router (`computeLocalPath`) will automatically execute the swarm navigation and collision avoidance.

### 5. Train the Model (Optional)
To retrain the PMR-Dueling DQN model from scratch with high-contention multi-agent scenarios and turn-minimization reward shaping:
```bash
cd models
python train_pmr.py
```
*(Pre-trained weights `pmr_dqn_model.pth` are already included in the repository).*

---

## 📂 Project Structure

```
├── .github/workflows/pages.yml      # Automated GitHub Pages CI/CD workflow
├── models/
│   ├── PMR_DQN.py                   # Dueling DQN architecture & Prioritized Replay Buffer
│   ├── train_pmr.py                 # Multi-agent reinforcement learning training loop
│   ├── JS_DQN.py                    # Flask inference API & Neural A* search engine
│   ├── pmr_dqn_model.pth            # Trained PyTorch neural network weights
│   ├── setup_env.bat                # Windows automated environment setup script
│   └── requirements.txt             # Python dependencies
├── index.html / hmi_15.html         # Interactive Cyberpunk Human-Machine Interface
├── hmi_15_css.css                   # Neumorphic styling, animations, and glowing UI tokens
├── hmi_15_script.js                 # Swarm Coordinator, NVIC preemption, & in-browser router
├── NEUROPATHFINDER_DETAILED_SUMMARY.txt # Comprehensive technical & architectural documentation
├── _config.yml / .nojekyll          # GitHub Pages static deployment configurations
└── swarm_hmi_sim_thumbnail.png      # Application visual preview asset
```

---

## 📄 Documentation

For an exhaustive architectural report detailing the Dueling DQN math, SumTree implementation, state vectors, reward shaping, and hardware integration specs, refer to [NEUROPATHFINDER_DETAILED_SUMMARY.txt](NEUROPATHFINDER_DETAILED_SUMMARY.txt).
