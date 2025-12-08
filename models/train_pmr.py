import numpy as np
import random
import torch
import torch.optim as optim
import torch.nn as nn
from PMR_DQN import DuelingDQN, PrioritizedReplayBuffer

# === Configuration ===
GRID_SIZE = 9
NUM_BOTS = 4
ACTION_SIZE = 4  # Up, Down, Left, Right
STATE_SIZE = 6 # [DeltaX, DeltaY, ObsUp, ObsDown, ObsLeft, ObsRight]

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {device}")

# === Enhanced Environment ===
class GridEnvironment:
    def __init__(self):
        self.grid_size = GRID_SIZE
        self.num_bots = NUM_BOTS
        self.reset()

    def reset(self):
        # 1. Initialize empty grid (logic only)
        # 2. Add Random Obstacles (e.g., 5-10 obstacles)
        self.obstacles = []
        num_obstacles = random.randint(5, 10)
        for _ in range(num_obstacles):
            pos = (random.randint(0, self.grid_size-1), random.randint(0, self.grid_size-1))
            self.obstacles.append(pos)
        
        # 3. Initialize Bots and Goals
        self.bots = []
        self.goals = []
        
        for i in range(self.num_bots):
            while True:
                start = (random.randint(0, self.grid_size-1), random.randint(0, self.grid_size-1))
                if start not in self.obstacles and start not in self.bots:
                    self.bots.append(start)
                    break
            while True:
                goal = (random.randint(0, self.grid_size-1), random.randint(0, self.grid_size-1))
                if goal not in self.obstacles and goal != start and goal not in self.goals:
                    self.goals.append(goal)
                    break
        
        return self.get_state()

    def get_state(self, agent_idx=None):
        # Sensor-Based State (6 values)
        # Returns Normalized Vector:
        # [DeltaX, DeltaY, BlockUp, BlockDown, BlockLeft, BlockRight]
        
        if agent_idx is None:
            return np.array([self.get_state(i) for i in range(self.num_bots)])
            
        bx, by = self.bots[agent_idx]
        gx, gy = self.goals[agent_idx]
        
        # 1. Delta to Goal (Normalized by Grid Size)
        delta_x = (gx - bx) / self.grid_size
        delta_y = (gy - by) / self.grid_size
        
        # 2. Proximity Sensors (1.0 if blocked, 0.0 if free)
        # Directions: Up(-1,0), Down(1,0), Left(0,-1), Right(0,1) matches Action Index 0,1,2,3
        sensors = []
        directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
        
        for dx, dy in directions:
            nx, ny = bx + dx, by + dy
            
            # Check Wall
            if not (0 <= nx < self.grid_size and 0 <= ny < self.grid_size):
                sensors.append(1.0)
                continue
                
            # Check Static Obstacle
            if (nx, ny) in self.obstacles:
                sensors.append(1.0)
                continue
                
            # Check Other Bots (Dynamic Obstacles)
            is_bot = False
            for i, other_pos in enumerate(self.bots):
                if i != agent_idx and other_pos == (nx, ny):
                    is_bot = True
                    break
            if is_bot:
                sensors.append(1.0)
                continue
                
            # If free
            sensors.append(0.0)
            
        state = np.array([delta_x, delta_y] + sensors, dtype=np.float32)
        return state

    def step(self, actions):
        rewards = [0.0] * self.num_bots
        new_positions = list(self.bots)
        
        # Calculate distances BEFORE move
        prev_dists = []
        for i in range(self.num_bots):
            bx, by = self.bots[i]
            gx, gy = self.goals[i]
            prev_dists.append(abs(bx - gx) + abs(by - gy))
        
        done = False
        
        for i, action in enumerate(actions):
            x, y = self.bots[i]
            
            # Apply Action
            dx, dy = 0, 0
            if action == 0: dx, dy = -1, 0 # Up
            elif action == 1: dx, dy = 1, 0 # Down
            elif action == 2: dx, dy = 0, -1 # Left
            elif action == 3: dx, dy = 0, 1 # Right
            
            nx, ny = x + dx, y + dy
            
            # Boundary Check
            if 0 <= nx < self.grid_size and 0 <= ny < self.grid_size:
                # Obstacle Check
                if (nx, ny) not in self.obstacles:
                     new_positions[i] = (nx, ny)
                else:
                    rewards[i] -= 0.5 # Hit obstacle (reduced penalty to encourage exploring near it)
            else:
                 rewards[i] -= 0.5 # Hit wall

        # Collision between bots
        if len(set(new_positions)) < len(new_positions):
            return self.get_state(), [-2.0]*self.num_bots, True # Crash
            
        self.bots = new_positions
        
        # Goals & Reward Shaping
        completed = 0
        for i in range(self.num_bots):
            bx, by = self.bots[i]
            gx, gy = self.goals[i]
            curr_dist = abs(bx - gx) + abs(by - gy)
            
            # Reward Shaping: Reward for getting closer
            if curr_dist < prev_dists[i]:
                rewards[i] += 0.2 # Improving
            elif curr_dist > prev_dists[i]:
                rewards[i] -= 0.2 # Worsening
            
            if self.bots[i] == self.goals[i]:
                rewards[i] += 10.0 # Goal!
                completed += 1
            else:
                rewards[i] -= 0.05 # Small step penalty
                
        if completed == self.num_bots:
            done = True
            
        return self.get_state(), rewards, done

# === Training Process ===
def train():
    env = GridEnvironment()
    
    # SHARE BRAIN: Input=State(81), Output=Action(4). 
    # We treat each bot's experience as a sample.
    policy_net = DuelingDQN(STATE_SIZE, ACTION_SIZE).to(device) 
    target_net = DuelingDQN(STATE_SIZE, ACTION_SIZE).to(device)
    target_net.load_state_dict(policy_net.state_dict())
    target_net.eval()
    
    optimizer = optim.Adam(policy_net.parameters(), lr=1e-4)
    replay_buffer = PrioritizedReplayBuffer(capacity=50000)
    
    epsilon = 1.0
    epsilon_decay = 0.995
    epsilon_min = 0.05
    beta = 0.4
    
    batch_size = 64
    episodes = 1000 
    
    print("🚀 Starting PMR-Dueling DQN Training (Shared Brain)...")
    
    for episode in range(episodes):
        states = env.reset() # Returns (4, 81)
        total_reward = 0
        done = False
        step_count = 0
        
        while not done and step_count < 50:
            step_count += 1
            
            # Select Actions for all 4 bots
            actions = []
            
            # We can batch predict for all 4 bots at once!
            states_tensor = torch.FloatTensor(states).to(device) # (4, 81)
            
            with torch.no_grad():
                q_values = policy_net(states_tensor) # (4, 4)
            
            for i in range(NUM_BOTS):
                if random.random() < epsilon:
                    actions.append(random.randint(0, 3))
                else:
                    actions.append(torch.argmax(q_values[i]).item())
            
            # Step Environment
            next_states, rewards, done = env.step(actions)
            
            # Store Transitions - Treat each bot as an individual experience
            # We add 4 transitions to buffer per step
            for i in range(NUM_BOTS):
                 replay_buffer.add(states[i], actions[i], rewards[i], next_states[i], done)
                 total_reward += rewards[i]
            
            states = next_states
            
            # Learn
            if replay_buffer.tree.n_entries > batch_size:
                # Sample batch of mixed bot experiences
                b_states, b_actions, b_rewards, b_next_states, b_dones, idxs, is_weights = replay_buffer.sample(batch_size, beta)
                
                if b_states is not None:
                    states_t = torch.FloatTensor(b_states).to(device)
                    actions_t = torch.LongTensor(b_actions).unsqueeze(1).to(device)
                    rewards_t = torch.FloatTensor(b_rewards).unsqueeze(1).to(device)
                    next_states_t = torch.FloatTensor(b_next_states).to(device)
                    dones_t = torch.FloatTensor(b_dones).unsqueeze(1).to(device)
                    weights_t = torch.FloatTensor(is_weights).unsqueeze(1).to(device)
                    
                    # Current Q
                    q_vals = policy_net(states_t)
                    q_curr = q_vals.gather(1, actions_t)
                    
                    # Double DQN Target
                    with torch.no_grad():
                        next_q_policy = policy_net(next_states_t)
                        best_actions = next_q_policy.argmax(1).unsqueeze(1)
                        
                        next_q_target = target_net(next_states_t)
                        target_vals = next_q_target.gather(1, best_actions)
                        
                    y = rewards_t + (0.99 * target_vals * (1 - dones_t))
                    
                    # Loss
                    diff = y - q_curr
                    loss = (diff.pow(2) * weights_t).mean()
                    
                    optimizer.zero_grad()
                    loss.backward()
                    optimizer.step()
                    
                    # Update Priorities
                    errors = torch.abs(diff).detach().cpu().numpy().flatten()
                    replay_buffer.update_priorities(idxs, errors)

        # Update Target Network
        if episode % 10 == 0:
            target_net.load_state_dict(policy_net.state_dict())
            
        # Update Hypers
        epsilon = max(epsilon_min, epsilon * epsilon_decay)
        beta = min(1.0, beta + 0.001)
        
        if episode % 50 == 0:
            print(f"Episode {episode} | Avg Reward: {total_reward/NUM_BOTS:.2f} | Epsilon: {epsilon:.2f}")

    torch.save(policy_net.state_dict(), "pmr_dqn_model.pth")
    print("✅ Training Complete. Model saved as 'pmr_dqn_model.pth'")

if __name__ == "__main__":
    train()
