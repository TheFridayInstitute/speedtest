canvasObj = new Canvas(canvas, ctx, [originX, originY]);

let watchRed = "rgb(233, 70, 126)";
let watchGreen = "rgb(180, 243, 77)";
let watchBlue = "rgb(105, 228, 212)";

let roundedMeterMesh = genRoundedMeterMesh(
    0,
    0,
    outerRadius,
    alpha0,
    alpha1,
    watchRed,
    lineWidth
);

let innerRoundedMeterMesh = genRoundedMeterMesh(
    0,
    0,
    innerRadius,
    alpha0,
    alpha1,
    watchGreen,
    lineWidth
);

let innerInnerRoundedMeterMesh = genRoundedMeterMesh(
    0,
    0,
    innerRadius - innerDelta,
    alpha0,
    alpha1,
    watchBlue,
    lineWidth
);

let transformFunc = function(v, t) {
    canvasObj.clear();
    roundedMeterMesh.draw(canvasObj, v);
    innerRoundedMeterMesh.draw(canvasObj, v);
    innerInnerRoundedMeterMesh.draw(canvasObj, v);
};

smoothAnimate(alpha1, alpha0, 1000, transformFunc, easeInBounce);
