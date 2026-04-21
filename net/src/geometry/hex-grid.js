export const hexDirections = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 }
];

export function getHexRelativeCoords(q, r, radiusPx) {
    const height = Math.sqrt(3) * radiusPx;
    const x = height * (q + r / 2);
    const y = radiusPx * 1.5 * r;
    return { x, y, radius: radiusPx };
}

export function rotatePointAroundCenter(pointX, pointY, centerX, centerY, angle) {
    const rad = angle * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const x = pointX - centerX;
    const y = pointY - centerY;
    return {
        x: x * cos - y * sin + centerX,
        y: x * sin + y * cos + centerY
    };
}
