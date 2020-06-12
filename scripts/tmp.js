// document.querySelectorAll("iframe").forEach((value) => {
//     value.removeAttribute("height");
//     value.removeAttribute("width");
// });

// function resizeIframes() {
//     let ratio = (window.innerHeight / window.innerWidth) * 100;
//     console.log(ratio);
//     document
//         .querySelectorAll(".iframe-container")
//         .forEach((value, key, parent) => {
//             value.style.paddingTop = `${ratio}%`;
//         });
// }

// window.addEventListener("resize", function () {
//     resizeIframes();
// });
// resizeIframes();

let substates = {
    init: 0,
    active: 1,
    complete: 2,
};

const defaultUpdater = function (states, currentState) {
    let state = states[currentState];

    switch (state) {
        case substates.init:
        case substates.active: {
            state++;
        }
    }
    states[currentState]++;
    if (state == substates.complete) {
        currentState++;
    }

    return currentState;
};
class FSM {
    constructor(stateCount, updater = null) {
        this.currentState = 0;
        this.states = new Array(stateCount + 1).fill(0);
        this.updater = !updater ? defaultUpdater : updater;
    }

    stateValue() {
        return this.states[this.currentState];
    }

    update() {
        this.currentState = this.updater(this.states, this.currentState);
        return this;
    }

    isComplete() {
        return this.currentState > this.states.length - 1;
    }
}

let stateMapping = {
    ping: 0,
    download: 1,
    upload: 2,
};

let f = new FSM(Object.keys(stateMapping).length);

while (!f.isComplete()) {
    console.log(f.states);
    if (f.stateValue() == substates.init) {
        console.log(`Just started state ${f.currentState}`);
    }
    f.update();
}
