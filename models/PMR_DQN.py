import torch
import torch.nn as nn
import numpy as np
import random

# ==========================================
# 1. SumTree for Prioritized Experience Replay
# ==========================================
class SumTree:
    def __init__(self, capacity):
        self.capacity = capacity
        # Parent nodes + Leaf nodes
        self.tree = np.zeros(2 * capacity - 1)
        self.data = np.zeros(capacity, dtype=object)
        self.write = 0
        self.n_entries = 0

    def _propagate(self, idx, change):
        parent = (idx - 1) // 2
        self.tree[parent] += change
        if parent != 0:
            self._propagate(parent, change)

    def _retrieve(self, idx, s):
        left = 2 * idx + 1
        right = left + 1

        if left >= len(self.tree):
            return idx

        if s <= self.tree[left]:
            return self._retrieve(left, s)
        else:
            return self._retrieve(right, s - self.tree[left])

    def total(self):
        return self.tree[0]

    def add(self, p, data):
        idx = self.write + self.capacity - 1
        self.data[self.write] = data
        self.update(idx, p)

        self.write += 1
        if self.write >= self.capacity:
            self.write = 0
        if self.n_entries < self.capacity:
            self.n_entries += 1

    def update(self, idx, p):
        change = p - self.tree[idx]
        self.tree[idx] = p
        self._propagate(idx, change)

    def get(self, s):
        idx = self._retrieve(0, s)
        dataIdx = idx - self.capacity + 1
        return (idx, self.tree[idx], self.data[dataIdx])

# ==========================================
# 2. Prioritized Replay Buffer
# ==========================================
class PrioritizedReplayBuffer:
    def __init__(self, capacity, alpha=0.6):
        self.tree = SumTree(capacity)
        self.alpha = alpha  # Priority exponent
        self.epsilon = 1e-5 # Small constant to avoid zero priority

    def add(self, state, action, reward, next_state, done):
        max_p = np.max(self.tree.tree[-self.tree.capacity:])
        if max_p == 0:
            max_p = 1.0
        self.tree.add(max_p, (state, action, reward, next_state, done))

    def sample(self, batch_size, beta=0.4):
        batch = []
        idxs = []
        segment = self.tree.total() / batch_size
        priorities = []

        for i in range(batch_size):
            a = segment * i
            b = segment * (i + 1)
            s = random.uniform(a, b)
            (idx, p, data) = self.tree.get(s)
            
            # If data is None (buffer not full yet), try resampling or skip
            if data == 0: # Check initialized value
                 # Safe fallback if tree is empty or issues
                 continue
                 
            batch.append(data)
            idxs.append(idx)
            priorities.append(p)
        
        if len(batch) == 0: # handle empty case
            return None, None, None

        sampling_probabilities = np.array(priorities) / self.tree.total()
        is_weights = np.power(self.tree.n_entries * sampling_probabilities, -beta)
        is_weights /= is_weights.max() # Normalize

        # Unpack batch
        if len(batch) > 0:
             states, actions, rewards, next_states, dones = zip(*batch)
             return (
                np.array(states),
                np.array(actions),
                np.array(rewards, dtype=np.float32),
                np.array(next_states),
                np.array(dones, dtype=np.bool_),
                np.array(idxs),
                np.array(is_weights, dtype=np.float32)
            )
        return None

    def update_priorities(self, idxs, errors):
        for idx, error in zip(idxs, errors):
            p = (error + self.epsilon) ** self.alpha
            self.tree.update(idx, p)

# ==========================================
# 3. Dueling DQN Architecture
# ==========================================
class DuelingDQN(nn.Module):
    def __init__(self, state_size, action_size):
        super(DuelingDQN, self).__init__()
        
        self.feature_layer = nn.Sequential(
            nn.Linear(state_size, 128),
            nn.ReLU(),
            nn.Linear(128, 128),
            nn.ReLU()
        )
        
        # Value stream (Scalar)
        self.value_stream = nn.Sequential(
            nn.Linear(128, 128),
            nn.ReLU(),
            nn.Linear(128, 1) # V(s)
        )
        
        # Advantage stream (Vector of size action_size)
        self.advantage_stream = nn.Sequential(
            nn.Linear(128, 128),
            nn.ReLU(),
            nn.Linear(128, action_size) # A(s, a)
        )

    def forward(self, x):
        features = self.feature_layer(x)
        values = self.value_stream(features)
        advantages = self.advantage_stream(features)
        
        # Q(s, a) = V(s) + (A(s, a) - mean(A(s, a)))
        qvals = values + (advantages - advantages.mean(dim=1, keepdim=True))
        return qvals
