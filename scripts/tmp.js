import { FSM } from "./utils.js";

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

//-1=not started, 0=starting, 1=download test, 2=ping+jitter test, 3=upload test, 4=finished, 5=aborted
