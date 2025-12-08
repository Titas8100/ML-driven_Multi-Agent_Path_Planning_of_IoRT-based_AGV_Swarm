# NeuroPathfinder

**NeuroPathfinder** is an AI-driven grid navigation demonstration that utilizes Deep Reinforcement Learning (Dueling Double-DQN) to plan real-time, collision-free paths for multiple bots.

## Features

*   **Advanced RL Backend**: Powered by a **PMR-Dueling DQN** (Prioritized Experience Replay + Dueling Network + Double DQN) model.
*   **Sensor-Based Navigation**: Bots view the world through a 6-element sensor state (`[DeltaX, DeltaY, ObsUp, ObsDown, ObsLeft, ObsRight]`) for robust obstacle avoidance.
*   **Multi-Agent Support**: Controls up to 4 bots simultaneously, with dynamic collision avoidance (bots see each other as moving obstacles).
*   **Modern HMI**: A web-based Human Machine Interface (HMI) featuring:
    *   **Neumorphic Design**: Sleek "Dark Cyan" theme with glowing, border-less neumorphic buttons.
    *   **Real-time Analysis**: Displays generated paths and status.
    *   **Compact Control Panel**: Optimized layout for full visibility.

## Tech Stack

*   **Frontend**: HTML5, CSS3 (Neumorphic), JavaScript (ES6).
*   **Backend**: Python, Flask.
*   **Machine Learning**: PyTorch, NumPy.

## Installation & Usage

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/ARI-SAM/NeuroPathfinder.git
    cd NeuroPathfinder
    ```

2.  **Setup Python Environment**:
    Open a terminal in the `models/` directory and run the initialization script:
    ```bash
    cd models
    setup_env.bat
    ```
    *Or manually:*
    ```bash
    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt
    ```

3.  **Train the Model (Optional)**:
    If you want to re-train the AI from scratch:
    ```bash
    python train_pmr.py
    ```
    *(A pre-trained `pmr_dqn_model.pth` is included)*

4.  **Run the Server**:
    Start the Flask backend:
    ```bash
    python JS_DQN.py
    ```

5.  **Launch the Frontend**:
    Open `hmi_15.html` in your web browser.

## Project Structure

*   `models/`: Contains all Python ML code (`PMR_DQN.py`, `train_pmr.py`), Flask server (`JS_DQN.py`), and the trained model.
*   `hmi_15.html`: The main frontend interface.
*   `hmi_15_css.css`: Styling and neumorphic design.
*   `hmi_15_script.js`: Frontend logic and simple pathfinding visualization.
