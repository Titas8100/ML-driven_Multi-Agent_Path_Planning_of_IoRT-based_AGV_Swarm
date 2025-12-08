from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import numpy as np
from PMR_DQN import DuelingDQN

# === Configuration ===
GRID_SIZE = 9
NUM_BOTS = 4
ACTION_SIZE = 4
STATE_SIZE = 6 # [DeltaX, DeltaY, U, D, L, R]
MODEL_PATH = "pmr_dqn_model.pth"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# === Load Model ===
model = DuelingDQN(STATE_SIZE, ACTION_SIZE).to(device)
try:
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    print(f"✅ Loaded {MODEL_PATH}")
except Exception as e:
    print(f"⚠️ Could not load {MODEL_PATH}: {e}")
    print("⚠️ Please run 'train_pmr.py' to generate the model weights.")

model.eval()

# === Setup Flask App ===
app = Flask(__name__)
CORS(app)

def simulate_path(start, goal, dynamic_obstacles=None, max_steps=50):
    """
    Simulates path for a single bot from start to goal.
    start, goal: tuples (row, col) 0-indexed
    dynamic_obstacles: list of (row, col) tuples to avoid
    """
    if dynamic_obstacles is None:
        dynamic_obstacles = []
        
    path = []
    current_pos = start
    
    # Track visited to prevent infinite loops (simple safety)
    visited = set()
    visited.add(current_pos)

    for _ in range(max_steps):
        # Record 1-based format for Frontend
        # format: "RowCol" e.g. (0,0) -> "11"
        r, c = current_pos
        path.append(f"{r+1}{c+1}")
        
        if current_pos == goal:
            break

        x, y = current_pos # Define x,y here!

        # 1. Construct Sensor State (6 floats)
        # [DeltaX, DeltaY, ObsUp, ObsDown, ObsLeft, ObsRight]
        bx, by = current_pos
        gx, gy = goal
        
        delta_x = (gx - bx) / GRID_SIZE
        delta_y = (gy - by) / GRID_SIZE
        
        sensors = []
        directions = [(-1, 0), (1, 0), (0, -1), (0, 1)] # U, D, L, R
        
        for dx, dy in directions:
            nx, ny = bx + dx, by + dy
            # Check Wall/Boundary
            if not (0 <= nx < GRID_SIZE and 0 <= ny < GRID_SIZE):
                sensors.append(1.0)
            # Check Dynamic Obstacles (Other Bots)
            elif (nx, ny) in dynamic_obstacles:
                sensors.append(1.0)
            else:
                sensors.append(0.0)
                
        state = np.array([delta_x, delta_y] + sensors, dtype=np.float32)
        state_tensor = torch.FloatTensor(state).unsqueeze(0).to(device)

        # 2. Predict Action with Cycle Detection
        with torch.no_grad():
            q_values = model(state_tensor) # (1, 4) - Direct action output
            
            # Sort actions by Q-value (descending)
            # q_values[0] is (4,)
            sorted_actions = torch.argsort(q_values[0], descending=True).tolist()
            
            action = sorted_actions[0] # Default to best
            
            # Try to find best valid, non-visited action
            for act in sorted_actions:
                dx, dy = 0, 0
                if act == 0: dx, dy = -1, 0
                elif act == 1: dx, dy = 1, 0
                elif act == 2: dx, dy = 0, -1
                elif act == 3: dx, dy = 0, 1
                
                nx, ny = x + dx, y + dy
                
                # Check bounds
                if not (0 <= nx < GRID_SIZE and 0 <= ny < GRID_SIZE):
                    continue
                
                # Check visited
                if (nx, ny) in visited and (nx, ny) != goal:
                    continue
                    
                # If we get here, this action is valid and not visited (or is goal)
                action = act
                break

        # 3. Apply Action
        x, y = current_pos
        dx, dy = 0, 0
        if action == 0: dx, dy = -1, 0
        elif action == 1: dx, dy = 1, 0
        elif action == 2: dx, dy = 0, -1
        elif action == 3: dx, dy = 0, 1
        
        nx, ny = x + dx, y + dy
        
        # Boundary Check
        next_pos = current_pos
        if 0 <= nx < GRID_SIZE and 0 <= ny < GRID_SIZE:
             next_pos = (nx, ny)
        
        # Avoid simple loops
        if next_pos in visited and next_pos != goal:
             # If stuck, maybe try random? or just break
             pass 
             
        current_pos = next_pos
        visited.add(current_pos)

    return '.'.join(path)

@app.route("/predict_path", methods=["POST"])
def predict_path():
    try:
        data = request.get_json()
        print("📨 Received data:", data)

        # Frontend sends "11" for (row 1, col 1) -> Map to (0, 0)
        def str_to_coord(val):
            if isinstance(val, str) and len(val) == 2:
                # '1' -> 0
                return (int(val[0]) - 1, int(val[1]) - 1)
            raise ValueError("Expected 2-digit string like '11'.")

        start = str_to_coord(data["start"])
        goal = str_to_coord(data["goal"])
        
        # Parse dynamic obstacles (other bots)
        obstacles = []
        if "obstacles" in data:
            for obs in data["obstacles"]:
                # Obs is [row, col] (0-indexed already from frontend logic? No, frontend sends [r, c])
                # Check frontend logic: `obstacles.push([Math.floor(pos / 10), pos % 10]);`
                # Frontend sends [1, 1] for 11. Wait, frontend `pos` is like 11. 
                # `Math.floor(11/10)` -> 1. `11%10` -> 1.
                # So frontend sends 1-based indices [1, 1].
                # We need to convert to 0-based.
                obstacles.append((obs[0] - 1, obs[1] - 1))

        print(f"📍 Planning: {start} -> {goal} | Avoid: {obstacles}")

        path_str = simulate_path(start, goal, obstacles)
        print(f"🏁 Path: {path_str}")
        
        return jsonify({"path": path_str})

    except Exception as e:
        print("❌ Error:", str(e))
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    print("🧠 Starting PMR-Dueling AI Server on http://localhost:5000")
    app.run(port=5000)
