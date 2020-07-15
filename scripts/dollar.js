const on = function (names, func, context) {
    names.split(" ").forEach((event) => {
        context.addEventListener(event, func);
    });
    return context;
};
const off = function (names, func, context) {
    names.split(" ").forEach((event) => {
        context.removeEventListener(event, func);
    });
    return context;
};
const setAttributes = function (attrs, context) {
    for (const [key, value] of Object.entries(attrs)) {
        if ((key === "styles" || key === "style") && typeof value === "object") {
            // eslint-disable-next-line guard-for-in
            for (const prop in value) {
                context.style.setProperty(prop, value[prop]);
            }
        }
        else if (key === "html") {
            context.innerHTML = value;
        }
        else {
            if (value === null) {
                context.removeAttribute(key);
            }
            else {
                context.setAttribute(key, value);
            }
        }
    }
    return context;
};
const dollarFunctions = {
    on: function (name, func) {
        return on(name, func, this);
    },
    off: function (name, func) {
        return off(name, func, this);
    },
    setattr: function (attrs) {
        return setAttributes(attrs, this);
    },
    css: function (attrs) {
        return setAttributes({
            styles: attrs
        }, this);
    }
};
const foldFunctions = function (funcs) {
    const folded = {};
    Object.keys(funcs).forEach((key) => {
        folded[key] = function (...args) {
            return this.forEach((el) => {
                el[key](...args);
            });
        };
    });
    return folded;
};
const dollarFoldedFunctions = foldFunctions(dollarFunctions);
const $$ = function (query, context = document) {
    const nodes = query instanceof NodeList || Array.isArray(query)
        ? query
        : typeof query === "string"
            ? context.querySelectorAll(query)
            : [query];
    if (nodes === undefined) {
        return undefined;
    }
    else {
        const arr = Array.from(nodes).map((el) => Object.assign(el, dollarFunctions));
        return Object.assign(arr, dollarFoldedFunctions);
    }
};
const $ = function (query, context = document) {
    const node = typeof query === "string" ? context.querySelector(query) : query;
    if (node === undefined) {
        return undefined;
    }
    else {
        return Object.assign(node, dollarFunctions);
    }
};
export { $, $$ };
