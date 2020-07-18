/* eslint-disable guard-for-in */
import {
    clamp,
    lerp,
    normalize,
    easeInOutCubic,
    slerpPoints,
    bounceInEase,
    round
} from "./math.js";

import {
    smoothAnimate,
    animationLoopOuter,
    slideRight,
    sleep,
    slideLeft,
    createProgressBar,
    animateProgressBarWrapper,
    animateProgressBar,
    rippleButton,
    slideRightWrap,
    animateElements,
    smoothScroll,
    throttle
} from "./animation.js";

import { $, $$, IDollarElement } from "./dollar.js";

interface IKeyframeProperty {
    keys: string[];
    value1: number;
    value2: number;
}

type keyframeValue = number | (() => number);

interface IKeyframe {
    elements: number[];
    styles: {
        [s: string]: keyframeValue | { [s: string]: keyframeValue };
    };
}

type IKeyframes = { [keyframePercent: number]: IKeyframe };

// const keyframes = {
//     0: {
//         elements: [0],
//         styles: {
//             transform: {
//                 translateX: 0
//             },
//             opacity: 0
//         }
//     },
//     50: {
//         elements: [0],
//         styles: {
//             opacity: 0.5
//         }
//     },
//     100: {
//         elements: [0],
//         styles: {
//             transform: {
//                 translateX: () => window.innerWidth / 2
//             },
//             opacity: 1
//         }
//     }
// };
const keyframes = {
    0: {
        elements: [0],
        styles: {
            transform: {
                translateX: 0
            },
            opacity: 1
        }
    },
    50: {
        elements: [0],
        styles: {
            transform: {
                translateX: () => {
                    return window.innerWidth;
                }
            },
            opacity: 1
        }
    },
    51: {
        elements: [0],
        styles: {
            opacity: 0
        }
    },
    52: {
        elements: [0],
        styles: {
            transform: {
                translateX: -200
            }
        }
    },
    53: {
        elements: [0],
        styles: {
            opacity: 1
        }
    },

    100: {
        elements: [0],
        styles: {
            transform: {
                translateX: 0
            }
        }
    }
};

const recurseProperties = function (obj1, obj2, acc = []) {
    let out: Array<IKeyframeProperty> = [];

    for (const key of Object.keys(obj1)) {
        if (obj2[key] != null) {
            if (typeof obj1[key] === "object") {
                out = out.concat(
                    recurseProperties(obj1[key], obj2[key], acc.concat(key))
                );
            } else {
                out.push({
                    keys: acc.concat(key),
                    value1: obj1[key],
                    value2: obj2[key]
                });
            }
        }
    }

    return out;
};

const evalIfFunction = function (f: keyframeValue) {
    if (typeof f === "function") {
        return f();
    } else {
        return f;
    }
};

const createInterpCallback = function (
    duration: number,
    startPercent: number,
    endPercent: number,
    elements: IDollarElement[]
) {
    const interpCallback = async function (props: Array<IKeyframeProperty>) {
        const subDuration = ((endPercent - startPercent) / 100) * duration;

        const transformFunc = function (_: number, t: number) {
            elements.forEach((element) => {
                const cssObject = {};

                props.forEach((prop) => {
                    const [keys, from, to] = [
                        prop.keys,
                        evalIfFunction(prop.value1),
                        evalIfFunction(prop.value2)
                    ];

                    const cssKey = keys[0];
                    const v = lerp(t, from, to);

                    if (keys.length === 1) {
                        cssObject[cssKey] = v;
                    } else {
                        const subkey = `${keys[1]}(${v}px)`;
                        cssObject[cssKey] = subkey;
                    }
                });

                element.css(cssObject);
            });
        };

        await smoothAnimate(subDuration, 0, subDuration, transformFunc, easeInOutCubic);
    };
    return interpCallback;
};

const animateKeyframes = async function (
    elements: IDollarElement[],
    keyframes: IKeyframes,
    duration: number
) {
    const keyframesCopy = Object.assign({}, keyframes);
    const keys = Object.keys(keyframes);

    for (let index = 0; index < keys.length; index++) {
        if (index < keys.length - 1) {
            const [keyframeKey1, keyframeKey2] = [keys[index], keys[index + 1]];

            const [startPercent, endPercent] = [
                parseFloat(keyframeKey1),
                parseFloat(keyframeKey2)
            ];

            const [keyframe1, keyframe2]: [IKeyframe, IKeyframe] = [
                keyframesCopy[keyframeKey1],
                keyframesCopy[keyframeKey2]
            ];

            const [styles1, elements1] = [keyframe1.styles, keyframe1.elements];
            const [styles2, elements2] = [keyframe2.styles, keyframe2.elements];

            const commonElements = elements1.reduce(
                (acc: IDollarElement[], elementIndex: number) => {
                    if (elements2.indexOf(elementIndex) !== -1) {
                        acc.push(elements[elementIndex]);
                    }
                    return acc;
                },
                []
            );

            const interpCallback = createInterpCallback(
                duration,
                startPercent,
                endPercent,
                commonElements
            );

            const props = recurseProperties(styles1, styles2);
            console.log(props);
            await interpCallback(props);

            keyframesCopy[keyframeKey2].styles = {
                ...keyframesCopy[keyframeKey1].styles,
                ...keyframesCopy[keyframeKey2].styles
            };
        }
    }
};

animateKeyframes([$(".box")], keyframes, 5000);
