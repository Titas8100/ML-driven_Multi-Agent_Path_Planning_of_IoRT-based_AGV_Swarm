import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import numpy as np
import heapq
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
    print(f"Loaded {MODEL_PATH}")
except Exception as e:
    print(f"Could not load {MODEL_PATH}: {e}")

model.eval()

# === Setup Flask App ===
app = Flask(__name__)
CORS(app)

def simulate_path(start, goal, dynamic_obstacles=None, max_steps=150):
    """
    Simulates optimal path from start to goal using PMR-Dueling DQN guidance
    with dynamic obstacle avoidance and least-turns optimization.
    Every step is strictly contiguous and orthogonal (|dr| + |dc| == 1).
    """
    if dynamic_obstacles is None:
        dynamic_obstacles = []
        
    obstacle_set = {obs for obs in dynamic_obstacles if obs != goal and obs != start}
    
    if start == goal:
        return f"{start[0]+1}{start[1]+1}"

    deltas = [(-1, 0), (1, 0), (0, -1), (0, 1)] # Up, Down, Left, Right
    
    pq = []
    tie_counter = 0
    start_dist = abs(start[0] - goal[0]) + abs(start[1] - goal[1])
    heapq.heappush(pq, (start_dist, 0, 0, 0, start, [start], None))
    
    visited_costs = {}
    best_path = None
    
    while pq:
        f_cost, g_cost, turns, _, current_pos, path, prev_act = heapq.heappop(pq)
        
        if current_pos == goal:
            best_path = path
            break
            
        state_key = (current_pos, prev_act)
        if state_key in visited_costs and g_cost >= visited_costs[state_key]:
            continue
        visited_costs[state_key] = g_cost
            
        if len(path) > max_steps:
            continue
            
        bx, by = current_pos
        gx, gy = goal
        
        delta_x = (gx - bx) / GRID_SIZE
        delta_y = (gy - by) / GRID_SIZE
        
        sensors = []
        for dx, dy in deltas:
            nx, ny = bx + dx, by + dy
            if not (0 <= nx < GRID_SIZE and 0 <= ny < GRID_SIZE):
                sensors.append(1.0)
            elif (nx, ny) in obstacle_set:
                sensors.append(1.0)
            else:
                sensors.append(0.0)
                
        state = np.array([delta_x, delta_y] + sensors, dtype=np.float32)
        state_tensor = torch.FloatTensor(state).unsqueeze(0).to(device)
        
        with torch.no_grad():
            q_values = model(state_tensor)[0].cpu().numpy()
            
        for act, (dx, dy) in enumerate(deltas):
            nx, ny = bx + dx, by + dy
            
            if not (0 <= nx < GRID_SIZE and 0 <= ny < GRID_SIZE):
                continue
                
            if (nx, ny) in obstacle_set:
                continue
                
            next_pos = (nx, ny)
            next_g = g_cost + 1
            
            is_turn = (prev_act is not None and act != prev_act)
            turn_penalty = 0.3 if is_turn else 0.0
            next_turns = turns + (1 if is_turn else 0)
            
            next_key = (next_pos, act)
            if next_key not in visited_costs or next_g < visited_costs[next_key]:
                h_dist = abs(nx - gx) + abs(ny - gy)
                dqn_pref = -0.25 * float(q_values[act])
                next_f = next_g + h_dist + dqn_pref + turn_penalty
                tie_counter += 1
                heapq.heappush(pq, (next_f, next_g, next_turns, tie_counter, next_pos, path + [next_pos], act))
                
    # Fallback 1: Soft A* with obstacle penalties (strictly orthogonal single steps)
    if not best_path:
        pq = []
        tie_counter = 0
        heapq.heappush(pq, (start_dist, 0, 0, start, [start]))
        visited_soft = {}
        
        while pq:
            f_cost, g_cost, _, current_pos, path = heapq.heappop(pq)
            if current_pos == goal:
                best_path = path
                break
            if current_pos in visited_soft and g_cost >= visited_soft[current_pos]:
                continue
            visited_soft[current_pos] = g_cost
            
            for dx, dy in deltas:
                nx, ny = current_pos[0] + dx, current_pos[1] + dy
                if 0 <= nx < GRID_SIZE and 0 <= ny < GRID_SIZE:
                    step_penalty = 5.0 if (nx, ny) in obstacle_set else 1.0
                    next_g = g_cost + step_penalty
                    h_dist = abs(nx - goal[0]) + abs(ny - goal[1])
                    tie_counter += 1
                    heapq.heappush(pq, (next_g + h_dist, next_g, tie_counter, (nx, ny), path + [(nx, ny)]))

    # Fallback 2: Guaranteed single-step orthogonal Manhattan path
    if not best_path:
        best_path = [start]
        cr, cc = start
        gr, gc = goal
        while cr != gr:
            cr += 1 if gr > cr else -1
            best_path.append((cr, cc))
        while cc != gc:
            cc += 1 if gc > cc else -1
            best_path.append((cr, cc))
        
    return '.'.join([f"{r+1}{c+1}" for r, c in best_path])

@app.route("/predict_path", methods=["POST"])
def predict_path():
    try:
        data = request.get_json()
        
        def str_to_coord(val):
            if isinstance(val, str) and len(val) == 2:
                return (int(val[0]) - 1, int(val[1]) - 1)
            raise ValueError("Expected 2-digit string like '11'.")

        start = str_to_coord(data["start"])
        goal = str_to_coord(data["goal"])
        
        obstacles = []
        if "obstacles" in data:
            for obs in data["obstacles"]:
                obstacles.append((obs[0] - 1, obs[1] - 1))

        path_str = simulate_path(start, goal, obstacles)
        return jsonify({"path": path_str})

    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    print("Starting PMR-Dueling AI Server on http://localhost:5000")
    app.run(port=5000)
