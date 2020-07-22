/* eslint-disable quote-props */
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

interface IKeyframeValue {
    amount: number;
    unit: string;
}

type KeyframeValue = IKeyframeValue | ((element?: Element) => IKeyframeValue);
interface IKeyframeProperty {
    keys: string[];
    value1: KeyframeValue;
    value2: KeyframeValue;
}

interface IKeyframe {
    elements: number[];
    styles: {
        [s: string]: KeyframeValue | { [s: string]: KeyframeValue };
    };
}

type IKeyframes = { [keyframePercent: number]: IKeyframe };

// const keyframes = {
//     0: {
//         elements: [0],
//         styles: {
//             transform: {
//                 translateX: {
//                     amount: 0,
//                     unit: "px"
//                 }
//             },
//             opacity: {
//                 amount: 0,
//                 unit: ""
//             },
//             width: {
//                 amount: 0,
//                 unit: "%"
//             },
//             height: {
//                 amount: 0,
//                 unit: "%"
//             },
//             "padding-top": {
//                 amount: 10,
//                 unit: "px"
//             }
//         }
//     },
//     50: {
//         elements: [0],
//         styles: {
//             opacity: {
//                 amount: 0.5,
//                 unit: ""
//             },
//             width: {
//                 amount: 100,
//                 unit: "%"
//             },
//             height: {
//                 amount: 10,
//                 unit: "rem"
//             },
//             "padding-top": {
//                 amount: 100,
//                 unit: "px"
//             }
//         }
//     },
//     100: {
//         elements: [0],
//         styles: {
//             opacity: {
//                 amount: 1,
//                 unit: ""
//             },
//             "padding-top": {
//                 amount: 200,
//                 unit: "px"
//             }
//         }
//     }
// };
// const keyframes = {
//     0: {
//         elements: [0],
//         styles: {
//             transform: {
//                 translateX: {
//                     amount: 0,
//                     unit: ""
//                 }
//             },
//             opacity: {
//                 amount: 1,
//                 unit: ""
//             }
//         }
//     },
//     50: {
//         elements: [0],
//         styles: {
//             transform: {
//                 translateX: () => {
//                     return { amount: window.innerWidth, unit: "px" };
//                 }
//             }
//         }
//     },
//     51: {
//         elements: [0],
//         styles: {
//             opacity: {
//                 amount: 0,
//                 unit: ""
//             }
//         }
//     },
//     52: {
//         elements: [0],
//         styles: {
//             transform: {
//                 translateX: {
//                     amount: -200,
//                     unit: "px"
//                 }
//             }
//         }
//     },
//     53: {
//         elements: [0],
//         styles: {
//             opacity: {
//                 amount: 1,
//                 unit: ""
//             }
//         }
//     },

//     100: {
//         elements: [0],
//         styles: {
//             transform: {
//                 translateX: {
//                     amount: 0,
//                     unit: "px"
//                 }
//             }
//         }
//     }
// };
const keyframes = {
    0: {
        elements: [0],
        styles: {
            height: {
                amount: 100,
                unit: "%"
            }
        }
    },
    50: {
        elements: [0],
        styles: {
            height: {
                amount: 0,
                unit: "%"
            }
        }
    },
    100: {
        elements: [0],
        styles: {
            height: {
                amount: 100,
                unit: "%"
            }
        }
    }
};
const recurseProperties = function (obj1, obj2, predicate = (key) => true, acc = []) {
    let out: Array<IKeyframeProperty> = [];

    for (const key of Object.keys(obj1)) {
        if (obj2[key] != null) {
            if (typeof obj1[key] === "object" && predicate(obj1[key])) {
                out = out.concat(
                    recurseProperties(obj1[key], obj2[key], predicate, acc.concat(key))
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

const evalIfFunction = function (f: KeyframeValue, element?: Element) {
    if (typeof f === "function") {
        return f(element);
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
                        evalIfFunction(prop.value1, element),
                        evalIfFunction(prop.value2, element)
                    ];
                    const [fromAmount, fromUnit] = [from.amount, from.unit];
                    const [toAmount, toUnit] = [to.amount, to.unit];
                    const cssKey = keys[0];

                    let v = `${lerp(t, fromAmount, toAmount)}`;

                    v += toUnit;
                    console.log(v);

                    if (keys.length === 1) {
                        cssObject[cssKey] = v;
                    } else {
                        const subkey = `${keys[1]}(${v})`;
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
    const keyframePredicate = (key) => {
        return key.unit == null;
    };
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

            const props = recurseProperties(styles1, styles2, keyframePredicate);
            console.log(props);
            await interpCallback(props);

            keyframesCopy[keyframeKey2].styles = {
                ...keyframesCopy[keyframeKey1].styles,
                ...keyframesCopy[keyframeKey2].styles
            };
        }
    }
};

animateKeyframes([$(".box")], keyframes, 2000);
