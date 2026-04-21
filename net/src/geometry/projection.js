export function metersToLngDegrees(latitude, meters) {
    return meters / (111111 * Math.cos(latitude * Math.PI / 180));
}
