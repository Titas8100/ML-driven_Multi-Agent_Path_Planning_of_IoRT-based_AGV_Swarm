# ML-driven Multi-Agent Path Planning of IoRT-based AGV Swarm

Developed a Simulator App for Deep Q-Network (PMR-Dueling DQN) based coordinated path planning for an AGV Swarm with a cyberpunk Neumorphic HMI.

<p align="center">
  <a href="https://youtu.be/yY7uKPZqF8M?si=59pC2A13zGofAJWs" target="_blank">
    <img src="swarm_hmi_sim_thumbnail.png" alt="Simulation Video" width="600"/>
  </a>
</p>

---

## 🚀 Key Features

*   **PMR-Dueling DQN Backend**: Deep Reinforcement Learning integrating Prioritized Experience Replay, Dueling Networks, Double-DQN, and least-turns path optimization.
*   **IoRT Sensor-Based Navigation**: Bots process spatial environmental states via real-time 6-element sensor arrays (`[DeltaX, DeltaY, ObsUp, ObsDown, ObsLeft, ObsRight]`).
*   **Multi-Agent Swarm Coordination**:
    *   **NVIC Interrupt Preemption**: Active/higher priority bots dynamically preempt stationary or lower-priority bots in narrow corridors.
    *   **Pipelined Queue & Dwell Service**: Seamless target handover with 10-second station service cycles.
    *   **Strict Physical Adjacency & Collision Exclusion**: Guarantees zero coexistence and zero teleportation/skipping.
*   **Interactive 9×9 Matrix Target Selector**: Intuitive popover coordinate picker (`11` to `99`) for all 4 AGVs.
*   **Sci-Fi Neumorphic HMI**:
    *   Single-viewport locked responsive layout with custom glowing cyan scrollbars.
    *   Dynamic typing companion header.
    *   Independent log stream console with dedicated reset/refresh controls.

---

## 🛠️ Tech Stack

*   **Frontend**: HTML5, Vanilla CSS3 (Neumorphic Cyberpunk theme), JavaScript (ES6+ async/await coordination).
*   **Backend**: Python, Flask, Flask-CORS.
*   **Machine Learning**: PyTorch, NumPy, Heapq A* hybrid heuristic guidance.

---

## 📦 Installation & Usage

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Titas8100/ML-driven_Multi-Agent_Path_Planning_of_IoRT-based_AGV_Swarm.git
    cd ML-driven_Multi-Agent_Path_Planning_of_IoRT-based_AGV_Swarm
    ```

2.  **Setup Python Environment**:
    Open a terminal in the `models/` directory:
    ```bash
    cd models
    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt
    ```

3.  **Train the Model (Optional)**:
    ```bash
    python train_pmr.py
    ```
    *(Pre-trained weights `pmr_dqn_model.pth` are included)*

4.  **Run the Backend Server**:
    ```bash
    python JS_DQN.py
    ```
    *(Runs on `http://localhost:5000`)*

5.  **Launch the Frontend**:
    Serve the project root or open `hmi_15.html` in your browser:
    ```bash
    python -m http.server 8080
    ```
    Navigate to `http://localhost:8080/hmi_15.html`.

---

## 📂 Project Structure

*   `models/`:
    *   `PMR_DQN.py`: Dueling DQN neural network architecture.
    *   `train_pmr.py`: Prioritized Memory Replay training pipeline.
    *   `JS_DQN.py`: Flask inference server & hybrid PMR-DQN / A* pathfinder.
    *   `pmr_dqn_model.pth`: Trained PyTorch neural network weights.
*   `hmi_15.html`: Main interactive Human-Machine Interface.
*   `hmi_15_css.css`: Neumorphic styling and layout tokens.
*   `hmi_15_script.js`: Swarm coordination engine, NVIC interrupt handler, and dynamic telemetry.
*   `NEUROPATHFINDER_DETAILED_SUMMARY.txt`: Comprehensive architectural documentation.
