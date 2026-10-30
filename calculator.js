const calculatorDisplay = document.getElementById("calculatorDisplay");
const calculatorKeys = document.querySelector(".calculator-keys");

let displayValue = "0";
let firstOperand = null;
let pendingOperation = null;
let shouldResetDisplay = false;

function renderDisplay() {
    calculatorDisplay.textContent = displayValue;
}

function formatNumber(value) {
    if (!Number.isFinite(value)) {
        return null;
    }

    const roundedValue = Number(value.toPrecision(12));
    return Object.is(roundedValue, -0) ? "0" : String(roundedValue);
}

function calculate(left, right, operation) {
    let result;

    switch (operation) {
        case "add":
            result = left + right;
            break;
        case "subtract":
            result = left - right;
            break;
        case "multiply":
            result = left * right;
            break;
        case "divide":
            result = right === 0 ? null : left / right;
            break;
        default:
            return null;
    }

    return result !== null && Number.isFinite(result) ? result : null;
}

function inputDigit(digit) {
    if (displayValue === "Error" || shouldResetDisplay) {
        displayValue = digit;
        shouldResetDisplay = false;
    } else if (displayValue.replace("-", "").replace(".", "").length < 12) {
        displayValue = displayValue === "0" ? digit : displayValue + digit;
    }

    renderDisplay();
}

function runAction(action) {
    if (action === "clear") {
        displayValue = "0";
        firstOperand = null;
        pendingOperation = null;
        shouldResetDisplay = false;
        renderDisplay();
        return;
    }

    if (displayValue === "Error") {
        if (action !== "decimal") {
            return;
        }
        displayValue = "0";
    }

    if (action === "decimal") {
        if (shouldResetDisplay) {
            displayValue = "0";
            shouldResetDisplay = false;
        }
        if (!displayValue.includes(".")) {
            displayValue += ".";
        }
    } else if (action === "sign") {
        if (Number(displayValue) !== 0) {
            displayValue = displayValue.startsWith("-")
                ? displayValue.slice(1)
                : `-${displayValue}`;
        }
    } else if (action === "percent") {
        displayValue = formatNumber(Number(displayValue) / 100) ?? "Error";
        shouldResetDisplay = true;
    } else if (action === "backspace") {
        if (!shouldResetDisplay) {
            displayValue = displayValue.length > 1
                ? displayValue.slice(0, -1)
                : "0";
            if (displayValue === "-") {
                displayValue = "0";
            }
        }
    } else if (["add", "subtract", "multiply", "divide"].includes(action)) {
        const currentValue = Number(displayValue);

        if (pendingOperation && firstOperand !== null && !shouldResetDisplay) {
            const result = calculate(firstOperand, currentValue, pendingOperation);
            displayValue = result === null ? "Error" : formatNumber(result);
            if (displayValue === "Error") {
                firstOperand = null;
                pendingOperation = null;
                shouldResetDisplay = true;
                renderDisplay();
                return;
            }
        }

        firstOperand = Number(displayValue);
        pendingOperation = action;
        shouldResetDisplay = true;
    } else if (action === "equals" && pendingOperation && firstOperand !== null) {
        const result = calculate(firstOperand, Number(displayValue), pendingOperation);
        displayValue = result === null ? "Error" : formatNumber(result);
        firstOperand = null;
        pendingOperation = null;
        shouldResetDisplay = true;
    }

    renderDisplay();
}

calculatorKeys.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) {
        return;
    }

    if (button.dataset.number !== undefined) {
        inputDigit(button.dataset.number);
    } else {
        runAction(button.dataset.action);
    }
});

document.addEventListener("keydown", (event) => {
    if (/^\d$/.test(event.key)) {
        inputDigit(event.key);
    } else if (event.key === ".") {
        runAction("decimal");
    } else if (event.key === "+") {
        runAction("add");
    } else if (event.key === "-") {
        runAction("subtract");
    } else if (event.key === "*") {
        runAction("multiply");
    } else if (event.key === "/") {
        event.preventDefault();
        runAction("divide");
    } else if (event.key === "%") {
        runAction("percent");
    } else if (event.key === "Enter" || event.key === "=") {
        event.preventDefault();
        runAction("equals");
    } else if (event.key === "Backspace") {
        runAction("backspace");
    } else if (event.key === "Escape") {
        runAction("clear");
    }
});
