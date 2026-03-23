/**
 * Canvas module — pedagogical 2D rendering primitives.
 *
 * Provides a custom canvas abstraction with shapes (Polygon, Arc, Rectangle),
 * composite meshes, and specialized primitives (rounded arcs, rounded rectangles,
 * gradient generators). The meter-specific rendering is in meter.ts.
 */

export { Canvas, type CanvasColor, type Point2D } from "./core";
export { Shape, Polygon, Arc, Rectangle, Mesh } from "./shapes";
export {
    roundedArc,
    roundedRectangle,
    setRoundedArcColor,
    generateGradient,
    progressBarIntervals,
} from "./primitives";
