/* eslint-disable quote-props */
/* eslint-disable guard-for-in */
import { lerp, easeInOutCubic, easeInBounce } from "./math.js";
import { smoothAnimate } from "./animation.js";
import { $ } from "./dollar.js";
const tmp = {
    0: {
        "style transform translateX": {
            amount: 0,
            unit: "px"
        },
        "style opacity": {
            amount: 1,
            unit: ""
        },
        "style color": {
            amount: "rgba(0, 1, 1)",
            unit: "color"
        },
        funk: 0
    },
    50: {
        "style transform translateX": {
            amount: 100,
            unit: "px"
        },
        "style opacity": {
            amount: 0,
            unit: ""
        },
        funk: 100
    },
    100: {
        "style transform translateX": {
            amount: 0,
            unit: "px"
        },
        "style opacity": {
            amount: 1,
            unit: ""
        },
        funk: 0
    }
};
const keyframes = {
    0: {
        elements: [0],
        properties: {
            styles: {
                transform: {
                    translateX: {
                        amount: 0,
                        unit: "px"
                    },
                    scale: {
                        amount: 100,
                        unit: "%"
                    }
                }
            },
            tmp: () => {
                return 0;
            }
        }
    },
    50: {
        elements: [0],
        properties: {
            styles: {
                transform: {
                    translateX: {
                        amount: 200,
                        unit: "px"
                    },
                    scale: {
                        amount: 150,
                        unit: "%"
                    }
                }
            },
            tmp: () => window.innerWidth
        }
    },
    100: {
        elements: [0],
        properties: {
            styles: {
                transform: {
                    translateX: {
                        amount: 0,
                        unit: "px"
                    },
                    scale: {
                        amount: 100,
                        unit: "%"
                    }
                }
            },
            tmp: 0
        }
    }
};
const recurseProperties = function (obj1, obj2, predicate = (key) => true, acc = []) {
    let out = [];
    for (const key of Object.keys(obj1)) {
        if (obj2[key] != null) {
            console.log(key, obj1[key]);
            if (typeof obj1[key] === "object" && predicate(obj1[key])) {
                out = out.concat(recurseProperties(obj1[key], obj2[key], predicate, acc.concat(key)));
            }
            else {
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
const evalIfFunction = function (f, element) {
    if (typeof f === "function") {
        return f(element);
    }
    else {
        return f;
    }
};
const mutateCSSObject = function (CSSObject, v, keys) {
    const CSSKeys = keys.slice(1);
    const key = CSSKeys[0];
    if (CSSKeys.length === 1) {
        CSSObject[key] = v;
    }
    else {
        const subkey = `${CSSKeys[1]}(${v})`;
        if (CSSObject[key] != null) {
            CSSObject[key] += " " + subkey;
        }
        else {
            CSSObject[key] = subkey;
        }
    }
    return CSSObject;
};
const isCSSValue = function (val) {
    return val.unit != null && val.amount != null;
};
const lerpValues = function (t, from, to) {
    if (isCSSValue(from) && isCSSValue(to)) {
        const [fromAmount, fromUnit] = [from.amount, from.unit];
        const [toAmount, toUnit] = [to.amount, to.unit];
        return `${lerp(t, fromAmount, toAmount)}${toUnit}`;
    }
    else {
        return `${lerp(t, from, to)}`;
    }
};
const createInterpCallback = function (duration, startPercent, endPercent, elements, timingFunc) {
    const interpCallback = async function (props) {
        const subDuration = ((endPercent - startPercent) / 100) * duration;
        const transformFunc = function (_, t) {
            elements.forEach((element) => {
                const elementAttributes = { styles: {} };
                props.forEach((prop) => {
                    const { keys, value1, value2 } = prop;
                    const from = evalIfFunction(value1, element);
                    const to = evalIfFunction(value2, element);
                    const v = lerpValues(t, from, to);
                    if (keys[0] === "styles") {
                        elementAttributes["styles"] = mutateCSSObject(elementAttributes.styles, v, keys);
                    }
                    else {
                        const key = keys.join(" ");
                        elementAttributes[key] = v;
                    }
                });
                console.log(elementAttributes);
                element.setattr(elementAttributes);
            });
        };
        await smoothAnimate(subDuration, 0, subDuration, transformFunc, timingFunc);
    };
    return interpCallback;
};
const animateKeyframes = async function (elements, keyframes, duration, timingFunc = easeInOutCubic) {
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
            const [keyframe1, keyframe2] = [
                keyframesCopy[keyframeKey1],
                keyframesCopy[keyframeKey2]
            ];
            const [props1, elements1] = [keyframe1.properties, keyframe1.elements];
            const [props2, elements2] = [keyframe2.properties, keyframe2.elements];
            const commonElements = elements1.reduce((acc, elementIndex) => {
                if (elements2.indexOf(elementIndex) !== -1) {
                    acc.push(elements[elementIndex]);
                }
                return acc;
            }, []);
            const interpCallback = createInterpCallback(duration, startPercent, endPercent, commonElements, timingFunc);
            const props = recurseProperties(props1, props2, keyframePredicate);
            await interpCallback(props);
            keyframesCopy[keyframeKey2].styles = {
                ...keyframesCopy[keyframeKey1].styles,
                ...keyframesCopy[keyframeKey2].styles
            };
        }
    }
};
const duration = 2000;
animateKeyframes([$("#box1"), $("#box2")], keyframes, duration, easeInBounce);
