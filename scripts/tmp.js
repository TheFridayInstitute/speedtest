switch (testStateObj["ping"]) {
    case 0:
    case 1: {
        document.getElementById("ping-amount").innerHTML = dots;
        break;
    }
    case 2:
        animateProgressBarWrapper(progressBarEl, 1000, 3);
        document
            .getElementById("ping-amount")
            .parentElement.classList.remove("in-progress");

        document.getElementById("ping-amount").innerText = clamp(
            Math.round(parseFloat(speedtestData.pingStatus)),
            0,
            999
        );
        testStateObj["ping"] = 3;
        break;
}

switch (testStateObj["download"]) {
    case 0:
    case 1: {
        drawMeter(
            speedtestData.testState,
            document.getElementById("test-amount"),
            speedtestData.dlStatus,
            speedtestData.dlProgress,
            dlProgressColor,
            dlProgressGlowColor
        );
        document.getElementById("dl-amount").innerHTML = dots;
        break;
    }
    case 2:
        animateProgressBarWrapper(progressBarEl, 1000, 3);
        document
            .getElementById("dl-amount")
            .parentElement.classList.remove("in-progress");

        document.getElementById("dl-amount").innerHTML = clamp(
            parseFloat(speedtestData.dlStatus).toPrecision(3),
            0,
            999
        );
        testStateObj["download"] = 3;
        break;
}

// If upload in progress.
if (testStateObj["upload"] > -1) {
    drawMeter(
        speedtestData.testState,
        document.getElementById("test-amount"),
        speedtestData.ulStatus,
        speedtestData.ulProgress,
        ulProgressColor,
        ulProgressGlowColor
    );
}
// If upload complete.
if (testStateObj["upload"] === 2) {
    animateProgressBarWrapper(progressBarEl, 1000, 3);
    document
        .getElementById("ul-amount")
        .parentElement.classList.remove("in-progress");

    document.getElementById("ul-amount").innerHTML = clamp(
        parseFloat(speedtestData.ulStatus).toPrecision(3),
        0,
        999
    );
    testStateObj["upload"] = 3;
    onend();
}