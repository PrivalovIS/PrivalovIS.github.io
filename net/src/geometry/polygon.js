export function linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    function isPointOnSegment(px, py, ax, ay, bx, by) {
        const minX = Math.min(ax, bx);
        const maxX = Math.max(ax, bx);
        const minY = Math.min(ay, by);
        const maxY = Math.max(ay, by);

        if (px < minX - 1e-10 || px > maxX + 1e-10 || py < minY - 1e-10 || py > maxY + 1e-10) {
            return false;
        }

        const cross = (px - ax) * (by - ay) - (py - ay) * (bx - ax);
        return Math.abs(cross) < 1e-10;
    }

    const v1 = [x2 - x1, y2 - y1];
    const v2 = [x4 - x3, y4 - y3];
    const d = v1[0] * v2[1] - v1[1] * v2[0];

    if (Math.abs(d) < 1e-10) {
        const cross1 = (x3 - x1) * v1[1] - (y3 - y1) * v1[0];
        if (Math.abs(cross1) >= 1e-10) {
            return false;
        }

        const t1 = ((x3 - x1) * v1[0] + (y3 - y1) * v1[1]) / (v1[0] * v1[0] + v1[1] * v1[1]);
        const t2 = ((x4 - x1) * v1[0] + (y4 - y1) * v1[1]) / (v1[0] * v1[0] + v1[1] * v1[1]);
        const minT = Math.min(t1, t2);
        const maxT = Math.max(t1, t2);
        return maxT >= 0 && minT <= 1;
    }

    const t = ((x3 - x1) * v2[1] - (y3 - y1) * v2[0]) / d;
    const u = ((x3 - x1) * v1[1] - (y3 - y1) * v1[0]) / d;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function isSelfIntersecting(points) {
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

        for (let j = i + 2; j < points.length - 1; j++) {
            const p3 = points[j];
            const p4 = points[j + 1];
            if (linesIntersect(p1[1], p1[0], p2[1], p2[0], p3[1], p3[0], p4[1], p4[0])) {
                return true;
            }
        }
    }

    if (points.length > 3) {
        const p1 = points[points.length - 2];
        const p2 = points[points.length - 1];
        const p3 = points[0];
        const p4 = points[1];
        if (linesIntersect(p1[1], p1[0], p2[1], p2[0], p3[1], p3[0], p4[1], p4[0])) {
            return true;
        }
    }

    return false;
}

export function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng;
        const yi = polygon[i].lat;
        const xj = polygon[j].lng;
        const yj = polygon[j].lat;

        const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
            (point.lng < (xj - xi) * (point.lat - yi) / ((yj - yi) || Number.EPSILON) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
}
