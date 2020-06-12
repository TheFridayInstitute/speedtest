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



let stateMapping = {
    ping: 0,
    download: 1,
    upload: 2,
};

// let f = new FSM(Object.keys(stateMapping).length);

// while (!f.isComplete()) {
//     console.log(f.states);
//     if (f.stateValue() == substates.init) {
//         console.log(`Just started state ${f.currentState}`);
//     }
//     f.update();
// }
