// =========================================================================
// NEUROPATHFINDER MULTI-AGENT SWARM COORDINATOR (NVIC INTERRUPT & PIPELINED TRAFFIC)
// =========================================================================

// Bot States
const botStates = {
    1: { positionValue: 11, targetValue: 0, path: [], running: false, isDwelling: false, dwellCountdown: 0, statusText: "Idle", interruptText: "Normal", stopRequested: false },
    2: { positionValue: 19, targetValue: 0, path: [], running: false, isDwelling: false, dwellCountdown: 0, statusText: "Idle", interruptText: "Normal", stopRequested: false },
    3: { positionValue: 91, targetValue: 0, path: [], running: false, isDwelling: false, dwellCountdown: 0, statusText: "Idle", interruptText: "Normal", stopRequested: false },
    4: { positionValue: 99, targetValue: 0, path: [], running: false, isDwelling: false, dwellCountdown: 0, statusText: "Idle", interruptText: "Normal", stopRequested: false }
};

// Target Claims Registry: { [targetVal]: { activeBotId: number, queue: number[] } }
const targetClaims = {};

// Mutex lock for ML path calculation
let isCalculatingPath = false;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =========================================================================
// DYNAMIC SCI-FI TYPING ANIMATION CONTROLLER (BOTSQUAD COMPANION)
// =========================================================================
const idlePhrases = [
    "The BOTSQUAD is bored, give them task...",
    "BOTSQUAD units standing by: Ready for deployment.",
    "Neural pathfinder online. Swarm awaiting your orders, Commander.",
    "BOTSQUAD enjoyed the teamwork!",
    "All systems nominal. Ready for target assignment."
];

let currentPhraseIndex = 0;
let isTypingActive = false;
let typingTimeout = null;

function typeMessage(targetText, callback) {
    clearTimeout(typingTimeout);
    isTypingActive = true;
    const typingElement = document.getElementById("typing-text");
    if (!typingElement) {
        isTypingActive = false;
        return;
    }

    let i = 0;
    typingElement.textContent = "";

    function step() {
        if (i < targetText.length) {
            typingElement.textContent += targetText.charAt(i);
            i++;
            typingTimeout = setTimeout(step, 30 + Math.random() * 20);
        } else {
            isTypingActive = false;
            if (callback) callback();
        }
    }
    step();
}

function setBotsquadStatus(customMessage, holdMs = 4500) {
    clearTimeout(typingTimeout);
    typeMessage(customMessage, () => {
        typingTimeout = setTimeout(() => {
            scheduleNextIdlePhrase();
        }, holdMs);
    });
}

function scheduleNextIdlePhrase() {
    let anyRunning = false;
    for (let id = 1; id <= 4; id++) {
        if (botStates[id].running || botStates[id].isDwelling) {
            anyRunning = true;
            break;
        }
    }

    let nextText = "";
    if (anyRunning) {
        nextText = "BOTSQUAD executing multi-agent swarm coordination...";
    } else {
        nextText = idlePhrases[currentPhraseIndex % idlePhrases.length];
        currentPhraseIndex++;
    }

    typeMessage(nextText, () => {
        typingTimeout = setTimeout(() => {
            scheduleNextIdlePhrase();
        }, 5500);
    });
}

// =========================================================================
// LOGS & TELEMETRY CONTROLLER (WITH ONE-LINE GAP)
// =========================================================================
function logAnalysis(message) {
    const logsBox = document.querySelector(".logs-container p");
    if (logsBox) {
        const timestamp = new Date().toLocaleTimeString();
        const entryHtml = `<div class="log-entry">[${timestamp}] ${message}</div>`;
        if (logsBox.innerHTML.trim() === "") {
            logsBox.innerHTML = entryHtml;
        } else {
            logsBox.innerHTML += entryHtml;
        }
        const container = document.querySelector(".analysis-section");
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
}

function clearLogs() {
    const logsBox = document.querySelector(".logs-container p");
    if (logsBox) {
        logsBox.innerHTML = "";
    }
    logAnalysis("Telemetry logs cleared by user.");
    setBotsquadStatus("Telemetry logs purged.");
}

// =========================================================================
// 9x9 MATRIX TARGET SELECTOR MENU INITIALIZATION
// =========================================================================
function initMatrixSelectors() {
    const defaults = { 1: "15", 2: "15", 3: "15", 4: "15" };

    for (let b = 1; b <= 4; b++) {
        const picker = document.getElementById(`matrixPicker${b}`);
        const menuBtn = document.getElementById(`matrixMenuBtn${b}`);
        const dropdown = document.getElementById(`matrixDropdown${b}`);
        const hiddenInput = document.getElementById(`setValue${b}`);
        const valDisplay = document.getElementById(`matrixVal${b}`);

        if (!picker || !menuBtn || !dropdown || !hiddenInput || !valDisplay) continue;

        picker.innerHTML = "";
        const curVal = hiddenInput.value || defaults[b] || "15";
        hiddenInput.value = curVal;
        valDisplay.textContent = curVal;

        // Build 9x9 matrix buttons (11 to 99)
        for (let r = 1; r <= 9; r++) {
            for (let c = 1; c <= 9; c++) {
                const cellVal = `${r}${c}`;
                const cellBtn = document.createElement("button");
                cellBtn.type = "button";
                cellBtn.className = `matrix-cell-btn ${cellVal === curVal ? 'selected' : ''}`;
                cellBtn.dataset.value = cellVal;
                cellBtn.textContent = cellVal;
                cellBtn.title = `Coordinate (${r}, ${c})`;

                cellBtn.onclick = (e) => {
                    e.stopPropagation();
                    hiddenInput.value = cellVal;
                    valDisplay.textContent = cellVal;

                    picker.querySelectorAll(".matrix-cell-btn").forEach(btn => btn.classList.remove("selected"));
                    cellBtn.classList.add("selected");

                    dropdown.classList.remove("show");
                    menuBtn.classList.remove("active");

                    logAnalysis(`Bot ${b} target coordinate selected: ${cellVal} (Matrix).`);
                };

                picker.appendChild(cellBtn);
            }
        }

        menuBtn.onclick = (e) => {
            e.stopPropagation();
            for (let other = 1; other <= 4; other++) {
                if (other !== b) {
                    const otherDropdown = document.getElementById(`matrixDropdown${other}`);
                    const otherBtn = document.getElementById(`matrixMenuBtn${other}`);
                    if (otherDropdown) otherDropdown.classList.remove("show");
                    if (otherBtn) otherBtn.classList.remove("active");
                }
            }

            const isOpen = dropdown.classList.contains("show");
            if (isOpen) {
                dropdown.classList.remove("show");
                menuBtn.classList.remove("active");
            } else {
                dropdown.classList.add("show");
                menuBtn.classList.add("active");
            }
        };
    }

    document.addEventListener("click", () => {
        for (let b = 1; b <= 4; b++) {
            const dropdown = document.getElementById(`matrixDropdown${b}`);
            const menuBtn = document.getElementById(`matrixMenuBtn${b}`);
            if (dropdown) dropdown.classList.remove("show");
            if (menuBtn) menuBtn.classList.remove("active");
        }
    });
}

// =========================================================================
// UI TELEMETRY & STATUS UPDATE (RED FOR INTERRUPTED & QUEUED)
// =========================================================================
function updateUI(botId) {
    const state = botStates[botId];
    const runningDiv = document.getElementById(`runningBtn${botId}`);
    const interruptDiv = document.getElementById(`interruptBtn${botId}`);
    const targetDisplay = document.getElementById(`targetDisplay${botId}`);
    const posDiv = document.getElementById(`posBtn${botId}`);

    if (posDiv) {
        posDiv.textContent = `Position: ${state.positionValue}`;
    }

    if (targetDisplay) {
        if (state.statusText === "Queued" || state.statusText === "Approaching" || state.statusText === "Staging") {
            targetDisplay.textContent = `Target: ${state.targetValue} (Q)`;
        } else {
            targetDisplay.textContent = `Target: ${state.targetValue}`;
        }
    }

    // RUNNING / STATUS BUTTON
    if (runningDiv) {
        runningDiv.textContent = state.statusText || (state.running ? "Running" : "Idle");

        // RED for Queued, Interrupted, Stopped, Error, Blocked
        if (state.statusText === "Queued" || state.statusText === "Interrupted" || state.statusText === "Interrupt" || state.statusText === "Stopped" || state.statusText === "Error" || state.statusText === "Blocked") {
            runningDiv.style.color = "#ff3e3e";
            runningDiv.style.borderColor = "#ff3e3e";
            runningDiv.style.boxShadow = "0px 0px 6px 1px #ff3e3e";
        }
        // GREEN for Running, Goal / Dwelling
        else if (state.running || (state.statusText && state.statusText.startsWith("Goal"))) {
            runningDiv.style.color = "#00ff66";
            runningDiv.style.borderColor = "#00ff66";
            runningDiv.style.boxShadow = "0px 0px 6px 1px #00ff66";
        }
        // ORANGE / YELLOW for Vacating, Approaching, Staging
        else if (state.statusText === "Vacating") {
            runningDiv.style.color = "#ff9900";
            runningDiv.style.borderColor = "#ff9900";
            runningDiv.style.boxShadow = "0px 0px 6px 1px #ff9900";
        } else if (state.statusText === "Approaching" || state.statusText === "Staging") {
            runningDiv.style.color = "#ffff00";
            runningDiv.style.borderColor = "#ffff00";
            runningDiv.style.boxShadow = "0px 0px 6px 1px #ffff00";
        }
        // CYAN for Idle, Parked, Reached
        else {
            runningDiv.style.color = "#a4f3f2";
            runningDiv.style.borderColor = "rgb(97, 245, 245)";
            runningDiv.style.boxShadow = "0px 0px 3px 1px #12a0a0";
        }
    }

    // INTERRUPT / PREEMPTION BUTTON
    if (interruptDiv) {
        interruptDiv.textContent = state.interruptText || "Normal";

        // RED for Interrupted, Interrupt, Preempted, Queued, Stopped
        if (state.interruptText === "Interrupt" || state.interruptText === "Interrupted" || state.interruptText === "Preempted" || state.interruptText === "Queued" || state.interruptText === "Stopped") {
            interruptDiv.style.color = "#ff3e3e";
            interruptDiv.style.borderColor = "#ff3e3e";
            interruptDiv.style.boxShadow = "0px 0px 6px 1px #ff3e3e";
        }
        // YELLOW for Waiting, Yielding, Standoff, Pipelined
        else if (state.interruptText === "Waiting" || state.interruptText === "Yielding" || state.interruptText === "Standoff" || state.interruptText === "Pipelined") {
            interruptDiv.style.color = "#ffff00";
            interruptDiv.style.borderColor = "#ffff00";
            interruptDiv.style.boxShadow = "0px 0px 6px 1px #ffff00";
        }
        // GREEN for Dwelling, Active
        else if (state.interruptText === "Dwelling" || state.interruptText === "Active") {
            interruptDiv.style.color = "#00ff66";
            interruptDiv.style.borderColor = "#00ff66";
            interruptDiv.style.boxShadow = "0px 0px 6px 1px #00ff66";
        }
        // CYAN for Normal, Complete
        else {
            interruptDiv.style.color = "#a4f3f2";
            interruptDiv.style.borderColor = "rgb(97, 245, 245)";
            interruptDiv.style.boxShadow = "0px 0px 3px 1px #12a0a0";
        }
    }
}

function updateGrid() {
    // 1. Reset all grid cells
    document.querySelectorAll(".gridcell").forEach(cell => {
        const val = cell.dataset.value;
        cell.textContent = val;
        cell.style.color = "#a4f3f2";
        cell.style.backgroundColor = "#0A2129";
        cell.style.fontWeight = "normal";
        cell.style.border = "1px solid #12a0a0";
        cell.style.boxShadow = "inset 0px 0px 4px #12a0a0";
    });

    const botColors = ["#ff3e3e", "#c25ced", "#ffff00", "#00ff00"];
    const glowColors = ["rgba(255, 62, 62, 0.8)", "rgba(194, 92, 237, 0.8)", "rgba(255, 255, 0, 0.8)", "rgba(0, 255, 0, 0.8)"];

    function isOccupied(cellVal) {
        for (let b = 1; b <= 4; b++) {
            if (botStates[b].positionValue === cellVal) return true;
        }
        return false;
    }

    // 2. Render Path Trails & Targets
    for (let i = 1; i <= 4; i++) {
        const state = botStates[i];
        if (state.running && state.path && state.path.length > 0) {
            state.path.forEach(step => {
                const stepVal = parseInt(step);
                if (!isOccupied(stepVal)) {
                    const stepCell = document.querySelector(`.gridcell[data-value='${stepVal}']`);
                    if (stepCell) {
                        stepCell.style.border = `1px dashed ${botColors[i - 1]}`;
                        stepCell.style.boxShadow = `inset 0px 0px 6px ${glowColors[i - 1]}`;
                    }
                }
            });
        }
        if (state.targetValue > 0 && state.running) {
            if (!isOccupied(state.targetValue)) {
                const tgtCell = document.querySelector(`.gridcell[data-value='${state.targetValue}']`);
                if (tgtCell) {
                    tgtCell.style.border = `2px dashed ${botColors[i - 1]}`;
                    tgtCell.style.boxShadow = `inset 0px 0px 10px ${glowColors[i - 1]}, 0px 0px 8px ${glowColors[i - 1]}`;
                }
            }
        }
    }

    // 3. Render Live Bots on top
    for (let i = 1; i <= 4; i++) {
        const pos = botStates[i].positionValue;
        const cell = document.querySelector(`.gridcell[data-value='${pos}']`);
        if (cell) {
            cell.textContent = `B-${i}`;
            cell.style.color = botColors[i - 1];
            cell.style.fontWeight = "bold";
            cell.style.backgroundColor = "#041419";
            cell.style.border = `2px solid ${botColors[i - 1]}`;
            cell.style.boxShadow = `inset 0px 0px 12px ${glowColors[i - 1]}, 0px 0px 10px ${glowColors[i - 1]}`;
        }
        const posDiv = document.getElementById(`posBtn${i}`);
        if (posDiv) {
            posDiv.textContent = `Position: ${pos}`;
        }
    }
}

// Constant step movement interval (2000ms / 2s)
const STEP_INTERVAL_MS = 2000;

function getDynamicObstacles(forBotId, endTarget) {
    const obstacles = [];
    for (let id = 1; id <= 4; id++) {
        if (id !== forBotId) {
            const pos = botStates[id].positionValue;
            if (pos && pos !== 0 && pos !== endTarget) {
                obstacles.push([Math.floor(pos / 10), pos % 10]);
            }
        }
    }
    return obstacles;
}

// STRICT ORTHOGONAL 1-STEP NEIGHBOR FINDER (NO MULTI-CELL SKIPPING)
function findSafeAdjacentCell(currentPos, avoidTarget = null) {
    const r = Math.floor(currentPos / 10);
    const c = currentPos % 10;
    
    // Strictly 4 immediate orthogonal neighbors only (Distance = 1)
    const candidates = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1]
    ];

    for (const [nr, nc] of candidates) {
        if (nr >= 1 && nr <= 9 && nc >= 1 && nc <= 9) {
            const candidateVal = nr * 10 + nc;
            if (candidateVal === currentPos || candidateVal === avoidTarget) continue;

            let isOccupied = false;
            for (let id = 1; id <= 4; id++) {
                if (botStates[id].positionValue === candidateVal) {
                    isOccupied = true;
                    break;
                }
            }

            if (!isOccupied) {
                return candidateVal;
            }
        }
    }
    return null;
}

// Resilient A* Local Router (Guaranteed Strictly Orthogonal 1-Step Path)
function computeLocalPath(startVal, goalVal, obstacles) {
    const obsSet = new Set();
    if (obstacles) {
        obstacles.forEach(obs => {
            const val = obs[0] * 10 + obs[1];
            if (val !== startVal && val !== goalVal) {
                obsSet.add(val);
            }
        });
    }

    // 1. Strict BFS avoiding dynamic obstacles
    const queue = [[startVal, [`${startVal}`]]];
    const visited = new Set([startVal]);

    while (queue.length > 0) {
        const [current, path] = queue.shift();
        if (current === goalVal) {
            return path;
        }

        const cr = Math.floor(current / 10);
        const cc = current % 10;

        const neighbors = [
            cr > 1 ? current - 10 : null,
            cr < 9 ? current + 10 : null,
            cc > 1 ? current - 1 : null,
            cc < 9 ? current + 1 : null
        ];

        for (const next of neighbors) {
            if (next !== null && !obsSet.has(next) && !visited.has(next)) {
                visited.add(next);
                queue.push([next, [...path, `${next}`]]);
            }
        }
    }

    // 2. Soft BFS allowing stepping past obstacles (to be preempted dynamically)
    const softQueue = [[startVal, [`${startVal}`]]];
    const softVisited = new Set([startVal]);
    while (softQueue.length > 0) {
        const [current, path] = softQueue.shift();
        if (current === goalVal) {
            return path;
        }

        const cr = Math.floor(current / 10);
        const cc = current % 10;

        const neighbors = [
            cr > 1 ? current - 10 : null,
            cr < 9 ? current + 10 : null,
            cc > 1 ? current - 1 : null,
            cc < 9 ? current + 1 : null
        ];

        for (const next of neighbors) {
            if (next !== null && !softVisited.has(next)) {
                softVisited.add(next);
                softQueue.push([next, [...path, `${next}`]]);
            }
        }
    }

    // 3. Guaranteed step-by-step contiguous Manhattan orthogonal path
    const fallbackPath = [`${startVal}`];
    let cr = Math.floor(startVal / 10);
    let cc = startVal % 10;
    const gr = Math.floor(goalVal / 10);
    const gc = goalVal % 10;
    while (cr !== gr) {
        cr += (gr > cr) ? 1 : -1;
        fallbackPath.push(`${cr * 10 + cc}`);
    }
    while (cc !== gc) {
        cc += (gc > cc) ? 1 : -1;
        fallbackPath.push(`${cr * 10 + cc}`);
    }
    return fallbackPath;
}

async function requestOptimalRoute(startVal, goalVal, forBotId) {
    while (isCalculatingPath) {
        await sleep(40);
    }
    isCalculatingPath = true;

    const obstacles = getDynamicObstacles(forBotId, goalVal);
    let pathList = [];

    try {
        const response = await fetch("http://localhost:5000/predict_path", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                start: startVal.toString(),
                goal: goalVal.toString(),
                obstacles: obstacles
            })
        });
        const data = await response.json();
        pathList = (data.path && data.path.length > 0) ? data.path.split(".") : [];
        if (pathList.length === 0 || parseInt(pathList[pathList.length - 1]) !== goalVal) {
            pathList = computeLocalPath(startVal, goalVal, obstacles);
        }
    } catch (err) {
        pathList = computeLocalPath(startVal, goalVal, obstacles);
    } finally {
        isCalculatingPath = false;
    }

    return pathList;
}

// Vacate a bot in Interrupt Mode (Strictly 1 Adjacent Step, Cascading if Necessary)
async function vacateBot(botId, reason = "Interrupt", depth = 0) {
    if (depth > 3) return null;
    const state = botStates[botId];
    const currentPos = state.positionValue;
    let vacateCell = findSafeAdjacentCell(currentPos, state.targetValue);

    // If immediate 1-step neighbors are blocked by other bots, cascade the neighbor away first
    if (!vacateCell) {
        const r = Math.floor(currentPos / 10);
        const c = currentPos % 10;
        const candidates = [
            [r - 1, c],
            [r + 1, c],
            [r, c - 1],
            [r, c + 1]
        ];

        for (const [nr, nc] of candidates) {
            if (nr >= 1 && nr <= 9 && nc >= 1 && nc <= 9) {
                const neighborPos = nr * 10 + nc;
                for (let other = 1; other <= 4; other++) {
                    if (other !== botId && botStates[other].positionValue === neighborPos && !botStates[other].running && !botStates[other].isDwelling) {
                        logAnalysis(`[Cascading Clearance] Stepping Bot ${other} out of ${neighborPos} so Bot ${botId} can vacate...`);
                        const cascaded = await vacateBot(other, `Cascade for Bot ${botId}`, depth + 1);
                        if (cascaded) {
                            vacateCell = neighborPos;
                            break;
                        }
                    }
                }
                if (vacateCell) break;
            }
        }
    }

    if (vacateCell) {
        // Physical Adjacency check
        const curR = Math.floor(currentPos / 10);
        const curC = currentPos % 10;
        const vacR = Math.floor(vacateCell / 10);
        const vacC = vacateCell % 10;
        if (Math.abs(vacR - curR) + Math.abs(vacC - curC) !== 1) {
            console.error(`[Fatal Violation] Non-adjacent vacate rejected: ${currentPos} -> ${vacateCell}`);
            return null;
        }

        logAnalysis(`[NVIC Interrupt] Bot ${botId} (${state.statusText}) preempted (${reason}). Vacating 1 step: ${currentPos} -> ${vacateCell}...`);
        setBotsquadStatus(`NVIC Interrupt: Bot ${botId} vacating path.`);
        state.statusText = "Vacating";
        state.interruptText = "Interrupt";
        updateUI(botId);

        await sleep(STEP_INTERVAL_MS);
        state.positionValue = vacateCell;
        state.running = false;
        state.isDwelling = false;
        state.dwellCountdown = 0;
        state.statusText = "Parked";
        state.interruptText = "Normal";
        updateGrid();
        updateUI(botId);
        logAnalysis(`[NVIC Handover] Bot ${botId} safely parked at ${vacateCell}.`);
        return vacateCell;
    }
    return null;
}

async function startBotJourney(botId, targetVal, isPipelinedQueue = false) {
    const state = botStates[botId];
    state.running = true;
    state.stopRequested = false;
    state.statusText = isPipelinedQueue ? "Approaching" : "Running";
    state.interruptText = isPipelinedQueue ? "Pipelined" : "Active";
    updateUI(botId);

    if (state.positionValue === targetVal) {
        state.running = false;
        state.statusText = "Reached";
        updateUI(botId);
        return;
    }

    setBotsquadStatus(`BOTSQUAD dispatched! Bot ${botId} moving towards Target ${targetVal}.`);

    // Corridor clearance: If target is occupied by an idle/parked bot, preempt it now
    for (let id = 1; id <= 4; id++) {
        if (id !== botId && botStates[id].positionValue === targetVal && !botStates[id].running && !botStates[id].isDwelling) {
            logAnalysis(`[NVIC Corridor Clearance] Target ${targetVal} occupied by stationary Bot ${id}. Preempting Bot ${id}...`);
            await vacateBot(id, `Clear Target ${targetVal} for Bot ${botId}`);
            break;
        }
    }

    let pathList = await requestOptimalRoute(state.positionValue, targetVal, botId);
    state.path = pathList;
    logAnalysis(`Bot ${botId} optimal route: ${pathList.join(".")}`);
    updateGrid();

    // Step-by-step movement loop with strict physical adjacency and exclusion
    while (state.positionValue !== targetVal && !state.stopRequested) {
        if (!pathList || pathList.length <= 1) {
            pathList = await requestOptimalRoute(state.positionValue, targetVal, botId);
            state.path = pathList;
            updateGrid();
        }

        const nextPos = parseInt(pathList[1] || pathList[0]);
        if (nextPos === state.positionValue) {
            pathList.shift();
            continue;
        }

        // 1. STRICT PHYSICAL ADJACENCY VERIFICATION
        const curPos = state.positionValue;
        const curR = Math.floor(curPos / 10);
        const curC = curPos % 10;
        const nextR = Math.floor(nextPos / 10);
        const nextC = nextPos % 10;
        if (Math.abs(nextR - curR) + Math.abs(nextC - curC) !== 1) {
            logAnalysis(`[Physical Integrity] Correcting non-adjacent jump (${curPos} -> ${nextPos}). Computing contiguous route...`);
            pathList = computeLocalPath(curPos, targetVal, getDynamicObstacles(botId, targetVal));
            state.path = pathList;
            updateGrid();
            continue;
        }

        // 2. STRICT PHYSICAL OCCUPATION CHECK
        let occupierId = null;
        for (let id = 1; id <= 4; id++) {
            if (id !== botId && botStates[id].positionValue === nextPos) {
                occupierId = id;
                break;
            }
        }

        if (occupierId) {
            const occState = botStates[occupierId];

            // If next tile is destination and occupier is dwelling: Stage and wait for dwell completion
            if (nextPos === targetVal && occState.isDwelling) {
                state.statusText = "Staging";
                state.interruptText = "Queued";
                updateUI(botId);
                await sleep(1000);
                continue;
            }

            // If occupier is stationary: Preempt it immediately (moves 1 step away)
            if (!occState.running && !occState.isDwelling) {
                logAnalysis(`[NVIC Clearance] Next cell ${nextPos} occupied by stationary Bot ${occupierId}. Preempting in Interrupt Mode...`);
                await vacateBot(occupierId, `Make way for Bot ${botId}`);
                
                // If still occupied after vacate attempt, yield and detour
                if (botStates[occupierId].positionValue === nextPos) {
                    state.interruptText = "Yielding";
                    updateUI(botId);
                    await sleep(STEP_INTERVAL_MS);
                    pathList = await requestOptimalRoute(state.positionValue, targetVal, botId);
                    state.path = pathList;
                    updateGrid();
                    continue;
                }
            } else {
                // Both moving: Priority based on Bot ID
                if (botId > occupierId) {
                    state.interruptText = "Yielding";
                    updateUI(botId);
                    await sleep(STEP_INTERVAL_MS);

                    if (botStates[occupierId].positionValue === nextPos) {
                        logAnalysis(`[Dynamic Re-route] Bot ${botId} recalculating detour around Bot ${occupierId}...`);
                        pathList = await requestOptimalRoute(state.positionValue, targetVal, botId);
                        state.path = pathList;
                        updateGrid();
                        continue;
                    }
                }
            }
        }

        // Re-verify that nextPos is 100% empty before stepping onto it
        let isStillOccupied = false;
        for (let id = 1; id <= 4; id++) {
            if (id !== botId && botStates[id].positionValue === nextPos) {
                isStillOccupied = true;
                break;
            }
        }
        if (isStillOccupied) {
            state.interruptText = "Yielding";
            updateUI(botId);
            await sleep(STEP_INTERVAL_MS);
            continue;
        }

        if (state.stopRequested) break;

        // Step movement interval: 2 seconds
        await sleep(STEP_INTERVAL_MS);
        if (state.stopRequested) break;

        state.positionValue = nextPos;
        pathList.shift();
        state.path = pathList;
        state.statusText = (state.positionValue === targetVal) ? "Goal (10s)" : (isPipelinedQueue ? "Approaching" : "Running");
        state.interruptText = (state.positionValue === targetVal) ? "Dwelling" : "Active";
        updateGrid();
        updateUI(botId);
    }

    if (state.stopRequested) {
        state.running = false;
        state.statusText = "Stopped";
        updateUI(botId);
        return;
    }

    // === ARRIVED AT DESTINATION: START 10s DWELL CYCLE ===
    state.path = [];
    state.isDwelling = true;
    state.statusText = "Goal (10s)";
    state.interruptText = "Dwelling";
    updateGrid();
    updateUI(botId);

    if (!targetClaims[targetVal]) {
        targetClaims[targetVal] = { activeBotId: botId, queue: [] };
    } else {
        targetClaims[targetVal].activeBotId = botId;
    }

    logAnalysis(`[Swarm] Bot ${botId} reached Target ${targetVal}. Starting 10-second dwell service...`);
    setBotsquadStatus(`Bot ${botId} arrived at Target ${targetVal}. Servicing 10s dwell cycle...`);

    for (let sec = 10; sec >= 1; sec--) {
        if (state.stopRequested) return;
        state.dwellCountdown = sec;
        state.statusText = `Goal (${sec}s)`;
        updateUI(botId);
        await sleep(1000);
    }

    state.isDwelling = false;
    state.dwellCountdown = 0;
    if (state.stopRequested) return;

    logAnalysis(`[Swarm] Bot ${botId} completed 10-second dwell service at Target ${targetVal}.`);

    // Check FCFS queue for target handover
    const claim = targetClaims[targetVal];
    if (claim && claim.queue && claim.queue.length > 0) {
        await vacateBot(botId, "Dwell Complete - Handover to Queue");
        state.running = false;
        state.statusText = "Idle";
        state.interruptText = "Normal";
        updateUI(botId);
        updateGrid();

        const nextBotId = claim.queue.shift();
        if (nextBotId && botStates[nextBotId]) {
            claim.activeBotId = nextBotId;
            logAnalysis(`[Swarm] Target ${targetVal} cleared. Signaling queued Bot ${nextBotId} to take destination.`);
            if (!botStates[nextBotId].running) {
                startBotJourney(nextBotId, targetVal, false);
            }
        }
    } else {
        delete targetClaims[targetVal];
        state.running = false;
        state.statusText = "Idle";
        state.interruptText = "Normal";
        updateUI(botId);
        updateGrid();
        logAnalysis(`[Swarm] Bot ${botId} mission complete at Target ${targetVal}.`);
        setBotsquadStatus("BOTSQUAD enjoyed the teamwork! Awaiting next mission.");
    }
}

// =========================================================================
// TASK ALLOCATION HANDLER (ONLY IDLE BOTS CAN BE ALLOCATED TASKS)
// =========================================================================
async function handleSetTarget(botId) {
    const val = document.getElementById(`setValue${botId}`).value;
    const targetVal = parseInt(val);
    const state = botStates[botId];

    const isIdle = !state.running && !state.isDwelling && (state.statusText === "Idle" || state.statusText === "Reached" || state.statusText === "Parked" || state.statusText === "Stopped");
    if (!isIdle) {
        logAnalysis(`[Access Denied] Bot ${botId} is currently ${state.statusText}. New tasks can only be allocated in IDLE mode.`);
        setBotsquadStatus(`Bot ${botId} is busy (${state.statusText}). Wait for Idle mode.`);
        return;
    }

    if (state.positionValue === targetVal) {
        logAnalysis(`Bot ${botId} is already at destination ${targetVal}.`);
        setBotsquadStatus(`Bot ${botId} is already at destination ${targetVal}.`);
        return;
    }

    state.targetValue = targetVal;
    state.stopRequested = false;

    // Check if another bot is currently at targetVal
    let occupyingBotId = null;
    for (let id = 1; id <= 4; id++) {
        if (id !== botId && botStates[id].positionValue === targetVal) {
            occupyingBotId = id;
            break;
        }
    }

    const claim = targetClaims[targetVal];
    const activeLeaderId = claim ? claim.activeBotId : occupyingBotId;

    if (occupyingBotId) {
        const occState = botStates[occupyingBotId];

        if (occState.isDwelling) {
            if (!targetClaims[targetVal]) {
                targetClaims[targetVal] = { activeBotId: occupyingBotId, queue: [] };
            }
            if (!targetClaims[targetVal].queue.includes(botId)) {
                targetClaims[targetVal].queue.push(botId);
            }

            logAnalysis(`[Swarm Queue] Bot ${occupyingBotId} is servicing dwelling period at ${targetVal} (${occState.dwellCountdown}s left). Bot ${botId} queued with Pipelined Transit.`);
            setBotsquadStatus(`Bot ${botId} queued for Target ${targetVal}. Advancing in pipelined queue.`);
            startBotJourney(botId, targetVal, true);
            return;
        } else {
            // Target is occupied by IDLE / Parked bot -> Vacate immediately
            if (!targetClaims[targetVal]) {
                targetClaims[targetVal] = { activeBotId: botId, queue: [] };
            } else {
                targetClaims[targetVal].activeBotId = botId;
            }

            logAnalysis(`[NVIC Preempt] Target ${targetVal} is occupied by Bot ${occupyingBotId}. Vacating in Interrupt Mode.`);
            await vacateBot(occupyingBotId, "Preempted by Bot " + botId);
            startBotJourney(botId, targetVal, false);
            return;
        }
    }

    // If another bot is currently en route to targetVal
    if (activeLeaderId && activeLeaderId !== botId && botStates[activeLeaderId].running) {
        if (!targetClaims[targetVal]) {
            targetClaims[targetVal] = { activeBotId: activeLeaderId, queue: [] };
        }
        if (!targetClaims[targetVal].queue.includes(botId)) {
            targetClaims[targetVal].queue.push(botId);
        }
        logAnalysis(`[Swarm Queue] Bot ${activeLeaderId} is en route to ${targetVal}. Bot ${botId} queued with Pipelined Transit.`);
        setBotsquadStatus(`Bot ${botId} queued behind Bot ${activeLeaderId} for Target ${targetVal}.`);
        startBotJourney(botId, targetVal, true);
        return;
    }

    targetClaims[targetVal] = { activeBotId: botId, queue: [] };
    startBotJourney(botId, targetVal, false);
}

function stopBot(botId) {
    const state = botStates[botId];
    state.stopRequested = true;
    state.running = false;
    state.isDwelling = false;
    state.dwellCountdown = 0;
    state.statusText = "Stopped";
    state.interruptText = "Stopped";
    state.path = [];

    for (const targetVal in targetClaims) {
        if (targetClaims[targetVal].activeBotId === botId) {
            delete targetClaims[targetVal];
        } else if (targetClaims[targetVal].queue) {
            targetClaims[targetVal].queue = targetClaims[targetVal].queue.filter(id => id !== botId);
        }
    }

    updateUI(botId);
    updateGrid();
    logAnalysis(`Bot ${botId} stopped by user.`);
    setBotsquadStatus(`Bot ${botId} emergency stopped.`);
}

function resetBot(botId) {
    const defaults = { 1: 11, 2: 19, 3: 91, 4: 99 };
    stopBot(botId);

    const state = botStates[botId];
    state.targetValue = 0;
    state.positionValue = defaults[botId];
    state.statusText = "Idle";
    state.interruptText = "Normal";

    const targetDisplay = document.getElementById(`targetDisplay${botId}`);
    if (targetDisplay) targetDisplay.textContent = `Target: 0`;

    const hiddenInput = document.getElementById(`setValue${botId}`);
    const valDisplay = document.getElementById(`matrixVal${botId}`);
    if (hiddenInput && valDisplay) {
        hiddenInput.value = "15";
        valDisplay.textContent = "15";
    }

    const picker = document.getElementById(`matrixPicker${botId}`);
    if (picker) {
        picker.querySelectorAll(".matrix-cell-btn").forEach(btn => {
            if (btn.dataset.value === "15") {
                btn.classList.add("selected");
            } else {
                btn.classList.remove("selected");
            }
        });
    }

    updateGrid();
    updateUI(botId);
    logAnalysis(`Bot ${botId} reset to default position ${defaults[botId]}. State: IDLE.`);
    setBotsquadStatus(`Bot ${botId} reset to base position ${defaults[botId]}. Ready for orders.`);
}

// =========================================================================
// INITIALIZATION & EVENT BINDINGS
// =========================================================================
function initApp() {
    // 1. Initialize Main 9x9 Grid
    const grid = document.querySelector(".grid");
    if (grid) {
        grid.innerHTML = "";
        for (let i = 1; i <= 9; i++) {
            for (let j = 1; j <= 9; j++) {
                const cell = document.createElement("div");
                cell.className = "gridcell";
                cell.dataset.value = `${i}${j}`;
                cell.textContent = `${i}${j}`;
                grid.appendChild(cell);
            }
        }
    }

    // 2. Initialize 9x9 Matrix Target Selectors for all bots
    initMatrixSelectors();

    // 3. Bind Control Buttons
    for (let i = 1; i <= 4; i++) {
        const setBtn = document.getElementById(`setBtn${i}`);
        const stopBtn = document.getElementById(`stopBtn${i}`);
        const resetBtn = document.getElementById(`resetBtn${i}`);
        if (setBtn) setBtn.onclick = () => handleSetTarget(i);
        if (stopBtn) stopBtn.onclick = () => stopBot(i);
        if (resetBtn) resetBtn.onclick = () => resetBot(i);
        updateUI(i);
    }
    updateGrid();

    // 4. Page Reload Button (Grid Section - Bottom Right)
    const reloadPageBtn = document.getElementById("reloadPageBtn");
    if (reloadPageBtn) {
        reloadPageBtn.onclick = () => {
            window.location.reload();
        };
    }

    // 5. Logs Clear / Refresh Button (Right Section - Top Right)
    const clearLogsBtn = document.getElementById("clearLogsBtn");
    if (clearLogsBtn) {
        clearLogsBtn.onclick = () => {
            clearLogs();
        };
    }

    // Initial logs message & typing header initialization
    logAnalysis("NeuroPathfinder Swarm Coordinator initialized. Live telemetry active.");
    scheduleNextIdlePhrase();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
