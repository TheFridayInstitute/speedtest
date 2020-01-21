function progressBarIntervals(leftX, leftY, width, height, colors) {
    let shapes = [];
    let step = 0;
    let w = width / colors.length;

    for (let color of colors) {
        let rRect = roundedRectangle(0, 0, w, height, color);
        rRect.map(function(shape, index) {
            shape.translate([-width / 2 + w / 2 + step, 0]);
        });
        shapes.push(rRect);
        step += w - height;
    }

    let intervalMesh = new Mesh(...shapes);

    intervalMesh.draw = function(ctx, t) {
        let n = this.shapes.length;
        let step = 1 / n;
        let s = t;
        let v = 0;

        for (let shape of this.shapes) {
            if (s > 0) {
                if (s - step > 0) {
                    v = 1;
                } else {
                    v = s / step;
                }
                shape.draw(ctx, v);
                s -= step;
            } else {
                break;
            }
        }
    };

    let tf = function(v, t) {
        canvasObj.clear();
        intervalMesh.draw(canvasObj, t);
    };

    smoothAnimate(1, 0, 1000, tf, easeInOutCubic);
}


let colors = ["white", dlProgressColor, ulProgressColor];
    let shapes = [];
    let step = 0;
    let delta = colors.length;
    let w = barWidth / delta;
    let r = barHeight;

    for (let color of colors) {
        let tbar = roundedRectangle(0, 0, w, barHeight, color);
        tbar.map(function(shape, index) {
            shape.translate([-barWidth / 2 + w / 2 + step, 0]);
        });
        shapes.push(tbar);
        step += w - r;
    }

    let tmesh = new Mesh(...shapes);

    tmesh.draw = function(ctx, t) {
        let n = this.shapes.length;
        let step = 1 / n;
        let s = t;
        let v = 0;

        for (let shape of this.shapes) {
            if (s > 0) {
                if (s - step > 0) {
                    v = 1;
                } else {
                    v = s / step;
                }
                shape.draw(ctx, v);
                s -= step;
            } else {
                break;
            }
        }
    };

    let tf = function(v, t) {
        canvasObj.clear();
        tmesh.draw(canvasObj, t);
        progressBarMesh.draw(canvasObj, t);
    };

    progressBarMesh.draw(canvasObj, 0.5);
    let shp = progressBarMesh.shapes[1].shapes[1];
    console.log(shp.centroid[0], shp.width);
    // canvasObj.clear();
    progressBarMesh.draw(canvasObj, 0.1);
    // tmesh.draw(canvasObj, 0.5);

    smoothAnimate(1, 0, 1000, tf, easeInOutCubic);