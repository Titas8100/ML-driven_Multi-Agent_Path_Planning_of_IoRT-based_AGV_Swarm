// Global counters
let setCounter = 0;
let stopCounter = 0;
let resetCounter = 0;

// Separate states for each bot with default values
let botStates = {
    1: { targetValue: 0, positionValue: 11, runningValue: 0, interruptValue: 0, path: [], stop: false },
    2: { targetValue: 0, positionValue: 19, runningValue: 0, interruptValue: 0, path: [], stop: false },
    3: { targetValue: 0, positionValue: 91, runningValue: 0, interruptValue: 0, path: [], stop: false },
    4: { targetValue: 0, positionValue: 99, runningValue: 0, interruptValue: 0, path: [], stop: false }
};

function updateDivTextColors(botId) {
    let runningDiv = document.getElementById(`runningBtn${botId}`);
    let interruptDiv = document.getElementById(`interruptBtn${botId}`);
    runningDiv.style.color = botStates[botId].runningValue === 1 ? "lime" : "#a4f3f2";
    interruptDiv.style.color = botStates[botId].interruptValue === 1 ? "lime" : "#a4f3f2";
}

function updateGrid() {
    document.querySelectorAll(".gridcell").forEach(cell => {
        if (!cell.classList.contains("bot-path")) {
            cell.textContent = cell.dataset.value;
            cell.style.color = "#a4f3f2";
        }
    });
    for (let i = 1; i <= 4; i++) {
        let botPosition = botStates[i].positionValue;
        let botCell = document.querySelector(`.gridcell[data-value='${botPosition}']`);
        if (botCell) {
            botCell.textContent = `B-${i}`;
            botCell.style.color = ["#ff3e3e", "#c25ced", "yellow", "lime"][i - 1];
        }
    }
    for (let i = 1; i <= 4; i++) {
        let positionDiv = document.getElementById(`posBtn${i}`);
        if (positionDiv) {
            positionDiv.textContent = `Position: ${botStates[i].positionValue}`;
        }
    }
}

async function moveBotML(botId) {
    const start = botStates[botId].positionValue;
    const end = botStates[botId].targetValue;
    botStates[botId].stop = false;
    if (start === end || end === 0) return;
    const botColors = { 1: "#ff3e3e", 2: "#c25ced", 3: "yellow", 4: "lime" };

    // botStates[botId].path cleanup removed as we don't visualize trails anymore

    const startCoord = [Math.floor(start / 10), start % 10];
    const goalCoord = [Math.floor(end / 10), end % 10];

    // Collect obstacles (other bots' positions)
    const obstacles = [];
    for (let id in botStates) {
        if (parseInt(id) !== botId) {
            const pos = botStates[id].positionValue;
            if (pos !== 0) { // Assuming 0 implies undefined or off-grid, though logic uses 11-99
                obstacles.push([Math.floor(pos / 10), pos % 10]);
            }
        }
    }

    try {
        const response = await fetch("http://localhost:5000/predict_path", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                start: startCoord.join(""),
                goal: goalCoord.join(""),
                obstacles: obstacles
            })
        });
        const data = await response.json();
        const pathList = data.path.split(".");

        const analysisBox = document.querySelector(".analysis-section p");
        if (analysisBox) {
            // Use innerHTML to interpret <br>
            // Check if empty to avoid leading <br>
            if (analysisBox.innerHTML === "") {
                analysisBox.innerHTML = `Bot ${botId} path: ${data.path}`;
            } else {
                analysisBox.innerHTML += `<br>Bot ${botId} path: ${data.path}`;
            }
        }

        for (const step of pathList) {
            if (botStates[botId].stop) break;

            await new Promise(res => setTimeout(res, 500));

            // Just update value and redraw grid. 
            // updateGrid() clears everything not marked, and since we don't mark 'bot-path' anymore,
            // it will clear the previous pos and draw the new one.
            botStates[botId].positionValue = parseInt(step);
            updateGrid();
            // botStates[botId].path.push(step); // No longer needed for visual trail
        }
    } catch (err) {
        console.error("ML Path Error:", err);
    }

    botStates[botId].runningValue = 0;
    updateDivTextColors(botId);
}

function resetBot(botId) {
    const defaults = { 1: 11, 2: 19, 3: 91, 4: 99 };
    botStates[botId].targetValue = 0;
    botStates[botId].positionValue = defaults[botId];
    botStates[botId].runningValue = 0;
    botStates[botId].interruptValue = 0;
    botStates[botId].stop = false;
    document.getElementById(`targetDisplay${botId}`).textContent = `Target: 0`;
    document.getElementById(`posBtn${botId}`).textContent = `Position: ${botStates[botId].positionValue}`;
    botStates[botId].path.forEach(pos => {
        const prevCell = document.querySelector(`.gridcell[data-value='${pos}']`);
        if (prevCell) {
            prevCell.classList.remove("bot-path");
            prevCell.style.color = "#a4f3f2";
            prevCell.textContent = prevCell.dataset.value;
        }
    });
    botStates[botId].path = [];
    updateGrid();
}

document.addEventListener("DOMContentLoaded", () => {
    const grid = document.querySelector(".grid");
    for (let i = 1; i <= 9; i++) {
        for (let j = 1; j <= 9; j++) {
            const cell = document.createElement("div");
            cell.className = "gridcell";
            cell.dataset.value = `${i}${j}`;
            cell.textContent = `${i}${j}`;
            grid.appendChild(cell);
        }
    }
    updateGrid();

    function populateDropdown(id) {
        const dropdown = document.getElementById(id);
        dropdown.innerHTML = "";
        for (let i = 1; i <= 9; i++) {
            for (let j = 1; j <= 9; j++) {
                const option = document.createElement("option");
                option.value = `${i}${j}`;
                option.textContent = `${i}${j}`;
                dropdown.appendChild(option);
            }
        }
    }
    ["setValue1", "setValue2", "setValue3", "setValue4"].forEach(populateDropdown);

    for (let i = 1; i <= 4; i++) {
        document.getElementById(`setBtn${i}`).addEventListener("click", async () => {
            const val = document.getElementById(`setValue${i}`).value;
            const targetVal = parseInt(val);

            // Check if target is occupied by another bot
            for (let id in botStates) {
                if (parseInt(id) !== i && botStates[id].positionValue === targetVal) {
                    alert(`Target ${targetVal} is already occupied by Bot ${id}!`);
                    return;
                }
            }

            document.getElementById(`targetDisplay${i}`).textContent = `Target: ${val}`;
            botStates[i].targetValue = targetVal;
            botStates[i].runningValue = 1;
            botStates[i].stop = false;
            updateDivTextColors(i);
            await moveBotML(i);
        });
        document.getElementById(`stopBtn${i}`).addEventListener("click", () => {
            botStates[i].stop = true;
            botStates[i].runningValue = 0;
            updateDivTextColors(i);
        });
        document.getElementById(`resetBtn${i}`).addEventListener("click", () => resetBot(i));
    }
});
