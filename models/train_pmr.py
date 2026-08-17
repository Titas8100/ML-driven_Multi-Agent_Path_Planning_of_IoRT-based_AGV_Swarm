import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

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

# === Enhanced Multi-Agent Environment with Turn Minimization & Traffic Contention ===
class GridEnvironment:
    def __init__(self):
        self.grid_size = GRID_SIZE
        self.num_bots = NUM_BOTS
        self.prev_actions = [-1] * self.num_bots
        self.reset()

    def reset(self):
        self.obstacles = []
        num_obstacles = random.randint(5, 12)
        for _ in range(num_obstacles):
            pos = (random.randint(0, self.grid_size-1), random.randint(0, self.grid_size-1))
            self.obstacles.append(pos)
        
        self.bots = []
        self.goals = []
        self.prev_actions = [-1] * self.num_bots
        
        for i in range(self.num_bots):
            while True:
                start = (random.randint(0, self.grid_size-1), random.randint(0, self.grid_size-1))
                if start not in self.obstacles and start not in self.bots:
                    self.bots.append(start)
                    break
        
        # 40% chance of high-contention shared bottleneck / convergent destinations
        is_contention = random.random() < 0.4
        shared_goal = (random.randint(0, self.grid_size-1), random.randint(0, self.grid_size-1))
        while shared_goal in self.obstacles or shared_goal in self.bots:
            shared_goal = (random.randint(0, self.grid_size-1), random.randint(0, self.grid_size-1))

        for i in range(self.num_bots):
            if is_contention and i < 2:
                self.goals.append(shared_goal)
            else:
                while True:
                    goal = (random.randint(0, self.grid_size-1), random.randint(0, self.grid_size-1))
                    if goal not in self.obstacles and goal != self.bots[i]:
                        self.goals.append(goal)
                        break
        
        return self.get_state()

    def get_state(self, agent_idx=None):
        if agent_idx is None:
            return np.array([self.get_state(i) for i in range(self.num_bots)])
            
        bx, by = self.bots[agent_idx]
        gx, gy = self.goals[agent_idx]
        
        delta_x = (gx - bx) / self.grid_size
        delta_y = (gy - by) / self.grid_size
        
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
                
            sensors.append(0.0)
            
        state = np.array([delta_x, delta_y] + sensors, dtype=np.float32)
        return state

    def step(self, actions):
        rewards = [0.0] * self.num_bots
        new_positions = list(self.bots)
        
        prev_dists = []
        for i in range(self.num_bots):
            bx, by = self.bots[i]
            gx, gy = self.goals[i]
            prev_dists.append(abs(bx - gx) + abs(by - gy))
        
        done = False
        deltas = [(-1, 0), (1, 0), (0, -1), (0, 1)]
        
        for i, action in enumerate(actions):
            x, y = self.bots[i]
            dx, dy = deltas[action]
            nx, ny = x + dx, y + dy
            
            # Boundary Check
            if 0 <= nx < self.grid_size and 0 <= ny < self.grid_size:
                if (nx, ny) not in self.obstacles:
                    new_positions[i] = (nx, ny)
                else:
                    rewards[i] -= 0.5
            else:
                rewards[i] -= 0.5

            # Turn Penalty / Straight-Line Momentum (Least Turns Optimization)
            if self.prev_actions[i] != -1:
                if action != self.prev_actions[i]:
                    rewards[i] -= 0.1  # Turn penalty
                else:
                    rewards[i] += 0.05 # Straight-line momentum bonus
            self.prev_actions[i] = action

        # Collision between bots
        if len(set(new_positions)) < len(new_positions):
            return self.get_state(), [-3.0]*self.num_bots, True # Crash penalty
            
        self.bots = new_positions
        
        # Goals & Reward Shaping
        completed = 0
        for i in range(self.num_bots):
            bx, by = self.bots[i]
            gx, gy = self.goals[i]
            curr_dist = abs(bx - gx) + abs(by - gy)
            
            if curr_dist < prev_dists[i]:
                rewards[i] += 0.3 # Moving closer
            elif curr_dist > prev_dists[i]:
                rewards[i] -= 0.3 # Moving away
            
            if self.bots[i] == self.goals[i]:
                rewards[i] += 12.0 # Goal Reached!
                completed += 1
            else:
                rewards[i] -= 0.05
                
        if completed == self.num_bots:
            done = True
            
        return self.get_state(), rewards, done

# === Training Process ===
def train():
    env = GridEnvironment()
    
    policy_net = DuelingDQN(STATE_SIZE, ACTION_SIZE).to(device) 
    target_net = DuelingDQN(STATE_SIZE, ACTION_SIZE).to(device)
    target_net.load_state_dict(policy_net.state_dict())
    target_net.eval()
    
    optimizer = optim.Adam(policy_net.parameters(), lr=1e-4)
    replay_buffer = PrioritizedReplayBuffer(capacity=50000)
    
    epsilon = 1.0
    epsilon_decay = 0.992
    epsilon_min = 0.05
    beta = 0.4
    
    batch_size = 64
    episodes = 500
    
    print("🚀 Starting PMR-Dueling DQN Training with Turn Optimization & Swarm Contention...")
    
    for episode in range(episodes):
        states = env.reset()
        total_reward = 0
        done = False
        step_count = 0
        
        while not done and step_count < 50:
            step_count += 1
            actions = []
            states_tensor = torch.FloatTensor(states).to(device)
            
            with torch.no_grad():
                q_values = policy_net(states_tensor)
            
            for i in range(NUM_BOTS):
                if random.random() < epsilon:
                    actions.append(random.randint(0, 3))
                else:
                    actions.append(torch.argmax(q_values[i]).item())
            
            next_states, rewards, done = env.step(actions)
            
            for i in range(NUM_BOTS):
                replay_buffer.add(states[i], actions[i], rewards[i], next_states[i], done)
                total_reward += rewards[i]
            
            states = next_states
            
            if replay_buffer.tree.n_entries > batch_size:
                b_states, b_actions, b_rewards, b_next_states, b_dones, idxs, is_weights = replay_buffer.sample(batch_size, beta)
                
                if b_states is not None:
                    states_t = torch.FloatTensor(b_states).to(device)
                    actions_t = torch.LongTensor(b_actions).unsqueeze(1).to(device)
                    rewards_t = torch.FloatTensor(b_rewards).unsqueeze(1).to(device)
                    next_states_t = torch.FloatTensor(b_next_states).to(device)
                    dones_t = torch.FloatTensor(b_dones).unsqueeze(1).to(device)
                    weights_t = torch.FloatTensor(is_weights).unsqueeze(1).to(device)
                    
                    q_vals = policy_net(states_t)
                    q_curr = q_vals.gather(1, actions_t)
                    
                    with torch.no_grad():
                        next_q_policy = policy_net(next_states_t)
                        best_actions = next_q_policy.argmax(1).unsqueeze(1)
                        
                        next_q_target = target_net(next_states_t)
                        target_vals = next_q_target.gather(1, best_actions)
                        
                    y = rewards_t + (0.99 * target_vals * (1 - dones_t))
                    diff = y - q_curr
                    loss = (diff.pow(2) * weights_t).mean()
                    
                    optimizer.zero_grad()
                    loss.backward()
                    optimizer.step()
                    
                    errors = torch.abs(diff).detach().cpu().numpy().flatten()
                    replay_buffer.update_priorities(idxs, errors)

        if episode % 10 == 0:
            target_net.load_state_dict(policy_net.state_dict())
            
        epsilon = max(epsilon_min, epsilon * epsilon_decay)
        beta = min(1.0, beta + 0.001)
        
        if episode % 50 == 0:
            print(f"Episode {episode} | Avg Reward: {total_reward/NUM_BOTS:.2f} | Epsilon: {epsilon:.2f}")

    torch.save(policy_net.state_dict(), "pmr_dqn_model.pth")
    print("✅ Training Complete. Model saved as 'pmr_dqn_model.pth'")

if __name__ == "__main__":
    train()
