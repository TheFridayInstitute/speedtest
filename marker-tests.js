let meterMarkers = [];
    let stops = 17;

    let r1 = outerRadius - lineWidth / 2;
    let r2 = outerRadius - lineWidth * 2;
    let r3 = outerRadius - lineWidth * 3;
    let r4 = innerRadius / 1.2;

    let dashLineWidth = lineWidth;

    let theta = alpha0 + dashLineWidth / outerRadius / 2;
    let d_theta = (alpha1 - alpha0) / (stops - 1);
    let fontSize = 48;
    let font = `${fontSize}px Verdana`;

    let numberDelta = round((meterMax - meterMin) / (stops - 1), 0);
    let start = 0;
    let texts = [];

    for (let t = 0; t < stops; t++) {
        let v = theta;
        let dashPoints = [];
        let x;
        let y;

        for (let s = 0; s < 1; s += 0.5) {
            let r;
            if (t % 4 === 0) {
                r = lerp(s, r1, r3);
            } else {
                r = lerp(s, r1, r2);
            }
            x = r * Math.cos(v);
            y = r * Math.sin(v);

            dashPoints.push([x, y]);

            if (s === 0) {
                x = r4 * Math.cos(v);
                y = r4 * Math.sin(v);
                let text = new Text(`${start}`, 0, 0, font);
                text.translate(outerRadius - fontSize / 2, 0).rotate(v, true);

                texts.push(text);
                start += numberDelta;
            }
        }

        // let meterMarker = new Polygon(
        //     dashPoints,
        //     "rgba(255, 255, 255, 0.5)",
        //     dashLineWidth
        // );

        let meterMarker = new Rectangle(
            0,
            0,
            dashLineWidth,
            dashLineWidth / 4,
            backgroundColor
        );

        meterMarker
            .translate(-dashLineWidth / 2, -dashLineWidth / 2)
            .translate(r1 - dashLineWidth / 2, 0)
            .rotate(v, true);

        meterMarkers.push(meterMarker);
        theta += d_theta;
    }

    meterMarkerMesh = new Mesh(...meterMarkers);
    textMesh = new Mesh(...texts);