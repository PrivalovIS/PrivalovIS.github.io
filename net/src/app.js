// Р С™Р С•Р Р…РЎвЂћР С‘Р С–РЎС“РЎР‚Р В°РЎвЂ Р С‘РЎРЏ
// Р СџР ВµРЎР‚Р ВµР СР ВµР Р…Р Р…РЎвЂ№Р Вµ
import { CONFIG } from './config.js';
import { appState } from './state/app-state.js';
import { hexDirections, getHexRelativeCoords, rotatePointAroundCenter } from './geometry/hex-grid.js';
import { linesIntersect, isPointInPolygon, isSelfIntersecting } from './geometry/polygon.js';
import { metersToLngDegrees } from './geometry/projection.js';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const buttonHoverHandlers = new WeakMap();

function enableButtonHover(button) {
    if (!button || buttonHoverHandlers.has(button)) return;

    const onMouseOver = () => {
        button.style.background = '#3a4454';
    };
    const onMouseOut = () => {
        button.style.background = '#2a3444';
    };

    button.addEventListener('mouseover', onMouseOver);
    button.addEventListener('mouseout', onMouseOut);
    buttonHoverHandlers.set(button, { onMouseOver, onMouseOut });
}

function disableButtonHover(button) {
    const handlers = buttonHoverHandlers.get(button);
    if (!button || !handlers) return;

    button.removeEventListener('mouseover', handlers.onMouseOver);
    button.removeEventListener('mouseout', handlers.onMouseOut);
    buttonHoverHandlers.delete(button);
}
// Р СџР ВµРЎР‚Р ВµР СР ВµР Р…Р Р…РЎвЂ№Р Вµ Р Т‘Р В»РЎРЏ РЎР‚Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘РЎРЏ Р В·Р С•Р Р…РЎвЂ№
// Р СџР ВµРЎР‚Р ВµР СР ВµР Р…Р Р…РЎвЂ№Р Вµ Р Т‘Р В»РЎРЏ Р С—РЎР‚Р С•Р С‘Р В·Р Р†Р С•Р В»РЎРЉР Р…РЎвЂ№РЎвЂ¦ Р В·Р С•Р Р…
// Р В¦Р ВµР Р…РЎвЂљРЎР‚ РЎРѓР ВµРЎвЂљР С”Р С‘
// Р ТђРЎР‚Р В°Р Р…Р С‘Р С РЎРѓР ВµРЎвЂљР С”РЎС“ Р Р† Р С•РЎвЂљР Р…Р С•РЎРѓР С‘РЎвЂљР ВµР В»РЎРЉР Р…РЎвЂ№РЎвЂ¦ Р С”Р С•Р С•РЎР‚Р Т‘Р С‘Р Р…Р В°РЎвЂљР В°РЎвЂ¦ (q, r)
// Р ТђРЎР‚Р В°Р Р…Р С‘Р В»Р С‘РЎвЂ°Р Вµ Р СР В°РЎР‚Р С”Р ВµРЎР‚Р С•Р Р† Р вЂР РЋ
// Р вЂњР ВµР С”РЎРѓР В°Р С–Р С•Р Р…Р В°Р В»РЎРЉР Р…РЎвЂ№Р Вµ Р Р…Р В°Р С—РЎР‚Р В°Р Р†Р В»Р ВµР Р…Р С‘РЎРЏ
// Р РЋР В»Р С•Р С‘ Р С”Р В°РЎР‚РЎвЂљРЎвЂ№
function createBaseLayer(mapMode) {
    if (typeof window.L === 'undefined') {
        return null;
    }

    if (mapMode === 'google-sat') {
        return L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: 'Р’В© Google'
        });
    }

    if (mapMode === 'google-hybrid') {
        return L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
            maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: 'Р’В© Google'
        });
    }

    if (mapMode === 'yandex') {
        return L.tileLayer('https://core-renderer-tiles.maps.yandex.net/tiles?l=map&v=23.10.26-0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', {
            maxZoom: 19, attribution: 'Р’В© Р Р‡Р Р…Р Т‘Р ВµР С”РЎРѓ'
        });
    }

    if (mapMode === 'yandex-hybrid') {
        return L.tileLayer('https://core-renderer-tiles.maps.yandex.net/tiles?l=skl&v=23.10.26-0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', {
            maxZoom: 19, attribution: 'Р’В© Р Р‡Р Р…Р Т‘Р ВµР С”РЎРѓ'
        });
    }

    if (mapMode === 'yandex-sat') {
        return L.tileLayer('https://core-sat.maps.yandex.net/tiles?l=sat&v=23.10.26-0&x={x}&y={y}&z={z}&scale=1&lang=ru_RU', {
            maxZoom: 19, attribution: 'Р’В© Р Р‡Р Р…Р Т‘Р ВµР С”РЎРѓ'
        });
    }

    return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: 'Р’В© OpenStreetMap'
    });
}

// Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘РЎРЏ Р С—Р ВµРЎР‚Р ВµР С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р С‘РЎРЏ Р С”Р В°РЎР‚РЎвЂљРЎвЂ№
function changeMap(event) {
    if (event) event.stopPropagation();
    const mapTypes = ['osm', 'google-hybrid', 'google-sat', 'yandex', 'yandex-hybrid', 'yandex-sat'];
    const currentIndex = mapTypes.indexOf(appState.bgMode);
    const nextIndex = (currentIndex + 1) % mapTypes.length;
    selectMapType(mapTypes[nextIndex]);
}

// Р СџР С•Р С”Р В°Р В·Р В°РЎвЂљРЎРЉ Р С—Р С•Р Т‘РЎРѓР С”Р В°Р В·Р С”РЎС“ Р Т‘Р В»РЎРЏ РЎР‚Р В°Р Т‘Р С‘РЎС“РЎРѓР В° Р вЂР РЋ
function showBSCircleTooltip(event) {
    const tooltip = document.getElementById('bsCircleTooltip');
    if (!tooltip) return;
    
    // Р СџР С•Р В·Р С‘РЎвЂ Р С‘Р С•Р Р…Р С‘РЎР‚РЎС“Р ВµР С РЎР‚РЎРЏР Т‘Р С•Р С РЎРѓ Р С‘Р С”Р С•Р Р…Р С”Р С•Р в„–
    const icon = event.currentTarget;
    const rect = icon.getBoundingClientRect();
    
    tooltip.style.display = 'block';
    tooltip.style.left = (rect.left + 10) + 'px';
    tooltip.style.top = (rect.bottom + 10) + 'px';
}

// Р РЋР С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ Р С—Р С•Р Т‘РЎРѓР С”Р В°Р В·Р С”РЎС“
function hideBSCircleTooltip() {
    const tooltip = document.getElementById('bsCircleTooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

// Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘РЎРЏ Р С—Р ВµРЎР‚Р ВµР С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р С‘РЎРЏ РЎР‚Р ВµР В¶Р С‘Р СР В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р В·Р С•Р Р…
function toggleZoneMode(event) {
    if (event) event.stopPropagation();
    
    // Р СџР С•Р В»РЎС“РЎвЂЎР В°Р ВµР С Р С—Р ВµРЎР‚Р ВµР С”Р В»РЎР‹РЎвЂЎР В°РЎвЂљР ВµР В»РЎРЉ Р С‘ РЎРѓР ВµР С”РЎвЂ Р С‘РЎР‹
    const territoryToggle = document.getElementById('territoryToggle');
    const territorySection = document.querySelector('.accordion-section:has(#territoryToggle)');
    
    // Р вЂўРЎРѓР В»Р С‘ РЎР‚Р ВµР В¶Р С‘Р С Р В·Р С•Р Р… Р Р†Р С”Р В»РЎР‹РЎвЂЎР ВµР Р… - Р Р†РЎвЂ№Р С”Р В»РЎР‹РЎвЂЎР В°Р ВµР С
    if (appState.zoneModeEnabled) {
        cancelPolygon();
        appState.zoneModeEnabled = false;
        appState.currentZoneColor = null;
        
        const btn = document.getElementById('createZoneBtn');
        btn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В·Р С•Р Р…РЎС“';
        btn.classList.remove('active');
        btn.style.background = '#2a3444';
        btn.style.color = '#ddd';
        
        if (appState.leafletMap) {
            appState.leafletMap.dragging.enable();
            appState.leafletMap.off('click', onMapClickForZone);
            appState.leafletMap.off('mousemove', onMapMouseMoveForZone);
        }
        
        canvas.style.pointerEvents = 'none';
        updateCursor();
        
        // Р СњР вЂў Р Р†РЎвЂ№Р С”Р В»РЎР‹РЎвЂЎР В°Р ВµР С Р С—Р ВµРЎР‚Р ВµР С”Р В»РЎР‹РЎвЂЎР В°РЎвЂљР ВµР В»РЎРЉ
        return;
    }
    
    // Р вЂ™Р С”Р В»РЎР‹РЎвЂЎР В°Р ВµР С РЎР‚Р ВµР В¶Р С‘Р С Р В·Р С•Р Р…
    appState.zoneModeEnabled = true;
    appState.currentZoneColor = getNextZoneColor();
    
    const btn = document.getElementById('createZoneBtn');
    btn.textContent = 'Р С›РЎвЂљР СР ВµР Р…Р В°';
    btn.classList.add('active');
    btn.style.background = '#4af';
    btn.style.color = '#000';
    
    canvas.style.pointerEvents = 'none';
    document.body.classList.remove('bs-cursor');
    
    if (appState.leafletMap) {
        appState.leafletMap.dragging.disable();
        appState.leafletMap.scrollWheelZoom.enable();
        appState.leafletMap.on('click', onMapClickForZone);
        appState.leafletMap.on('mousemove', onMapMouseMoveForZone);
        startNewPolygon();
    }
    
    updateCursor();
    
    // Р вЂ™Р С”Р В»РЎР‹РЎвЂЎР В°Р ВµР С Р С—Р ВµРЎР‚Р ВµР С”Р В»РЎР‹РЎвЂЎР В°РЎвЂљР ВµР В»РЎРЉ
    if (territoryToggle) {
        territoryToggle.checked = true;
        
        // Р СџРЎР‚Р С‘Р Р…РЎС“Р Т‘Р С‘РЎвЂљР ВµР В»РЎРЉР Р…Р С• Р С—Р С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµР С Р Р†РЎРѓР Вµ РЎРѓРЎС“РЎвЂ°Р ВµРЎРѓРЎвЂљР Р†РЎС“РЎР‹РЎвЂ°Р С‘Р Вµ Р В·Р С•Р Р…РЎвЂ№
        showAllZones();
        
        // Р С’Р С”РЎвЂљР С‘Р Р†Р С‘РЎР‚РЎС“Р ВµР С РЎРѓР С—Р С‘РЎРѓР С•Р С” Р В·Р С•Р Р… (РЎС“Р В±Р С‘РЎР‚Р В°Р ВµР С disabled Р С”Р В»Р В°РЎРѓРЎРѓ)
        if (territorySection) {
            territorySection.classList.remove('disabled');
        }
    }
}

// Р РЋР С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ Р Р†РЎРѓР Вµ Р В·Р С•Р Р…РЎвЂ№ Р Р…Р В° Р С”Р В°РЎР‚РЎвЂљР Вµ
function hideAllZones() {
    appState.zones.forEach(zone => {
        if (zone.layer && appState.leafletMap) {
            appState.leafletMap.removeLayer(zone.layer);
        }
        if (zone.vertexMarkers) {
            zone.vertexMarkers.forEach(marker => {
                if (appState.leafletMap) appState.leafletMap.removeLayer(marker);
            });
        }
        if (zone.midVertexMarkers) {
            zone.midVertexMarkers.forEach(marker => {
                if (appState.leafletMap) appState.leafletMap.removeLayer(marker);
            });
        }
    });
}

// Р СџР С•Р С”Р В°Р В·Р В°РЎвЂљРЎРЉ Р Р†РЎРѓР Вµ Р В·Р С•Р Р…РЎвЂ№ Р Р…Р В° Р С”Р В°РЎР‚РЎвЂљР Вµ
function showAllZones() {
    appState.zones.forEach(zone => {
        drawZone(zone);
    });
}

// Р СџР С•Р В»РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉ РЎРѓР В»Р ВµР Т‘РЎС“РЎР‹РЎвЂ°Р С‘Р в„– Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р Р…РЎвЂ№Р в„– Р Р…Р С•Р СР ВµРЎР‚ Р С•Р В±РЎР‰Р ВµР С”РЎвЂљР В°
function getNextObjectNumber() {
    if (appState.objects.length === 0) return 1;
    const usedNumbers = new Set();
    appState.objects.forEach(obj => {
        const match = obj.name.match(/^Р С›Р В±РЎР‰Р ВµР С”РЎвЂљ (\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num)) usedNumbers.add(num);
        }
    });
    let number = 1;
    while (usedNumbers.has(number)) number++;
    return number;
}

// Р СџР С•Р В»РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉ РЎРѓР В»Р ВµР Т‘РЎС“РЎР‹РЎвЂ°Р С‘Р в„– Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р Р…РЎвЂ№Р в„– Р Р…Р С•Р СР ВµРЎР‚ Р вЂР РЋ
function getNextBSNumber() {
    if (appState.bsMarkers.length === 0) return 1;
    const usedNumbers = new Set();
    appState.bsMarkers.forEach(marker => {
        const match = marker.name.match(/^Р вЂР В°Р В·Р С•Р Р†Р В°РЎРЏ РЎРѓРЎвЂљР В°Р Р…РЎвЂ Р С‘РЎРЏ (\d+)$/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num)) usedNumbers.add(num);
        }
    });
    let number = 1;
    while (usedNumbers.has(number)) number++;
    return number;
}

// Р СњР В°РЎвЂЎР В°Р В»Р С• Р Р…Р С•Р Р†Р С•Р С–Р С• Р С—Р С•Р В»Р С‘Р С–Р С•Р Р…Р В°
function startNewPolygon() {
    appState.currentPolygon = [];
    appState.tempPoints = [];
    removeTempPolygon();
    
    if (appState.leafletMap) {
        appState.leafletMap.dragging.disable();
        appState.leafletMap.scrollWheelZoom.enable();
        appState.leafletMap.on('click', onMapClickForZone);
        appState.leafletMap.on('mousemove', onMapMouseMoveForZone);
    }
}

// Р С›Р С—РЎвЂљР С‘Р СР С‘Р В·Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р Р…РЎвЂ№Р в„– Р С•Р В±РЎР‚Р В°Р В±Р С•РЎвЂљРЎвЂЎР С‘Р С” Р Т‘Р Р†Р С‘Р В¶Р ВµР Р…Р С‘РЎРЏ Р СРЎвЂ№РЎв‚¬Р С‘ РЎРѓ throttle
const THROTTLE_DELAY = 16; // ~60fps

function onMapMouseMoveForZone(e) {
    if (!appState.zoneModeEnabled || appState.tempPoints.length === 0) return;
    
    // Throttle - Р С•Р С–РЎР‚Р В°Р Р…Р С‘РЎвЂЎР С‘Р Р†Р В°Р ВµР С РЎвЂЎР В°РЎРѓРЎвЂљР С•РЎвЂљРЎС“ Р С•Р В±РЎР‚Р В°Р В±Р С•РЎвЂљР С”Р С‘
    const now = Date.now();
    if (now - appState.lastMouseMoveTime < THROTTLE_DELAY) {
        return;
    }
    appState.lastMouseMoveTime = now;
    
    // Р ВРЎРѓР С—Р С•Р В»РЎРЉР В·РЎС“Р ВµР С requestAnimationFrame Р Т‘Р В»РЎРЏ РЎРѓР С‘Р Р…РЎвЂ¦РЎР‚Р С•Р Р…Р С‘Р В·Р В°РЎвЂ Р С‘Р С‘ РЎРѓ Р С•РЎвЂљРЎР‚Р С‘РЎРѓР С•Р Р†Р С”Р С•Р в„–
    if (appState.mouseMoveTimeout) {
        cancelAnimationFrame(appState.mouseMoveTimeout);
    }
    
    appState.mouseMoveTimeout = requestAnimationFrame(() => {
        // Р Р€Р Т‘Р В°Р В»РЎРЏР ВµР С Р Р†РЎР‚Р ВµР СР ВµР Р…Р Р…РЎС“РЎР‹ Р В»Р С‘Р Р…Р С‘РЎР‹ Р ВµРЎРѓР В»Р С‘ Р ВµРЎРѓРЎвЂљРЎРЉ
        if (window.tempGuideLine) {
            appState.leafletMap.removeLayer(window.tempGuideLine);
            window.tempGuideLine = null;
        }
        
        const lastPoint = appState.tempPoints[appState.tempPoints.length - 1];
        const hasIntersection = isLineIntersecting(lastPoint.lat, lastPoint.lng, e.latlng.lat, e.latlng.lng);
        
        const lineColor = hasIntersection ? '#ff4444' : (appState.currentZoneColor || '#4af');
        
        window.tempGuideLine = L.polyline([lastPoint, e.latlng], {
            color: lineColor,
            weight: 2,
            opacity: 0.7,
            dashArray: '5, 8'
        }).addTo(appState.leafletMap);
        
        appState.mouseMoveTimeout = null;
    });
}

// Р С›Р В±РЎР‚Р В°Р В±Р С•РЎвЂљРЎвЂЎР С‘Р С” Р С”Р В»Р С‘Р С”Р В° Р С—Р С• Р С”Р В°РЎР‚РЎвЂљР Вµ Р Т‘Р В»РЎРЏ РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р В·Р С•Р Р…РЎвЂ№
function onMapClickForZone(e) {
    if (!appState.zoneModeEnabled) return;
    
    const latlng = e.latlng;
    
    if (appState.tempPoints.length > 0) {
        const lastPoint = appState.tempPoints[appState.tempPoints.length - 1];
        if (isLineIntersecting(lastPoint.lat, lastPoint.lng, latlng.lat, latlng.lng)) {
            return;
        }
    }
    
    appState.currentPolygon.push([latlng.lat, latlng.lng]);
    appState.tempPoints.push(latlng);
    drawTempPolygon();
}

// Р С›РЎвЂљРЎР‚Р С‘РЎРѓР С•Р Р†Р С”Р В° Р Р†РЎР‚Р ВµР СР ВµР Р…Р Р…Р С•Р С–Р С• Р С—Р С•Р В»Р С‘Р С–Р С•Р Р…Р В°
function drawTempPolygon() {
    removeTempPolygon();
    
    if (!appState.leafletMap || appState.tempPoints.length === 0) return;
    
    // Р ВРЎРѓР С—Р С•Р В»РЎРЉР В·РЎС“Р ВµР С requestAnimationFrame Р Т‘Р В»РЎРЏ Р С•РЎвЂљРЎР‚Р С‘РЎРѓР С•Р Р†Р С”Р С‘
    requestAnimationFrame(() => {
        if (appState.tempPoints.length > 1) {
            appState.tempPolygonLayer = L.polyline(appState.tempPoints, {
                color: appState.currentZoneColor || '#4af',
                weight: 3,
                opacity: 0.8,
                dashArray: '5, 5'
            }).addTo(appState.leafletMap);
        }
        
        window.tempPointMarkers = [];
        appState.tempPoints.forEach((point, index) => {
            const marker = L.marker([point.lat, point.lng], {
                icon: L.divIcon({
                    html: `<div style="background: ${appState.currentZoneColor || '#4af'}; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8],
                    className: 'zone-point-marker'
                }),
                draggable: false,
                interactive: true
            }).addTo(appState.leafletMap);
            
            // Р С›Р В±РЎР‚Р В°Р В±Р С•РЎвЂљРЎвЂЎР С‘Р С”Р С‘ Р С”Р В»Р С‘Р С”Р С•Р Р†...
            // (Р Р†Р ВµРЎРѓРЎРЉ Р С•РЎРѓРЎвЂљР В°Р В»РЎРЉР Р…Р С•Р в„– Р С”Р С•Р Т‘ Р С•Р В±РЎР‚Р В°Р В±Р С•РЎвЂљРЎвЂЎР С‘Р С”Р С•Р Р† Р С•РЎРѓРЎвЂљР В°Р ВµРЎвЂљРЎРѓРЎРЏ Р В±Р ВµР В· Р С‘Р В·Р СР ВµР Р…Р ВµР Р…Р С‘Р в„–)
            
            if (index === 0) {
                marker.on('click', function() {
                    if (appState.tempPoints.length < 3) {
                        cancelPolygon();
                        appState.zoneModeEnabled = false;
                        appState.currentZoneColor = null;
                        
                        const btn = document.getElementById('createZoneBtn');
                        btn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В·Р С•Р Р…РЎС“';
                        btn.classList.remove('active');
                        btn.style.background = '#2a3444';
                        btn.style.color = '#ddd';
                        
                        if (appState.leafletMap) {
                            appState.leafletMap.dragging.enable();
                            appState.leafletMap.off('click', onMapClickForZone);
                            appState.leafletMap.off('mousemove', onMapMouseMoveForZone);
                        }
                        
                        canvas.style.pointerEvents = 'none';
                        updateCursor();
                    } else {
                        finishZone();
                    }
                });
            }
            
            if (index === 1 && appState.tempPoints.length === 2) {
                marker.on('click', function() {
                    cancelPolygon();
                    appState.zoneModeEnabled = false;
                    appState.currentZoneColor = null;
                    
                    const btn = document.getElementById('createZoneBtn');
                    btn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В·Р С•Р Р…РЎС“';
                    btn.classList.remove('active');
                    btn.style.background = '#2a3444';
                    btn.style.color = '#ddd';
                    
                    if (appState.leafletMap) {
                        appState.leafletMap.dragging.enable();
                        appState.leafletMap.off('click', onMapClickForZone);
                        appState.leafletMap.off('mousemove', onMapMouseMoveForZone);
                    }
                    
                    canvas.style.pointerEvents = 'none';
                    updateCursor();
                });
            }
            
            if (index === appState.tempPoints.length - 1 && appState.tempPoints.length >= 3) {
                marker.on('click', function() {
                    finishZone();
                });
            }
            
            window.tempPointMarkers.push(marker);
        });
    });
}

// Р Р€Р Т‘Р В°Р В»Р ВµР Р…Р С‘Р Вµ Р Р†РЎР‚Р ВµР СР ВµР Р…Р Р…Р С•Р С–Р С• Р С—Р С•Р В»Р С‘Р С–Р С•Р Р…Р В°
function removeTempPolygon() {
    if (appState.tempPolygonLayer && appState.leafletMap) {
        appState.leafletMap.removeLayer(appState.tempPolygonLayer);
        appState.tempPolygonLayer = null;
    }
    
    if (window.tempPointMarkers) {
        window.tempPointMarkers.forEach(marker => {
            if (appState.leafletMap) appState.leafletMap.removeLayer(marker);
        });
        window.tempPointMarkers = [];
    }
    
    if (window.tempGuideLine && appState.leafletMap) {
        appState.leafletMap.removeLayer(window.tempGuideLine);
        window.tempGuideLine = null;
    }
}

// Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘РЎРЏ Р В»Р С‘Р Р…Р С‘Р С‘ РЎРѓ РЎРѓРЎС“РЎвЂ°Р ВµРЎРѓРЎвЂљР Р†РЎС“РЎР‹РЎвЂ°Р С‘Р СР С‘ Р В»Р С‘Р Р…Р С‘РЎРЏР СР С‘
function isLineIntersecting(lat1, lng1, lat2, lng2, excludeZoneId = null) {
    // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘РЎРЏ РЎРѓ РЎвЂљР ВµР С”РЎС“РЎвЂ°Р ВµР в„– РЎРѓРЎвЂљРЎР‚Р С•РЎРЏРЎвЂ°Р ВµР в„–РЎРѓРЎРЏ Р В·Р С•Р Р…Р С•Р в„–
    if (appState.tempPoints.length > 0) {
        for (let i = 0; i < appState.tempPoints.length - 1; i++) {
            const p1 = appState.tempPoints[i];
            const p2 = appState.tempPoints[i + 1];
            
            // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЏР ВµР С Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘Р Вµ РЎРѓ Р С”Р В°Р В¶Р Т‘Р С•Р в„– РЎРѓРЎвЂљР С•РЎР‚Р С•Р Р…Р С•Р в„– РЎвЂљР ВµР С”РЎС“РЎвЂ°Р ВµР С–Р С• Р С—Р С•Р В»Р С‘Р С–Р С•Р Р…Р В°
            if (linesIntersect(
                lat1, lng1, lat2, lng2,
                p1.lat, p1.lng, p2.lat, p2.lng
            )) {
                return true;
            }
        }
    }
    
    // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘РЎРЏ РЎРѓ РЎРѓРЎС“РЎвЂ°Р ВµРЎРѓРЎвЂљР Р†РЎС“РЎР‹РЎвЂ°Р С‘Р СР С‘ Р В·Р С•Р Р…Р В°Р СР С‘
    for (const zone of appState.zones) {
        if (excludeZoneId && zone.id === excludeZoneId) continue;
        
        for (let i = 0; i < zone.points.length - 1; i++) {
            const p1 = zone.points[i];
            const p2 = zone.points[i + 1];
            
            if (linesIntersect(
                lat1, lng1, lat2, lng2,
                p1[0], p1[1], p2[0], p2[1]
            )) {
                return true;
            }
        }
    }
    
    return false;
}

// Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В°, Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµР С”Р В°Р ВµРЎвЂљРЎРѓРЎРЏ Р В»Р С‘ Р С—Р С•Р В»Р С‘Р С–Р С•Р Р… РЎРѓР В°Р С РЎРѓ РЎРѓР С•Р В±Р С•Р в„–
function isSelfIntersecting(points) {
    if (points.length < 4) return false;
    
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        
        for (let j = i + 2; j < points.length - 1; j++) {
            const p3 = points[j];
            const p4 = points[j + 1];
            
            if (i === 0 && j === points.length - 2) continue;
            
            if (linesIntersect(
                p1[0], p1[1], p2[0], p2[1],
                p3[0], p3[1], p4[0], p4[1]
            )) {
                return true;
            }
        }
    }
    
    // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЏР ВµР С Р В·Р В°Р СРЎвЂ№Р С”Р В°РЎР‹РЎвЂ°РЎС“РЎР‹ РЎРѓРЎвЂљР С•РЎР‚Р С•Р Р…РЎС“
    if (points.length >= 3) {
        const p1 = points[points.length - 2];
        const p2 = points[points.length - 1];
        const p3 = points[0];
        const p4 = points[1];
        
        if (linesIntersect(
            p1[0], p1[1], p2[0], p2[1],
            p3[0], p3[1], p4[0], p4[1]
        )) {
            return true;
        }
    }
    
    return false;
}

// Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В°, Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµР С”Р В°Р ВµРЎвЂљРЎРѓРЎРЏ Р В»Р С‘ Р С—Р С•Р В»Р С‘Р С–Р С•Р Р… РЎРѓ РЎРѓРЎС“РЎвЂ°Р ВµРЎРѓРЎвЂљР Р†РЎС“РЎР‹РЎвЂ°Р С‘Р СР С‘ Р В·Р С•Р Р…Р В°Р СР С‘
function isPolygonIntersectingZones(points, excludeZoneId = null) {
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        
        for (const zone of appState.zones) {
            if (excludeZoneId && zone.id === excludeZoneId) continue;
            
            for (let j = 0; j < zone.points.length - 1; j++) {
                const p3 = zone.points[j];
                const p4 = zone.points[j + 1];
                
                if (linesIntersect(
                    p1[0], p1[1], p2[0], p2[1],
                    p3[0], p3[1], p4[0], p4[1]
                )) {
                    return { intersects: true, zoneId: zone.id };
                }
            }
        }
    }
    return { intersects: false };
}

// Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘РЎРЏ Р Т‘Р Р†РЎС“РЎвЂ¦ Р С•РЎвЂљРЎР‚Р ВµР В·Р С”Р С•Р Р† (Р В±Р С•Р В»Р ВµР Вµ Р Р…Р В°Р Т‘Р ВµР В¶Р Р…Р В°РЎРЏ Р Р†Р ВµРЎР‚РЎРѓР С‘РЎРЏ)
function linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘РЎРЏ Р Т‘Р В»РЎРЏ Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р С‘, Р В»Р ВµР В¶Р С‘РЎвЂљ Р В»Р С‘ РЎвЂљР С•РЎвЂЎР С”Р В° C Р Р…Р В° Р С•РЎвЂљРЎР‚Р ВµР В·Р С”Р Вµ AB
    function isPointOnSegment(px, py, ax, ay, bx, by) {
        const minX = Math.min(ax, bx);
        const maxX = Math.max(ax, bx);
        const minY = Math.min(ay, by);
        const maxY = Math.max(ay, by);
        
        // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В°, РЎвЂЎРЎвЂљР С• РЎвЂљР С•РЎвЂЎР С”Р В° Р Р† Р С—РЎР‚Р ВµР Т‘Р ВµР В»Р В°РЎвЂ¦ bounding box
        if (px < minX - 1e-10 || px > maxX + 1e-10 || py < minY - 1e-10 || py > maxY + 1e-10) {
            return false;
        }
        
        // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° Р С”Р С•Р В»Р В»Р С‘Р Р…Р ВµР В°РЎР‚Р Р…Р С•РЎРѓРЎвЂљР С‘ (Р С—Р В»Р С•РЎвЂ°Р В°Р Т‘РЎРЉ РЎвЂљРЎР‚Р ВµРЎС“Р С–Р С•Р В»РЎРЉР Р…Р С‘Р С”Р В° РЎР‚Р В°Р Р†Р Р…Р В° 0)
        const cross = (px - ax) * (by - ay) - (py - ay) * (bx - ax);
        return Math.abs(cross) < 1e-10;
    }
    
    // Р вЂ™РЎвЂ№РЎвЂЎР С‘РЎРѓР В»РЎРЏР ВµР С Р Р…Р В°Р С—РЎР‚Р В°Р Р†Р В»РЎРЏРЎР‹РЎвЂ°Р С‘Р Вµ Р Р†Р ВµР С”РЎвЂљР С•РЎР‚РЎвЂ№
    const v1 = [x2 - x1, y2 - y1];
    const v2 = [x4 - x3, y4 - y3];
    
    // Р вЂ™РЎвЂ№РЎвЂЎР С‘РЎРѓР В»РЎРЏР ВµР С Р Р†Р ВµР С”РЎвЂљР С•РЎР‚Р Р…РЎвЂ№Р Вµ Р С—РЎР‚Р С•Р С‘Р В·Р Р†Р ВµР Т‘Р ВµР Р…Р С‘РЎРЏ
    const d = v1[0] * v2[1] - v1[1] * v2[0];
    
    // Р вЂўРЎРѓР В»Р С‘ Р С•РЎвЂљРЎР‚Р ВµР В·Р С”Р С‘ Р С—Р В°РЎР‚Р В°Р В»Р В»Р ВµР В»РЎРЉР Р…РЎвЂ№
    if (Math.abs(d) < 1e-10) {
        // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° Р Р…Р В° Р С”Р С•Р В»Р В»Р С‘Р Р…Р ВµР В°РЎР‚Р Р…Р С•РЎРѓРЎвЂљРЎРЉ Р С‘ Р С—Р ВµРЎР‚Р ВµР С”РЎР‚РЎвЂ№РЎвЂљР С‘Р Вµ
        const cross1 = (x3 - x1) * v1[1] - (y3 - y1) * v1[0];
        if (Math.abs(cross1) > 1e-10) return false; // Р СњР Вµ Р С”Р С•Р В»Р В»Р С‘Р Р…Р ВµР В°РЎР‚Р Р…РЎвЂ№
        
        // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° Р С—Р ВµРЎР‚Р ВµР С”РЎР‚РЎвЂ№РЎвЂљР С‘РЎРЏ Р С•РЎвЂљРЎР‚Р ВµР В·Р С”Р С•Р Р†
        const t1 = ((x3 - x1) * v1[0] + (y3 - y1) * v1[1]) / (v1[0] * v1[0] + v1[1] * v1[1]);
        const t2 = ((x4 - x1) * v1[0] + (y4 - y1) * v1[1]) / (v1[0] * v1[0] + v1[1] * v1[1]);
        
        const minT = Math.min(t1, t2);
        const maxT = Math.max(t1, t2);
        
        // Р С›РЎвЂљРЎР‚Р ВµР В·Р С”Р С‘ Р С—Р ВµРЎР‚Р ВµР С”РЎР‚РЎвЂ№Р Р†Р В°РЎР‹РЎвЂљРЎРѓРЎРЏ, Р ВµРЎРѓР В»Р С‘ Р С‘Р Р…РЎвЂљР ВµРЎР‚Р Р†Р В°Р В» [minT, maxT] Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµР С”Р В°Р ВµРЎвЂљРЎРѓРЎРЏ РЎРѓ [0, 1]
        return (maxT >= 0 && minT <= 1);
    }
    
    // Р вЂ™РЎвЂ№РЎвЂЎР С‘РЎРѓР В»РЎРЏР ВµР С Р С—Р В°РЎР‚Р В°Р СР ВµРЎвЂљРЎР‚РЎвЂ№ Р Т‘Р В»РЎРЏ РЎвЂљР С•РЎвЂЎР С”Р С‘ Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘РЎРЏ
    const t = ((x3 - x1) * v2[1] - (y3 - y1) * v2[0]) / d;
    const u = ((x3 - x1) * v1[1] - (y3 - y1) * v1[0]) / d;
    
    // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЏР ВµР С, РЎвЂЎРЎвЂљР С• Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘Р Вµ Р Р†Р Р…РЎС“РЎвЂљРЎР‚Р С‘ Р С•Р В±Р С•Р С‘РЎвЂ¦ Р С•РЎвЂљРЎР‚Р ВµР В·Р С”Р С•Р Р† (РЎРѓРЎвЂљРЎР‚Р С•Р С–Р С• Р Р†Р Р…РЎС“РЎвЂљРЎР‚Р С‘, Р Р…Р Вµ Р С”Р В°РЎРѓР В°Р Р…Р С‘Р Вµ)
    return (t > 1e-10 && t < 1 - 1e-10 && u > 1e-10 && u < 1 - 1e-10);
}

// Р С›РЎвЂљР СР ВµР Р…Р В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С—Р С•Р В»Р С‘Р С–Р С•Р Р…Р В°
function cancelPolygon() {
    // Р С›РЎвЂЎР С‘РЎвЂ°Р В°Р ВµР С РЎвЂљР В°Р в„–Р СР ВµРЎР‚РЎвЂ№
    if (appState.mouseMoveTimeout) {
        cancelAnimationFrame(appState.mouseMoveTimeout);
        appState.mouseMoveTimeout = null;
    }
    
    appState.currentPolygon = [];
    appState.tempPoints = [];
    removeTempPolygon();
    appState.currentZoneColor = null;
    
    if (appState.leafletMap) {
        appState.leafletMap.dragging.enable();
        appState.leafletMap.off('click', onMapClickForZone);
        appState.leafletMap.off('mousemove', onMapMouseMoveForZone);
    }
}

// Р вЂ”Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р ВµР Р…Р С‘Р Вµ РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р В·Р С•Р Р…РЎвЂ№
function finishZone() {
    if (appState.currentPolygon.length < 3) {
        cancelPolygon();
        appState.zoneModeEnabled = false;
        appState.currentZoneColor = null;
        
        const btn = document.getElementById('createZoneBtn');
        btn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В·Р С•Р Р…РЎС“';
        btn.classList.remove('active');
        btn.style.background = '#2a3444';
        btn.style.color = '#ddd';
        
        if (appState.leafletMap) {
            appState.leafletMap.dragging.enable();
            appState.leafletMap.off('click', onMapClickForZone);
            appState.leafletMap.off('mousemove', onMapMouseMoveForZone);
        }
        
        canvas.style.pointerEvents = 'none';
        updateCursor();
        return;
    }
    
    const firstPoint = appState.tempPoints[0];
    const lastPoint = appState.tempPoints[appState.tempPoints.length - 1];
    
    // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘РЎРЏ Р В·Р В°Р СРЎвЂ№Р С”Р В°РЎР‹РЎвЂ°Р ВµР в„– Р В»Р С‘Р Р…Р С‘Р С‘ РЎРѓ РЎРѓРЎС“РЎвЂ°Р ВµРЎРѓРЎвЂљР Р†РЎС“РЎР‹РЎвЂ°Р С‘Р СР С‘ Р В»Р С‘Р Р…Р С‘РЎРЏР СР С‘ Р В·Р С•Р Р…РЎвЂ№
    for (let i = 0; i < appState.tempPoints.length - 1; i++) {
        const p1 = appState.tempPoints[i];
        const p2 = appState.tempPoints[i + 1];
        
        if (linesIntersect(
            firstPoint.lat, firstPoint.lng, lastPoint.lat, lastPoint.lng,
            p1.lat, p1.lng, p2.lat, p2.lng
        )) {
            const errorLine = L.polyline([firstPoint, lastPoint], {
                color: '#ff4444',
                weight: 4,
                opacity: 0.9,
                dashArray: '5, 5'
            }).addTo(appState.leafletMap);
            
            setTimeout(() => {
                if (appState.leafletMap) appState.leafletMap.removeLayer(errorLine);
            }, 1000);
            
            return;
        }
    }
    
    // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘РЎРЏ Р В·Р В°Р СРЎвЂ№Р С”Р В°РЎР‹РЎвЂ°Р ВµР в„– Р В»Р С‘Р Р…Р С‘Р С‘ РЎРѓ РЎРѓРЎС“РЎвЂ°Р ВµРЎРѓРЎвЂљР Р†РЎС“РЎР‹РЎвЂ°Р С‘Р СР С‘ Р В·Р С•Р Р…Р В°Р СР С‘
    for (const zone of appState.zones) {
        for (let j = 0; j < zone.points.length - 1; j++) {
            const p3 = zone.points[j];
            const p4 = zone.points[j + 1];
            
            if (linesIntersect(
                firstPoint.lat, firstPoint.lng, lastPoint.lat, lastPoint.lng,
                p3[0], p3[1], p4[0], p4[1]
            )) {
                const errorLine = L.polyline([firstPoint, lastPoint], {
                    color: '#ff4444',
                    weight: 4,
                    opacity: 0.9,
                    dashArray: '5, 5'
                }).addTo(appState.leafletMap);
                
                setTimeout(() => {
                    if (appState.leafletMap) appState.leafletMap.removeLayer(errorLine);
                }, 1000);
                
                return;
            }
        }
    }
    
    // Р вЂ”Р В°Р СРЎвЂ№Р С”Р В°Р ВµР С Р С—Р С•Р В»Р С‘Р С–Р С•Р Р… Р Т‘Р В»РЎРЏ Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚Р С•Р С”
    const testPolygon = [...currentPolygon, appState.currentPolygon[0]];
    
    // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЏР ВµР С РЎРѓР В°Р СР С•Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘Р Вµ
    if (isSelfIntersecting(testPolygon)) {
        const errorPolygon = L.polygon(testPolygon, {
            color: '#ff4444',
            weight: 4,
            opacity: 0.9,
            fillOpacity: 0.2,
            dashArray: '5, 5'
        }).addTo(appState.leafletMap);
        
        setTimeout(() => {
            if (appState.leafletMap) appState.leafletMap.removeLayer(errorPolygon);
        }, 1500);
        
        return;
    }
    
    // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЏР ВµР С, Р Р…Р Вµ РЎРѓР С•Р Т‘Р ВµРЎР‚Р В¶Р С‘РЎвЂљ Р В»Р С‘ Р Р…Р С•Р Р†Р В°РЎРЏ Р В·Р С•Р Р…Р В° Р Р†Р Р…РЎС“РЎвЂљРЎР‚Р С‘ РЎРѓР ВµР В±РЎРЏ Р Т‘РЎР‚РЎС“Р С–Р С‘Р Вµ Р В·Р С•Р Р…РЎвЂ№
    const newZonePolygon = testPolygon.map(p => ({ lat: p[0], lng: p[1] }));
    let containsOtherZones = false;
    
    for (const zone of appState.zones) {
        // Р вЂР ВµРЎР‚Р ВµР С Р С—Р ВµРЎР‚Р Р†РЎС“РЎР‹ РЎвЂљР С•РЎвЂЎР С”РЎС“ РЎРѓРЎС“РЎвЂ°Р ВµРЎРѓРЎвЂљР Р†РЎС“РЎР‹РЎвЂ°Р ВµР в„– Р В·Р С•Р Р…РЎвЂ№
        const testPoint = {
            lat: zone.points[0][0],
            lng: zone.points[0][1]
        };
        
        // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЏР ВµР С, Р Р…Р В°РЎвЂ¦Р С•Р Т‘Р С‘РЎвЂљРЎРѓРЎРЏ Р В»Р С‘ РЎвЂљР С•РЎвЂЎР С”Р В° Р Р†Р Р…РЎС“РЎвЂљРЎР‚Р С‘ Р Р…Р С•Р Р†Р С•Р С–Р С• Р С—Р С•Р В»Р С‘Р С–Р С•Р Р…Р В°
        if (isPointInPolygon(testPoint, newZonePolygon)) {
            containsOtherZones = true;
            break;
        }
    }
    
    if (containsOtherZones) {
        // Р СџР С•Р Т‘РЎРѓР Р†Р ВµРЎвЂЎР С‘Р Р†Р В°Р ВµР С Р Р…Р С•Р Р†РЎС“РЎР‹ Р В·Р С•Р Р…РЎС“ Р С”РЎР‚Р В°РЎРѓР Р…РЎвЂ№Р С Р Р…Р В° 1.5 РЎРѓР ВµР С”РЎС“Р Р…Р Т‘РЎвЂ№
        const errorPolygon = L.polygon(testPolygon, {
            color: '#ff4444',
            weight: 4,
            opacity: 0.9,
            fillOpacity: 0.2,
            dashArray: '5, 5'
        }).addTo(appState.leafletMap);
        
        setTimeout(() => {
            if (appState.leafletMap) appState.leafletMap.removeLayer(errorPolygon);
        }, 1500);
        
        return; // Р СџРЎР‚Р С•РЎРѓРЎвЂљР С• Р Р†РЎвЂ№РЎвЂ¦Р С•Р Т‘Р С‘Р С, РЎР‚Р ВµР В¶Р С‘Р С Р С—Р С•РЎРѓРЎвЂљРЎР‚Р С•Р ВµР Р…Р С‘РЎРЏ Р С—РЎР‚Р С•Р Т‘Р С•Р В»Р В¶Р В°Р ВµРЎвЂљРЎРѓРЎРЏ
    }
    
    // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЏР ВµР С Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘Р Вµ РЎРѓ Р Т‘РЎР‚РЎС“Р С–Р С‘Р СР С‘ Р В·Р С•Р Р…Р В°Р СР С‘
    const { intersects: otherIntersects } = isPolygonIntersectingZones(testPolygon);
    if (otherIntersects) {
        const errorPolygon = L.polygon(testPolygon, {
            color: '#ff4444',
            weight: 4,
            opacity: 0.9,
            fillOpacity: 0.2,
            dashArray: '5, 5'
        }).addTo(appState.leafletMap);
        
        setTimeout(() => {
            if (appState.leafletMap) appState.leafletMap.removeLayer(errorPolygon);
        }, 1500);
        
        return;
    }
    
    // Р вЂўРЎРѓР В»Р С‘ Р Р†РЎРѓР Вµ Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р С‘ Р С—РЎР‚Р С•Р в„–Р Т‘Р ВµР Р…РЎвЂ№ - РЎРѓР С•Р В·Р Т‘Р В°Р ВµР С Р В·Р С•Р Р…РЎС“
    appState.currentPolygon.push(appState.currentPolygon[0]);
    
    const zoneId = Date.now();
    const zoneNumber = getNextZoneNumber();
    const zoneName = `Р вЂ”Р С•Р Р…Р В° ${zoneNumber}`;
    
    const newZone = {
        id: zoneId,
        name: zoneName,
        comment: '',
        points: [...currentPolygon],
        color: appState.currentZoneColor || getNextZoneColor()
    };
    
    appState.zones.push(newZone);
    drawZone(newZone);
    updateZoneList();
    
    // Р РЋР В±РЎР‚Р В°РЎРѓРЎвЂ№Р Р†Р В°Р ВµР С РЎР‚Р ВµР В¶Р С‘Р С
    appState.zoneModeEnabled = false;
    appState.currentZoneColor = null;
    
    const btn = document.getElementById('createZoneBtn');
    btn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В·Р С•Р Р…РЎС“';
    btn.classList.remove('active');
    btn.style.background = '#2a3444';
    btn.style.color = '#ddd';
    
    if (appState.leafletMap) {
        appState.leafletMap.off('mousemove', onMapMouseMoveForZone);
    }
    
    cancelPolygon();
    
    if (appState.leafletMap) {
        appState.leafletMap.dragging.enable();
        appState.leafletMap.off('click', onMapClickForZone);
    }
    
    canvas.style.pointerEvents = 'none';
    markMapAsChanged();
}

// Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В°, Р Р…Р В°РЎвЂ¦Р С•Р Т‘Р С‘РЎвЂљРЎРѓРЎРЏ Р В»Р С‘ РЎвЂљР С•РЎвЂЎР С”Р В° Р Р†Р Р…РЎС“РЎвЂљРЎР‚Р С‘ Р С—Р С•Р В»Р С‘Р С–Р С•Р Р…Р В° (Р В°Р В»Р С–Р С•РЎР‚Р С‘РЎвЂљР С "Р В»РЎС“РЎвЂЎ")
function isPointInPolygon(point, polygon) {
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng;
        const yi = polygon[i].lat;
        const xj = polygon[j].lng;
        const yj = polygon[j].lat;
        
        const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
            (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
        
        if (intersect) inside = !inside;
    }
    
    return inside;
}

// Р СџР С•Р В»РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉ РЎРѓР В»Р ВµР Т‘РЎС“РЎР‹РЎвЂ°Р С‘Р в„– Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р Р…РЎвЂ№Р в„– Р Р…Р С•Р СР ВµРЎР‚ Р В·Р С•Р Р…РЎвЂ№
function getNextZoneNumber() {
    if (appState.zones.length === 0) return 1;
    
    const usedNumbers = new Set();
    appState.zones.forEach(zone => {
        const match = zone.name.match(/Р вЂ”Р С•Р Р…Р В° (\d+)/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num)) usedNumbers.add(num);
        }
    });
    
    let number = 1;
    while (usedNumbers.has(number)) number++;
    return number;
}

// Р СџР В°Р В»Р С‘РЎвЂљРЎР‚Р В° РЎРЏРЎР‚Р С”Р С‘РЎвЂ¦ Р С”Р С•Р Р…РЎвЂљРЎР‚Р В°РЎРѓРЎвЂљР Р…РЎвЂ№РЎвЂ¦ РЎвЂ Р Р†Р ВµРЎвЂљР С•Р Р† Р Т‘Р В»РЎРЏ Р В·Р С•Р Р… (Р С—Р С• Р С—Р С•РЎР‚РЎРЏР Т‘Р С”РЎС“)
const zoneColorPalette = [
    '#FF3333', // 1. РЎРЏРЎР‚Р С”Р С•-Р С”РЎР‚Р В°РЎРѓР Р…РЎвЂ№Р в„–
    '#FF9500', // 2. РЎРЏРЎР‚Р С”Р С•-Р С•РЎР‚Р В°Р Р…Р В¶Р ВµР Р†РЎвЂ№Р в„–
    '#FFD600', // 3. РЎРЏРЎР‚Р С”Р С•-Р В¶Р ВµР В»РЎвЂљРЎвЂ№Р в„–
    '#00CCFF', // 4. РЎРЏРЎР‚Р С”Р С•-Р С–Р С•Р В»РЎС“Р В±Р С•Р в„–
    '#3366FF', // 5. РЎРЏРЎР‚Р С”Р С•-РЎРѓР С‘Р Р…Р С‘Р в„–
    '#FF6699', // 6. РЎР‚Р С•Р В·Р С•Р Р†Р С•-Р С”РЎР‚Р В°РЎРѓР Р…РЎвЂ№Р в„–
    '#00FF99'  // 7. РЎРЏРЎР‚Р С”Р С•-Р СРЎРЏРЎвЂљР Р…РЎвЂ№Р в„–
];

// Р СџР С•Р В»РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉ РЎРѓР В»Р ВµР Т‘РЎС“РЎР‹РЎвЂ°Р С‘Р в„– РЎвЂ Р Р†Р ВµРЎвЂљ Р С—Р С• Р С—Р С•РЎР‚РЎРЏР Т‘Р С”РЎС“
function getNextZoneColor() {
    const color = zoneColorPalette[appState.zoneColorIndex % zoneColorPalette.length];
    appState.zoneColorIndex++;
    return color;
}

// Р С›РЎвЂљРЎР‚Р С‘РЎРѓР С•Р Р†Р С”Р В° Р В·Р С•Р Р…РЎвЂ№ Р Р…Р В° Р С”Р В°РЎР‚РЎвЂљР Вµ
function drawZone(zone) {
    if (!appState.leafletMap) return;
    
    // Р Р€Р Т‘Р В°Р В»РЎРЏР ВµР С РЎРѓРЎвЂљР В°РЎР‚РЎвЂ№Р в„– РЎРѓР В»Р С•Р в„– Р ВµРЎРѓР В»Р С‘ Р ВµРЎРѓРЎвЂљРЎРЉ
    if (zone.layer) {
        appState.leafletMap.removeLayer(zone.layer);
    }
    
    // Р Р€Р В±Р ВµР В¶Р Т‘Р В°Р ВµР СРЎРѓРЎРЏ, РЎвЂЎРЎвЂљР С• Р С—Р С•Р В»Р С‘Р С–Р С•Р Р… Р В·Р В°Р СР С”Р Р…РЎС“РЎвЂљ (Р С—Р С•РЎРѓР В»Р ВµР Т‘Р Р…РЎРЏРЎРЏ РЎвЂљР С•РЎвЂЎР С”Р В° = Р С—Р ВµРЎР‚Р Р†Р В°РЎРЏ)
    if (zone.points.length > 0) {
        const firstPoint = zone.points[0];
        zone.points[zone.points.length - 1] = [firstPoint[0], firstPoint[1]];
    }
    
    // Р РЋР С•Р В·Р Т‘Р В°Р ВµР С Р С—Р С•Р В»Р С‘Р С–Р С•Р Р…
    zone.layer = L.polygon(zone.points, {
        color: zone.color,
        weight: 2,
        opacity: 0.8,
        fillColor: zone.color,
        fillOpacity: 0.2,
        dashArray: null,
        smoothFactor: 0,
        noClip: true
    }).addTo(appState.leafletMap);
    
    // Р вЂќР С•Р В±Р В°Р Р†Р В»РЎРЏР ВµР С Р Р†РЎРѓР С—Р В»РЎвЂ№Р Р†Р В°РЎР‹РЎвЂ°Р ВµР Вµ Р С•Р С”Р Р…Р С•
    const popupContent = document.createElement('div');
    
    const title = document.createElement('div');
    title.className = 'marker-popup-title';
    title.textContent = zone.name;
    popupContent.appendChild(title);
    
    if (zone.comment) {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'marker-popup-comment';
        commentDiv.textContent = zone.comment;
        popupContent.appendChild(commentDiv);
    }
    
	const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'popup-buttons';
    buttonsDiv.innerHTML = `
        <button data-click="editZone(${zone.id})">Р В Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ</button>
        <button data-click="deleteZoneById(${zone.id})" style="background:#ff4444;color:white;">Р Р€Р Т‘Р В°Р В»Р С‘РЎвЂљРЎРЉ</button>
    `;
    popupContent.appendChild(buttonsDiv);
    
    zone.layer.bindPopup(popupContent, {
        autoPan: false  // Р С›Р СћР С™Р вЂєР В®Р В§Р С’Р вЂўР Сљ Р В°Р Р†РЎвЂљР С•Р СР В°РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С•Р Вµ РЎвЂ Р ВµР Р…РЎвЂљРЎР‚Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘Р Вµ Р С—РЎР‚Р С‘ Р С•РЎвЂљР С”РЎР‚РЎвЂ№РЎвЂљР С‘Р С‘ Р С—Р С•Р С—Р В°Р С—Р В°
    });
    
    // Р СџР В Р В Р С›Р СћР С™Р В Р В«Р СћР ВР В Р СџР С›Р СџР С’Р СџР С’ - Р СџР С›Р С™Р С’Р вЂ”Р В«Р вЂ™Р С’Р вЂўР Сљ Р вЂ™Р вЂўР В Р РЃР ВР СњР В«
    zone.layer.on('popupopen', function() {
        showZoneVertices(zone);
    });
    
    // Р ВР РЋР СџР В Р С’Р вЂ™Р вЂєР вЂўР СњР ВР вЂў: Р СџР В Р В Р вЂ”Р С’Р С™Р В Р В«Р СћР ВР В Р СџР С›Р СџР С’Р СџР С’ - Р СџР В Р С›Р вЂ™Р вЂўР В Р Р‡Р вЂўР Сљ, Р В§Р СћР С› Р В­Р СћР С› Р С™Р В Р вЂўР РЋР СћР ВР С™
    zone.layer.on('popupclose', function(e) {
        // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЏР ВµР С, Р В±РЎвЂ№Р В» Р В»Р С‘ Р С”Р В»Р С‘Р С” Р С—Р С• Р С”РЎР‚Р ВµРЎРѓРЎвЂљР С‘Р С”РЎС“
        const popup = zone.layer.getPopup();
        if (popup && popup._closeButton) {
            // Р вЂўРЎРѓР В»Р С‘ Р В·Р В°Р С”РЎР‚РЎвЂ№Р В»Р С‘ Р С”РЎР‚Р ВµРЎРѓРЎвЂљР С‘Р С”Р С•Р С - Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…РЎвЂ№ Р С•РЎРѓРЎвЂљР В°РЎР‹РЎвЂљРЎРѓРЎРЏ
            return;
        }
        // Р вЂ™ Р С•РЎРѓРЎвЂљР В°Р В»РЎРЉР Р…РЎвЂ№РЎвЂ¦ РЎРѓР В»РЎС“РЎвЂЎР В°РЎРЏРЎвЂ¦ (Р С”Р В»Р С‘Р С” Р Р†Р Р…Р Вµ Р С—Р С•Р С—Р В°Р С—Р В°) - РЎРѓР С”РЎР‚РЎвЂ№Р Р†Р В°Р ВµР С Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…РЎвЂ№
        hideZoneVertices(zone);
        if (appState.selectedZoneId === zone.id) {
            appState.selectedZoneId = null;
            updateZoneList();
        }
    });
    
    // Р С›Р вЂР В Р С’Р вЂР С›Р СћР В§Р ВР С™ Р С™Р вЂєР ВР С™Р С’ - Р СџР В Р ВР СњР Р€Р вЂќР ВР СћР вЂўР вЂєР В¬Р СњР С› Р С›Р СћР С™Р В Р В«Р вЂ™Р С’Р вЂўР Сљ Р СџР С›Р СџР С’Р Сџ Р В Р СџР С›Р С™Р С’Р вЂ”Р В«Р вЂ™Р С’Р вЂўР Сљ Р вЂ™Р вЂўР В Р РЃР ВР СњР В«
    zone.layer.on('click', function() {
        // Р РЋР С”РЎР‚РЎвЂ№Р Р†Р В°Р ВµР С Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…РЎвЂ№ Р С—РЎР‚Р ВµР Т‘РЎвЂ№Р Т‘РЎС“РЎвЂ°Р ВµР в„– Р В·Р С•Р Р…РЎвЂ№
        if (appState.selectedZoneId && appState.selectedZoneId !== zone.id) {
            const oldZone = appState.zones.find(z => z.id === appState.selectedZoneId);
            if (oldZone) {
                hideZoneVertices(oldZone);
            }
        }
        
        appState.selectedZoneId = zone.id;
        
        // Р С›РЎвЂљР С”РЎР‚РЎвЂ№Р Р†Р В°Р ВµР С Р С—Р С•Р С—Р В°Р С— Р В±Р ВµР В· Р В°Р Р†РЎвЂљР С•Р СР В°РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С•Р С–Р С• РЎвЂ Р ВµР Р…РЎвЂљРЎР‚Р С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘РЎРЏ
        zone.layer.openPopup();
        
        // Р СџР С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµР С Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…РЎвЂ№
        showZoneVertices(zone);
        
        updateZoneList();
    });
}

// Р СџР С•Р С”Р В°Р В·Р В°РЎвЂљРЎРЉ Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…РЎвЂ№ Р В·Р С•Р Р…РЎвЂ№
function showZoneVertices(zone) {
    if (!appState.leafletMap) return;
    
    // Р Р€Р Т‘Р В°Р В»РЎРЏР ВµР С РЎРѓРЎвЂљР В°РЎР‚РЎвЂ№Р Вµ Р СР В°РЎР‚Р С”Р ВµРЎР‚РЎвЂ№ Р ВµРЎРѓР В»Р С‘ Р ВµРЎРѓРЎвЂљРЎРЉ
    if (zone.vertexMarkers) {
        zone.vertexMarkers.forEach(marker => {
            if (appState.leafletMap) appState.leafletMap.removeLayer(marker);
        });
    }
    
    zone.vertexMarkers = [];
    
    // ===== Р С›Р РЋР СњР С›Р вЂ™Р СњР В«Р вЂў Р вЂ™Р вЂўР В Р РЃР ВР СњР В« =====
    for (let i = 0; i < zone.points.length - 1; i++) {
        const point = zone.points[i];
        const latlng = L.latLng(point[0], point[1]);
        
        const marker = L.marker(latlng, {
            icon: L.divIcon({
                html: `<div style="background: ${zone.color}; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 4px rgba(0,0,0,0.5); cursor: move;"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
                className: 'zone-vertex-marker'
            }),
            draggable: true
        }).addTo(appState.leafletMap);
        
        marker.vertexIndex = i;
        marker.zoneId = zone.id;
        marker.isMainVertex = true;
        
        // Р СџР С•Р С—Р В°Р С— Р Т‘Р В»РЎРЏ РЎС“Р Т‘Р В°Р В»Р ВµР Р…Р С‘РЎРЏ Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…РЎвЂ№
        const popupContent = document.createElement('div');
        popupContent.style.cssText = 'padding:0; margin:0; min-width:auto; width:fit-content;';
        
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'popup-buttons';
        buttonsDiv.style.cssText = 'padding:0; margin:0; width:fit-content;';
        buttonsDiv.innerHTML = `
            <button data-click="deleteVertex(${zone.id}, ${i});" 
                    style="background:#ff4444; color:white; border:none; border-radius:4px; padding:5px 12px; font-size:0.85em; cursor:pointer; width:100%; white-space:nowrap;">
                Р Р€Р Т‘Р В°Р В»Р С‘РЎвЂљРЎРЉ
            </button>
        `;
        
        popupContent.appendChild(buttonsDiv);
        marker.bindPopup(popupContent, { closeButton: false, className: 'vertex-popup' });
        
        marker.on('click', function() { this.openPopup(); });
        
        // Р С›Р В±РЎР‚Р В°Р В±Р С•РЎвЂљРЎвЂЎР С‘Р С” Р С—Р ВµРЎР‚Р ВµРЎвЂљР В°РЎРѓР С”Р С‘Р Р†Р В°Р Р…Р С‘РЎРЏ РЎРѓ Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В°Р СР С‘ Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘Р в„–
        marker.on('drag', function(e) {
            const newLatLng = e.target.getLatLng();
            const currentZone = appState.zones.find(z => z.id === marker.zoneId);
            if (!currentZone) return;
            
            // Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎРЏР ВµР С РЎРѓРЎвЂљР В°РЎР‚РЎвЂ№Р Вµ Р С”Р С•Р С•РЎР‚Р Т‘Р С‘Р Р…Р В°РЎвЂљРЎвЂ№
            const oldLat = currentZone.points[marker.vertexIndex][0];
            const oldLng = currentZone.points[marker.vertexIndex][1];
            
            // Р СџР С•Р В»РЎС“РЎвЂЎР В°Р ВµР С Р С—РЎР‚Р ВµР Т‘РЎвЂ№Р Т‘РЎС“РЎвЂ°РЎС“РЎР‹ Р С—Р С•Р В·Р С‘РЎвЂ Р С‘РЎР‹ (Р Т‘Р В»РЎРЏ Р С‘Р Р…РЎвЂљР ВµРЎР‚Р С—Р С•Р В»РЎРЏРЎвЂ Р С‘Р С‘)
            const prevPos = marker._prevLatLng || L.latLng(oldLat, oldLng);
            
            // Р ВР Р…РЎвЂљР ВµРЎР‚Р С—Р С•Р В»РЎРЏРЎвЂ Р С‘РЎРЏ - Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЏР ВµР С Р С—РЎР‚Р С•Р СР ВµР В¶РЎС“РЎвЂљР С•РЎвЂЎР Р…РЎвЂ№Р Вµ РЎвЂљР С•РЎвЂЎР С”Р С‘
            const steps = 5;
            for (let s = 1; s <= steps; s++) {
                const t = s / steps;
                const checkLat = prevPos.lat + (newLatLng.lat - prevPos.lat) * t;
                const checkLng = prevPos.lng + (newLatLng.lng - prevPos.lng) * t;
                
                // Р вЂ™РЎР‚Р ВµР СР ВµР Р…Р Р…Р С• РЎРѓРЎвЂљР В°Р Р†Р С‘Р С РЎвЂљР С•РЎвЂЎР С”РЎС“ Р Р† Р С—РЎР‚Р С•Р СР ВµР В¶РЎС“РЎвЂљР С•РЎвЂЎР Р…Р С•Р Вµ Р С—Р С•Р В»Р С•Р В¶Р ВµР Р…Р С‘Р Вµ
                currentZone.points[marker.vertexIndex] = [checkLat, checkLng];
                
                // Р вЂўРЎРѓР В»Р С‘ РЎРЊРЎвЂљР С• Р С—Р ВµРЎР‚Р Р†Р В°РЎРЏ Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…Р В°, Р С•Р В±Р Р…Р С•Р Р†Р В»РЎРЏР ВµР С Р С‘ Р С—Р С•РЎРѓР В»Р ВµР Т‘Р Р…РЎР‹РЎР‹ (Р Т‘Р В»РЎРЏ Р В·Р В°Р СР С”Р Р…РЎС“РЎвЂљР С•Р С–Р С• Р С—Р С•Р В»Р С‘Р С–Р С•Р Р…Р В°)
                if (marker.vertexIndex === 0) {
                    const lastIndex = currentZone.points.length - 1;
                    currentZone.points[lastIndex] = [checkLat, checkLng];
                }
                
                // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° РЎРѓР В°Р СР С•Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘РЎРЏ РЎРѓР Р†Р С•Р ВµР в„– Р В·Р С•Р Р…РЎвЂ№
                const selfIntersects = isSelfIntersecting(currentZone.points);
                
                // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘РЎРЏ РЎРѓ Р Т‘РЎР‚РЎС“Р С–Р С‘Р СР С‘ Р В·Р С•Р Р…Р В°Р СР С‘
                const { intersects: otherIntersects } = isPolygonIntersectingZones(currentZone.points, currentZone.id);
                
                if (selfIntersects || otherIntersects) {
                    // Р вЂ™Р С•Р В·Р Р†РЎР‚Р В°РЎвЂ°Р В°Р ВµР СРЎРѓРЎРЏ Р С” Р С—РЎР‚Р ВµР Т‘РЎвЂ№Р Т‘РЎС“РЎвЂ°Р ВµР в„– Р В±Р ВµР В·Р С•Р С—Р В°РЎРѓР Р…Р С•Р в„– Р С—Р С•Р В·Р С‘РЎвЂ Р С‘Р С‘
                    const safeLat = s === 1 ? oldLat : prevPos.lat + (newLatLng.lat - prevPos.lat) * ((s - 1) / steps);
                    const safeLng = s === 1 ? oldLng : prevPos.lng + (newLatLng.lng - prevPos.lng) * ((s - 1) / steps);
                    
                    currentZone.points[marker.vertexIndex] = [safeLat, safeLng];
                    if (marker.vertexIndex === 0) {
                        const lastIndex = currentZone.points.length - 1;
                        currentZone.points[lastIndex] = [safeLat, safeLng];
                    }
                    
                    e.target.setLatLng([safeLat, safeLng]);
                    
                    if (currentZone.layer) {
                        currentZone.layer.setLatLngs(currentZone.points);
                    }
                    updateMidVertices(currentZone);
                    
                    marker._prevLatLng = L.latLng(safeLat, safeLng);
                    return;
                }
            }
            
            // Р вЂўРЎРѓР В»Р С‘ Р Р†РЎРѓР Вµ Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р С‘ Р С—РЎР‚Р С•Р в„–Р Т‘Р ВµР Р…РЎвЂ№ - РЎвЂћР С‘Р С”РЎРѓР С‘РЎР‚РЎС“Р ВµР С Р Р…Р С•Р Р†РЎС“РЎР‹ Р С—Р С•Р В·Р С‘РЎвЂ Р С‘РЎР‹
            currentZone.points[marker.vertexIndex] = [newLatLng.lat, newLatLng.lng];
            if (marker.vertexIndex === 0) {
                const lastIndex = currentZone.points.length - 1;
                currentZone.points[lastIndex] = [newLatLng.lat, newLatLng.lng];
            }
            
            marker._prevLatLng = newLatLng;
            
            if (currentZone.layer) {
                currentZone.layer.setLatLngs(currentZone.points);
            }
            updateMidVertices(currentZone);
        });
        
        marker.on('dragstart', function(e) {
            const iconElement = marker.getElement();
            if (iconElement) iconElement.classList.add('dragging');
            appState.leafletMap.dragging.disable();
            
            // Р вЂ”Р В°Р С—Р С•Р СР С‘Р Р…Р В°Р ВµР С Р Р…Р В°РЎвЂЎР В°Р В»РЎРЉР Р…РЎС“РЎР‹ Р С—Р С•Р В·Р С‘РЎвЂ Р С‘РЎР‹
            const currentZone = appState.zones.find(z => z.id === marker.zoneId);
            if (currentZone) {
                const point = currentZone.points[marker.vertexIndex];
                marker._prevLatLng = L.latLng(point[0], point[1]);
            }
        });
        
        marker.on('dragend', function(e) {
            const iconElement = marker.getElement();
            if (iconElement) iconElement.classList.remove('dragging');
            appState.leafletMap.dragging.enable();
            
            const currentZone = appState.zones.find(z => z.id === marker.zoneId);
            if (currentZone) markMapAsChanged();
			redrawAllBSCirclesWithGlobalOverride();
        });
        
        zone.vertexMarkers.push(marker);
    }
    
    // ===== Р РЋР В Р вЂўР вЂќР ВР СњР СњР В«Р вЂў Р вЂ™Р вЂўР В Р РЃР ВР СњР В« =====
    updateMidVertices(zone);
}

// Р С›Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…Р С‘Р Вµ РЎРѓРЎР‚Р ВµР Т‘Р С‘Р Р…Р Р…РЎвЂ№РЎвЂ¦ Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…
function updateMidVertices(zone) {
    if (!appState.leafletMap || !zone) return;
    
    // Р Р€Р Т‘Р В°Р В»РЎРЏР ВµР С РЎвЂљР С•Р В»РЎРЉР С”Р С• РЎРѓРЎР‚Р ВµР Т‘Р С‘Р Р…Р Р…РЎвЂ№Р Вµ Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…РЎвЂ№
    if (zone.midVertexMarkers) {
        zone.midVertexMarkers.forEach(marker => {
            if (appState.leafletMap) appState.leafletMap.removeLayer(marker);
        });
    }
    
    zone.midVertexMarkers = [];
    
    // Р РЋР С•Р В·Р Т‘Р В°Р ВµР С РЎРѓРЎР‚Р ВµР Т‘Р С‘Р Р…Р Р…РЎвЂ№Р Вµ Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…РЎвЂ№ Р В·Р В°Р Р…Р С•Р Р†Р С•
    for (let i = 0; i < zone.points.length - 1; i++) {
        const currentPoint = zone.points[i];
        const nextPoint = zone.points[i + 1];
        
        const midLat = (currentPoint[0] + nextPoint[0]) / 2;
        const midLng = (currentPoint[1] + nextPoint[1]) / 2;
        const midLatLng = L.latLng(midLat, midLng);
        
        const midMarker = L.marker(midLatLng, {
            icon: L.divIcon({
                html: `<div style="background: ${zone.color}; width: 10px; height: 10px; border: 1.5px solid white; border-radius: 50%; opacity: 0.6; box-shadow: 0 0 3px rgba(0,0,0,0.3); cursor: move;"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
                className: 'zone-mid-vertex-marker'
            }),
            draggable: true
        }).addTo(appState.leafletMap);
        
        midMarker.vertexIndex = i;
        midMarker.zoneId = zone.id;
        midMarker.isMidVertex = true;
        midMarker.vertexInserted = false; // Р В¤Р В»Р В°Р С–, РЎвЂЎРЎвЂљР С• Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…Р В° Р ВµРЎвЂ°Р Вµ Р Р…Р Вµ Р Р†РЎРѓРЎвЂљР В°Р Р†Р В»Р ВµР Р…Р В°
        
        midMarker.on('dragstart', function(e) {
            const iconElement = midMarker.getElement();
            if (iconElement) iconElement.classList.add('dragging');
            appState.leafletMap.dragging.disable();
            
            // Р вЂ”Р В°Р С—Р С•Р СР С‘Р Р…Р В°Р ВµР С Р Р…Р В°РЎвЂЎР В°Р В»РЎРЉР Р…РЎС“РЎР‹ Р С—Р С•Р В·Р С‘РЎвЂ Р С‘РЎР‹
            const currentZone = appState.zones.find(z => z.id === midMarker.zoneId);
            if (currentZone && midMarker.newVertexIndex !== undefined) {
                const point = currentZone.points[midMarker.newVertexIndex];
                midMarker._prevLatLng = L.latLng(point[0], point[1]);
            }
        });
        
        midMarker.on('drag', function(e) {
            const newLatLng = e.target.getLatLng();
            const currentZone = appState.zones.find(z => z.id === midMarker.zoneId);
            if (!currentZone) return;
            
            const idx = midMarker.vertexIndex;
            
            // Р вЂўРЎРѓР В»Р С‘ Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…Р В° Р ВµРЎвЂ°Р Вµ Р Р…Р Вµ Р Р†РЎРѓРЎвЂљР В°Р Р†Р В»Р ВµР Р…Р В° - РЎРѓР С•Р В·Р Т‘Р В°Р ВµР С Р Р…Р С•Р Р†РЎС“РЎР‹
            if (!midMarker.vertexInserted) {
                const newPoint = [newLatLng.lat, newLatLng.lng];
                currentZone.points.splice(idx + 1, 0, newPoint);
                midMarker.vertexInserted = true;
                midMarker.newVertexIndex = idx + 1;
                midMarker._prevLatLng = newLatLng;
                
                if (currentZone.layer) {
                    currentZone.layer.setLatLngs(currentZone.points);
                }
            } else {
                // Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎРЏР ВµР С РЎРѓРЎвЂљР В°РЎР‚РЎвЂ№Р Вµ Р С”Р С•Р С•РЎР‚Р Т‘Р С‘Р Р…Р В°РЎвЂљРЎвЂ№
                const oldLat = currentZone.points[midMarker.newVertexIndex][0];
                const oldLng = currentZone.points[midMarker.newVertexIndex][1];
                
                const prevPos = midMarker._prevLatLng || L.latLng(oldLat, oldLng);
                
                // Р ВР Р…РЎвЂљР ВµРЎР‚Р С—Р С•Р В»РЎРЏРЎвЂ Р С‘РЎРЏ
                const steps = 5;
                for (let s = 1; s <= steps; s++) {
                    const t = s / steps;
                    const checkLat = prevPos.lat + (newLatLng.lat - prevPos.lat) * t;
                    const checkLng = prevPos.lng + (newLatLng.lng - prevPos.lng) * t;
                    
                    currentZone.points[midMarker.newVertexIndex] = [checkLat, checkLng];
                    
                    // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° РЎРѓР В°Р СР С•Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘РЎРЏ РЎРѓР Р†Р С•Р ВµР в„– Р В·Р С•Р Р…РЎвЂ№
                    const selfIntersects = isSelfIntersecting(currentZone.points);
                    
                    // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В° Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘РЎРЏ РЎРѓ Р Т‘РЎР‚РЎС“Р С–Р С‘Р СР С‘ Р В·Р С•Р Р…Р В°Р СР С‘
                    const { intersects: otherIntersects } = isPolygonIntersectingZones(currentZone.points, currentZone.id);
                    
                    if (selfIntersects || otherIntersects) {
                        const safeLat = s === 1 ? oldLat : prevPos.lat + (newLatLng.lat - prevPos.lat) * ((s - 1) / steps);
                        const safeLng = s === 1 ? oldLng : prevPos.lng + (newLatLng.lng - prevPos.lng) * ((s - 1) / steps);
                        
                        currentZone.points[midMarker.newVertexIndex] = [safeLat, safeLng];
                        e.target.setLatLng([safeLat, safeLng]);
                        
                        if (currentZone.layer) {
                            currentZone.layer.setLatLngs(currentZone.points);
                        }
                        
                        midMarker._prevLatLng = L.latLng(safeLat, safeLng);
                        return;
                    }
                }
                
                // Р В¤Р С‘Р Р…Р В°Р В»РЎРЉР Р…Р В°РЎРЏ Р С—Р С•Р В·Р С‘РЎвЂ Р С‘РЎРЏ
                currentZone.points[midMarker.newVertexIndex] = [newLatLng.lat, newLatLng.lng];
                midMarker._prevLatLng = newLatLng;
                
                if (currentZone.layer) {
                    currentZone.layer.setLatLngs(currentZone.points);
                }
            }
        });
        
        midMarker.on('dragend', function(e) {
            const iconElement = midMarker.getElement();
            if (iconElement) iconElement.classList.remove('dragging');
            appState.leafletMap.dragging.enable();
            
            const currentZone = appState.zones.find(z => z.id === midMarker.zoneId);
            if (currentZone) {
                // Р СџР С•Р В»Р Р…Р С•РЎРѓРЎвЂљРЎРЉРЎР‹ Р С—Р ВµРЎР‚Р ВµРЎР‚Р С‘РЎРѓР С•Р Р†РЎвЂ№Р Р†Р В°Р ВµР С Р Р†РЎРѓР Вµ Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…РЎвЂ№ Р Т‘Р В»РЎРЏ Р С”Р С•РЎР‚РЎР‚Р ВµР С”РЎвЂљР Р…Р С•Р С–Р С• Р С•РЎвЂљР С•Р В±РЎР‚Р В°Р В¶Р ВµР Р…Р С‘РЎРЏ
                showZoneVertices(currentZone);
                markMapAsChanged();
            }
            
            midMarker.vertexInserted = false;
        });
        
        if (!zone.midVertexMarkers) zone.midVertexMarkers = [];
        zone.midVertexMarkers.push(midMarker);
    }
}

// Р РЋР С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…РЎвЂ№ Р В·Р С•Р Р…РЎвЂ№
function hideZoneVertices(zone) {
    if (!appState.leafletMap || !zone) return;
    
    if (zone.vertexMarkers) {
        zone.vertexMarkers.forEach(marker => {
            if (appState.leafletMap) appState.leafletMap.removeLayer(marker);
        });
        zone.vertexMarkers = [];
    }
    
    if (zone.midVertexMarkers) {
        zone.midVertexMarkers.forEach(marker => {
            if (appState.leafletMap) appState.leafletMap.removeLayer(marker);
        });
        zone.midVertexMarkers = [];
    }
}

// Р Р€Р Т‘Р В°Р В»Р ВµР Р…Р С‘Р Вµ Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…РЎвЂ№ Р В·Р С•Р Р…РЎвЂ№ РЎРѓ Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р С•Р в„– Р Р…Р В° Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘РЎРЏ
function deleteVertex(zoneId, vertexIndex) {
    const zone = appState.zones.find(z => z.id === zoneId);
    if (!zone) return;
    
    // Р вЂўРЎРѓР В»Р С‘ Р С—Р С•РЎРѓР В»Р Вµ РЎС“Р Т‘Р В°Р В»Р ВµР Р…Р С‘РЎРЏ Р С•РЎРѓРЎвЂљР В°Р Р…Р ВµРЎвЂљРЎРѓРЎРЏ Р СР ВµР Р…РЎРЉРЎв‚¬Р Вµ 3 РЎвЂљР С•РЎвЂЎР ВµР С” - РЎС“Р Т‘Р В°Р В»РЎРЏР ВµР С Р Р†РЎРѓРЎР‹ Р В·Р С•Р Р…РЎС“ Р В±Р ВµР В· Р С—Р С•Р Т‘РЎвЂљР Р†Р ВµРЎР‚Р В¶Р Т‘Р ВµР Р…Р С‘РЎРЏ
    if (zone.points.length <= 4) {
        deleteZone(zoneId);
        return;
    }
    
    // Р РЋР С•Р В·Р Т‘Р В°Р ВµР С Р С”Р С•Р С—Р С‘РЎР‹ РЎвЂљР С•РЎвЂЎР ВµР С” Р Т‘Р В»РЎРЏ РЎвЂљР ВµРЎРѓРЎвЂљР С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘РЎРЏ
    const testPoints = [...zone.points];
    
    // Р Р€Р Т‘Р В°Р В»РЎРЏР ВµР С Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…РЎС“ Р С‘Р В· РЎвЂљР ВµРЎРѓРЎвЂљР С•Р Р†Р С•Р С–Р С• Р СР В°РЎРѓРЎРѓР С‘Р Р†Р В°
    testPoints.splice(vertexIndex, 1);
    
    // Р вЂўРЎРѓР В»Р С‘ РЎС“Р Т‘Р В°Р В»Р С‘Р В»Р С‘ Р С—Р ВµРЎР‚Р Р†РЎС“РЎР‹ Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…РЎС“, Р С•Р В±Р Р…Р С•Р Р†Р В»РЎРЏР ВµР С Р С—Р С•РЎРѓР В»Р ВµР Т‘Р Р…РЎР‹РЎР‹
    if (vertexIndex === 0) {
        const newFirstPoint = testPoints[0];
        testPoints[testPoints.length - 1] = [newFirstPoint[0], newFirstPoint[1]];
    }
    
    // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЏР ВµР С РЎРѓР В°Р СР С•Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘Р Вµ РЎвЂљР ВµРЎРѓРЎвЂљР С•Р Р†Р С•Р С–Р С• Р С—Р С•Р В»Р С‘Р С–Р С•Р Р…Р В°
    const selfIntersects = isSelfIntersecting(testPoints);
    
    // Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЏР ВµР С Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘Р Вµ РЎРѓ Р Т‘РЎР‚РЎС“Р С–Р С‘Р СР С‘ Р В·Р С•Р Р…Р В°Р СР С‘
    const { intersects: otherIntersects } = isPolygonIntersectingZones(testPoints, zone.id);
    
    // Р вЂўРЎРѓР В»Р С‘ Р ВµРЎРѓРЎвЂљРЎРЉ Р С—Р ВµРЎР‚Р ВµРЎРѓР ВµРЎвЂЎР ВµР Р…Р С‘РЎРЏ - Р С—Р С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµР С Р Р†Р С‘Р В·РЎС“Р В°Р В»РЎРЉР Р…Р С•Р Вµ Р С—РЎР‚Р ВµР Т‘РЎС“Р С—РЎР‚Р ВµР В¶Р Т‘Р ВµР Р…Р С‘Р Вµ Р С‘ Р Р…Р Вµ РЎС“Р Т‘Р В°Р В»РЎРЏР ВµР С
    if (selfIntersects || otherIntersects) {
        // Р СџР С•Р Т‘РЎРѓР Р†Р ВµРЎвЂЎР С‘Р Р†Р В°Р ВµР С Р С”РЎР‚Р В°РЎРѓР Р…РЎвЂ№Р С Р С—РЎР‚Р С•Р В±Р В»Р ВµР СР Р…РЎвЂ№Р в„– Р С—Р С•Р В»Р С‘Р С–Р С•Р Р…
        if (appState.leafletMap) {
            const errorPolygon = L.polygon(testPoints, {
                color: '#ff4444',
                weight: 3,
                opacity: 0.9,
                fillOpacity: 0.1,
                dashArray: '5, 5'
            }).addTo(appState.leafletMap);
            
            setTimeout(() => {
                if (appState.leafletMap) appState.leafletMap.removeLayer(errorPolygon);
            }, 1500);
        }
        return;
    }
    
    // Р вЂўРЎРѓР В»Р С‘ Р С—РЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р С‘ Р С—РЎР‚Р С•Р в„–Р Т‘Р ВµР Р…РЎвЂ№ - РЎС“Р Т‘Р В°Р В»РЎРЏР ВµР С Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…РЎС“
    zone.points.splice(vertexIndex, 1);
    
    // Р вЂўРЎРѓР В»Р С‘ РЎС“Р Т‘Р В°Р В»Р С‘Р В»Р С‘ Р С—Р ВµРЎР‚Р Р†РЎС“РЎР‹ Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…РЎС“, Р С•Р В±Р Р…Р С•Р Р†Р В»РЎРЏР ВµР С Р С—Р С•РЎРѓР В»Р ВµР Т‘Р Р…РЎР‹РЎР‹
    if (vertexIndex === 0) {
        const newFirstPoint = zone.points[0];
        zone.points[zone.points.length - 1] = [newFirstPoint[0], newFirstPoint[1]];
    }
    
    // Р С›Р В±Р Р…Р С•Р Р†Р В»РЎРЏР ВµР С Р С—Р С•Р В»Р С‘Р С–Р С•Р Р…
    if (zone.layer) {
        zone.layer.setLatLngs(zone.points);
    }
    
    // Р СџР ВµРЎР‚Р ВµРЎР‚Р С‘РЎРѓР С•Р Р†РЎвЂ№Р Р†Р В°Р ВµР С Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…РЎвЂ№
    showZoneVertices(zone);
    
    markMapAsChanged();
}

// Р Р€Р Т‘Р В°Р В»Р ВµР Р…Р С‘Р Вµ Р В·Р С•Р Р…РЎвЂ№ Р С—Р С• ID (Р С‘Р В· Р С—Р С•Р С—Р В°Р С—Р В°)
function deleteZoneById(zoneId) {
    deleteZone(zoneId); // Р СџРЎР‚Р С•РЎРѓРЎвЂљР С• Р Р†РЎвЂ№Р В·РЎвЂ№Р Р†Р В°Р ВµР С deleteZone Р В±Р ВµР В· Р С—Р С•Р Т‘РЎвЂљР Р†Р ВµРЎР‚Р В¶Р Т‘Р ВµР Р…Р С‘РЎРЏ
    if (appState.leafletMap) {
        appState.leafletMap.closePopup();
    }
}

// Р С›Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…Р С‘Р Вµ РЎРѓР С—Р С‘РЎРѓР С”Р В° Р В·Р С•Р Р…
function updateZoneList() {
    const zoneCountEl = document.getElementById('zoneCount');
    const zoneListEl = document.getElementById('zoneList');
    const zoneEmptyEl = document.getElementById('zoneEmptyMessage');
    
    zoneCountEl.textContent = `Р С™Р С•Р В»Р С‘РЎвЂЎР ВµРЎРѓРЎвЂљР Р†Р С• Р В·Р С•Р Р…: ${appState.zones.length}`;
    
    if (appState.zones.length === 0) {
        zoneListEl.style.display = 'none';
        zoneEmptyEl.style.display = 'none';
        return;
    }
    
    zoneListEl.style.display = 'block';
    zoneEmptyEl.style.display = 'none';
    
    zoneListEl.innerHTML = '';
    
    appState.zones.forEach(zone => {
        const listItem = document.createElement('div');
        listItem.className = 'bs-list-item';
        listItem.dataset.id = zone.id;
        
        if (appState.selectedZoneId === zone.id) {
            listItem.classList.add('active');
        }
        
        const colorIndicator = document.createElement('span');
        colorIndicator.style.cssText = `display:inline-block; width:12px; height:12px; background:${zone.color}; border-radius:3px; margin-right:8px; flex-shrink:0;`;
        
        const nameSpan = document.createElement('div');
        nameSpan.className = 'bs-list-item-name';
        nameSpan.textContent = zone.name;
        nameSpan.style.marginLeft = '0';
        
        const infoSpan = document.createElement('div');
        infoSpan.className = 'bs-list-item-info';
        
        if (zone.comment && zone.comment.trim()) {
            const comment = zone.comment.trim();
            infoSpan.textContent = comment.length > 20 ? comment.substring(0, 20) + '...' : comment;
            infoSpan.title = comment;
            infoSpan.style.color = '#aaa';
        } else {
            infoSpan.textContent = '';
        }
        
        const editBtn = document.createElement('button');
        editBtn.innerHTML = 'РІСљРЏРїС‘РЏ';
        editBtn.style.cssText = 'background:transparent; border:none; color:#aaa; cursor:pointer; font-size:12px; padding:2px 6px; margin-left:4px; flex-shrink:0;';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editZone(zone.id);
        });
        
        listItem.appendChild(colorIndicator);
        listItem.appendChild(nameSpan);
        listItem.appendChild(infoSpan);
        listItem.appendChild(editBtn);
        
        listItem.addEventListener('click', function(e) {
            if (e.target !== editBtn && !editBtn.contains(e.target)) {
                selectZone(zone.id);
            }
        });
        
        zoneListEl.appendChild(listItem);
    });
}

// Р вЂ™РЎвЂ№Р В±Р С•РЎР‚ Р В·Р С•Р Р…РЎвЂ№
function selectZone(zoneId) {
    if (appState.selectedZoneId) {
        const oldZone = appState.zones.find(z => z.id === appState.selectedZoneId);
        if (oldZone) {
            hideZoneVertices(oldZone);
        }
    }
    
    appState.selectedZoneId = zoneId;
    
    const zone = appState.zones.find(z => z.id === zoneId);
    if (zone && appState.leafletMap) {
        // Р В¦Р ВµР Р…РЎвЂљРЎР‚Р С‘РЎР‚РЎС“Р ВµР С Р С”Р В°РЎР‚РЎвЂљРЎС“ Р Р…Р В° Р В·Р С•Р Р…Р Вµ (Р Т‘Р В»РЎРЏ Р С”Р В»Р С‘Р С”Р В° Р С—Р С• РЎРѓР С—Р С‘РЎРѓР С”РЎС“)
        const bounds = L.latLngBounds(zone.points);
        appState.leafletMap.fitBounds(bounds, { padding: [50, 50] }); // Р вЂќР С•Р В±Р В°Р Р†Р В»РЎРЏР ВµР С Р С•РЎвЂљРЎРѓРЎвЂљРЎС“Р С—РЎвЂ№
        
        if (zone.layer) {
            zone.layer.openPopup();
        }
        
        showZoneVertices(zone);
    }
    
    updateZoneList();
}

// Р В Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘Р Вµ Р В·Р С•Р Р…РЎвЂ№
function editZone(zoneId) {
    const zone = appState.zones.find(z => z.id === zoneId);
    if (!zone) return;
    
    appState.editingZoneId = zoneId;
    
    // Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎРЏР ВµР С Р С•РЎР‚Р С‘Р С–Р С‘Р Р…Р В°Р В»РЎРЉР Р…РЎвЂ№Р Вµ Р В·Р Р…Р В°РЎвЂЎР ВµР Р…Р С‘РЎРЏ
    appState.originalZoneValues = {
        name: zone.name,
        comment: zone.comment || ''
    };
    
    document.getElementById('zoneName').value = zone.name || '';
    document.getElementById('zoneComment').value = zone.comment || '';
    
    // Р СџР С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµР С Р С”Р Р…Р С•Р С—Р С”РЎС“ РЎС“Р Т‘Р В°Р В»Р ВµР Р…Р С‘РЎРЏ
    document.getElementById('deleteZoneBtn').style.display = 'block';
    
    // Р СџР С•Р В·Р С‘РЎвЂ Р С‘Р С•Р Р…Р С‘РЎР‚РЎС“Р ВµР С Р Т‘Р С‘Р В°Р В»Р С•Р С– РЎР‚РЎРЏР Т‘Р С•Р С РЎРѓ Р В·Р С•Р Р…Р С•Р в„–
    if (zone.layer && appState.leafletMap) {
        const bounds = zone.layer.getBounds();
        const center = bounds.getCenter();
        const point = appState.leafletMap.latLngToContainerPoint(center);
        
        const rect = canvas.getBoundingClientRect();
        const dialog = document.getElementById('zoneDialog');
        dialog.style.left = (rect.left + point.x + 20) + 'px';
        dialog.style.top = (rect.top + point.y) + 'px';
    } else {
        const dialog = document.getElementById('zoneDialog');
        dialog.style.left = '50%';
        dialog.style.top = '20%';
        dialog.style.transform = 'translate(-50%, 0)';
    }
    
    document.getElementById('zoneDialog').classList.add('active');
    document.getElementById('zoneName').focus();
}

// Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…Р С‘РЎвЂљРЎРЉ Р С‘Р В·Р СР ВµР Р…Р ВµР Р…Р С‘РЎРЏ Р В·Р С•Р Р…РЎвЂ№
function saveZone() {
    if (!appState.editingZoneId) return;
    
    const zone = appState.zones.find(z => z.id === appState.editingZoneId);
    if (!zone) return;
    
    const nameInput = document.getElementById('zoneName');
    let newName = nameInput.value.trim();
    const newComment = document.getElementById('zoneComment').value.trim();
    
    // Р вЂўРЎРѓР В»Р С‘ Р С‘Р СРЎРЏ Р С—РЎС“РЎРѓРЎвЂљР С•Р Вµ - Р С–Р ВµР Р…Р ВµРЎР‚Р С‘РЎР‚РЎС“Р ВµР С РЎРѓР В»Р ВµР Т‘РЎС“РЎР‹РЎвЂ°Р ВµР Вµ Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р Р…Р С•Р Вµ
    if (!newName) {
        const zoneNumber = getNextZoneNumber();
        newName = `Р вЂ”Р С•Р Р…Р В° ${zoneNumber}`;
    }
    
    // Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎРЏР ВµР С Р С‘Р В·Р СР ВµР Р…Р ВµР Р…Р С‘РЎРЏ
    zone.name = newName;
    zone.comment = newComment;
    
    // Р С›Р В±Р Р…Р С•Р Р†Р В»РЎРЏР ВµР С Р С—Р С•Р С—Р В°Р С— Р Р…Р В° Р С”Р В°РЎР‚РЎвЂљР Вµ
    if (zone.layer) {
        zone.layer.closePopup();
        drawZone(zone);
    }
    
    // Р С›Р В±Р Р…Р С•Р Р†Р В»РЎРЏР ВµР С РЎРѓР С—Р С‘РЎРѓР С•Р С” Р В·Р С•Р Р…
    updateZoneList();
    markMapAsChanged();
    
    // Р вЂ”Р В°Р С”РЎР‚РЎвЂ№Р Р†Р В°Р ВµР С Р Т‘Р С‘Р В°Р В»Р С•Р С– Р В±Р ВµР В· Р Р†Р С•РЎРѓРЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р В»Р ВµР Р…Р С‘РЎРЏ
    document.getElementById('zoneDialog').classList.remove('active');
    appState.editingZoneId = null;
    appState.originalZoneValues = null;
}

// Р С›РЎвЂљР СР ВµР Р…Р В° РЎР‚Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘РЎРЏ Р В·Р С•Р Р…РЎвЂ№
function cancelZone() {
    // Р вЂ™Р С•РЎРѓРЎРѓРЎвЂљР В°Р Р…Р В°Р Р†Р В»Р С‘Р Р†Р В°Р ВµР С Р С•РЎР‚Р С‘Р С–Р С‘Р Р…Р В°Р В»РЎРЉР Р…РЎвЂ№Р Вµ Р В·Р Р…Р В°РЎвЂЎР ВµР Р…Р С‘РЎРЏ, Р ВµРЎРѓР В»Р С‘ Р В±РЎвЂ№Р В»Р С‘ Р С‘Р В·Р СР ВµР Р…Р ВµР Р…Р С‘РЎРЏ
    if (appState.editingZoneId && appState.originalZoneValues) {
        const zone = appState.zones.find(z => z.id === appState.editingZoneId);
        if (zone) {
            zone.name = appState.originalZoneValues.name;
            zone.comment = appState.originalZoneValues.comment;
            
            if (zone.layer) {
                zone.layer.closePopup();
                drawZone(zone);
            }
            updateZoneList();
        }
    }
    
    // Р РЋР В±РЎР‚Р В°РЎРѓРЎвЂ№Р Р†Р В°Р ВµР С Р С—Р ВµРЎР‚Р ВµР СР ВµР Р…Р Р…РЎвЂ№Р Вµ Р С‘ Р В·Р В°Р С”РЎР‚РЎвЂ№Р Р†Р В°Р ВµР С Р Т‘Р С‘Р В°Р В»Р С•Р С–
    appState.editingZoneId = null;
    appState.originalZoneValues = null;
    document.getElementById('zoneDialog').classList.remove('active');
}

// Р Р€Р Т‘Р В°Р В»Р ВµР Р…Р С‘Р Вµ Р В·Р С•Р Р…РЎвЂ№ Р С‘Р В· Р Т‘Р С‘Р В°Р В»Р С•Р С–Р В°
function deleteZoneFromDialog() {
    if (!appState.editingZoneId) return;
    
    // Р Р€Р Т‘Р В°Р В»РЎРЏР ВµР С Р В·Р С•Р Р…РЎС“ Р В±Р ВµР В· Р С—Р С•Р Т‘РЎвЂљР Р†Р ВµРЎР‚Р В¶Р Т‘Р ВµР Р…Р С‘РЎРЏ
    deleteZone(appState.editingZoneId);
    cancelZone();
}

// Р Р€Р Т‘Р В°Р В»Р ВµР Р…Р С‘Р Вµ Р В·Р С•Р Р…РЎвЂ№
function deleteZone(zoneId) {
    const index = appState.zones.findIndex(z => z.id === zoneId);
    if (index !== -1) {
        const zone = appState.zones[index];
        
        if (zone.vertexMarkers) {
            zone.vertexMarkers.forEach(marker => {
                if (appState.leafletMap) appState.leafletMap.removeLayer(marker);
            });
        }
        
        if (zone.midVertexMarkers) {
            zone.midVertexMarkers.forEach(marker => {
                if (appState.leafletMap) appState.leafletMap.removeLayer(marker);
            });
        }
        
        if (zone.layer && appState.leafletMap) {
            appState.leafletMap.removeLayer(zone.layer);
        }
        
        appState.zones.splice(index, 1);
        
        if (appState.selectedZoneId === zoneId) appState.selectedZoneId = null;
        
        updateZoneList();
        markMapAsChanged();
    }
}

// Р С›РЎвЂЎР С‘РЎРѓРЎвЂљР С”Р В° Р Р†РЎРѓР ВµРЎвЂ¦ Р В·Р С•Р Р…
function clearZones() {
    appState.zones.forEach(zone => {
        if (zone.vertexMarkers) {
            zone.vertexMarkers.forEach(marker => {
                if (appState.leafletMap) appState.leafletMap.removeLayer(marker);
            });
        }
        
        if (zone.midVertexMarkers) {
            zone.midVertexMarkers.forEach(marker => {
                if (appState.leafletMap) appState.leafletMap.removeLayer(marker);
            });
        }
        
        if (zone.layer && appState.leafletMap) {
            appState.leafletMap.removeLayer(zone.layer);
        }
    });
    
    appState.zones = [];
    appState.selectedZoneId = null;
    appState.zoneColorIndex = 0;
    appState.currentZoneColor = null;
    
    document.getElementById('zoneCount').textContent = 'Р С™Р С•Р В»Р С‘РЎвЂЎР ВµРЎРѓРЎвЂљР Р†Р С• Р В·Р С•Р Р…: 0';
    updateZoneList();
}

// Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘РЎРЏ Р С•Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…Р С‘РЎРЏ РЎРѓРЎвЂЎР ВµРЎвЂљРЎвЂЎР С‘Р С”Р В° РЎРЏРЎвЂЎР ВµР ВµР С”
function updateCellCount() {
    document.getElementById('cellCount').textContent = `Р С™Р С•Р В»Р С‘РЎвЂЎР ВµРЎРѓРЎвЂљР Р†Р С• РЎРЏРЎвЂЎР ВµР ВµР С”: ${appState.activeHexes.size}`;
}

// Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘РЎРЏ Р С—Р ВµРЎР‚Р ВµР С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р С‘РЎРЏ РЎРѓР С•РЎвЂљР С•Р Р†Р С•Р в„– РЎР‚Р В°Р В·Р СР ВµРЎвЂљР С”Р С‘
function toggleBuild(event) {
    if (event) event.stopPropagation();

    const networkToggle = document.getElementById('networkToggle');

    appState.buildEnabled = !appState.buildEnabled;
    const btn = document.getElementById('buildToggleInside');

    if (appState.buildEnabled) {
        btn.textContent = 'Р вЂ”Р В°Р Р†Р ВµРЎР‚РЎв‚¬Р С‘РЎвЂљРЎРЉ РЎР‚Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘Р Вµ';
        btn.classList.add('active');
        btn.style.background = '#4af';
        btn.style.color = '#000';
        disableButtonHover(btn);

        if (networkToggle) {
            networkToggle.checked = true;
            setNetworkSectionState(true);
        }

        // Р вЂўРЎРѓР В»Р С‘ РЎРѓР ВµРЎвЂљР С”Р В° Р С—РЎС“РЎРѓРЎвЂљР В°РЎРЏ РІР‚вЂќ РЎРѓРЎвЂљР В°Р Р†Р С‘Р С Р С—Р ВµРЎР‚Р Р†РЎС“РЎР‹ РЎРЏРЎвЂЎР ВµР в„–Р С”РЎС“ Р Р† РЎвЂ Р ВµР Р…РЎвЂљРЎР‚ РЎРЊР С”РЎР‚Р В°Р Р…Р В°
        if (appState.activeHexes.size === 0) {
            const center = getScreenCenterLatLng();
            appState.gridCenterLat = center.lat;
            appState.gridCenterLng = center.lng;

            appState.activeHexes.set("0,0", { q: 0, r: 0 });
        }

        // Р СџРЎР‚Р С‘Р Р…РЎС“Р Т‘Р С‘РЎвЂљР ВµР В»РЎРЉР Р…Р С• Р С•Р В±Р Р…Р С•Р Р†Р В»РЎРЏР ВµР С appState.possibleHexes Р С‘ РЎР‚Р С‘РЎРѓРЎС“Р ВµР С
        forceUpdatePossibleHexesAndDraw();
        markMapAsChanged();
    } else {
        btn.textContent = 'Р В Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ РЎР‚Р В°Р В·Р СР ВµРЎвЂљР С”РЎС“';
        btn.classList.remove('active');
        btn.style.background = '#2a3444';
        btn.style.color = '#ddd';
        enableButtonHover(btn);

        draw();
    }

    updateCursor();
    canvas.style.pointerEvents = (appState.buildEnabled || appState.moveGridEnabled) ? 'auto' : 'none';

    updateCellCount();
}

// Р РЋР С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ Р Р†РЎРѓРЎР‹ РЎРѓР С•РЎвЂљР С•Р Р†РЎС“РЎР‹ РЎР‚Р В°Р В·Р СР ВµРЎвЂљР С”РЎС“
function hideCellularGrid() {
    // Р С›РЎвЂЎР С‘РЎвЂ°Р В°Р ВµР С Р С”Р В°Р Р…Р Р†Р В°РЎРѓ (РЎР‚Р В°Р В·Р СР ВµРЎвЂљР С”Р В° РЎР‚Р С‘РЎРѓРЎС“Р ВµРЎвЂљРЎРѓРЎРЏ Р Р…Р В° Р С”Р В°Р Р…Р Р†Р В°РЎРѓР Вµ)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Р СџР С•Р С”Р В°Р В·Р В°РЎвЂљРЎРЉ РЎРѓР С•РЎвЂљР С•Р Р†РЎС“РЎР‹ РЎР‚Р В°Р В·Р СР ВµРЎвЂљР С”РЎС“
function showCellularGrid() {
    draw(); // Р СџР ВµРЎР‚Р ВµРЎР‚Р С‘РЎРѓР С•Р Р†РЎвЂ№Р Р†Р В°Р ВµР С Р С”Р В°Р Р…Р Р†Р В°РЎРѓ
}

// Р Р€Р С—РЎР‚Р В°Р Р†Р В»Р ВµР Р…Р С‘Р Вµ РЎРѓР С•РЎРѓРЎвЂљР С•РЎРЏР Р…Р С‘Р ВµР С РЎРЊР В»Р ВµР СР ВµР Р…РЎвЂљР С•Р Р† РЎР‚Р В°Р В·Р Т‘Р ВµР В»Р В° РЎРѓР С•РЎвЂљР С•Р Р†Р С•Р в„– РЎР‚Р В°Р В·Р СР ВµРЎвЂљР С”Р С‘
function setNetworkSectionState(enabled) {
    const networkSection = document.querySelector('.accordion-section:has(#networkToggle)');
    if (!networkSection) return;
    
    if (enabled) {
        networkSection.classList.remove('network-disabled');
    } else {
        networkSection.classList.add('network-disabled');
    }
}

// Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚Р С”Р В°, Р Р†Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р В° Р В»Р С‘ Р Р†Р С‘Р Т‘Р С‘Р СР С•РЎРѓРЎвЂљРЎРЉ РЎРѓР С•РЎвЂљР С•Р Р†Р С•Р в„– РЎР‚Р В°Р В·Р СР ВµРЎвЂљР С”Р С‘
function isCellularGridVisible() {
    const networkToggle = document.getElementById('networkToggle');
    return networkToggle ? networkToggle.checked : true; // Р С—Р С• РЎС“Р СР С•Р В»РЎвЂЎР В°Р Р…Р С‘РЎР‹ true Р ВµРЎРѓР В»Р С‘ Р С—Р ВµРЎР‚Р ВµР С”Р В»РЎР‹РЎвЂЎР В°РЎвЂљР ВµР В»РЎРЉ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…
}

// Р С›РЎРѓР Р…Р С•Р Р†Р Р…Р В°РЎРЏ РЎвЂћРЎС“Р Р…Р С”РЎвЂ Р С‘РЎРЏ Р С—Р ВµРЎР‚Р ВµР С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р С‘РЎРЏ РЎР‚Р ВµР В¶Р С‘Р СР В° Р вЂР РЋ
function toggleBSMode(event) {
    if (event) event.stopPropagation();
    
    const dialog = document.getElementById('markerDialog');
    if (dialog.classList.contains('active')) {
        cancelMarker();
        return;
    }
    
    if (appState.buildEnabled) {
        appState.buildEnabled = false;
        const buildBtn = document.getElementById('buildToggleInside');
        if (buildBtn) {
            buildBtn.textContent = 'Р вЂ™Р С”Р В»РЎР‹РЎвЂЎР С‘РЎвЂљРЎРЉ РЎР‚Р В°Р В·Р СР ВµРЎвЂљР С”РЎС“';
            buildBtn.classList.remove('active');
            buildBtn.style.background = '#2a3444';
            buildBtn.style.color = '#ddd';
        }
        appState.possibleHexes.clear();
        
    }
    
    if (appState.moveGridEnabled) {
        appState.moveGridEnabled = false;
        document.getElementById('moveGrid').checked = false;
        if (appState.leafletMap) {
            appState.leafletMap.dragging.enable();
            appState.leafletMap.scrollWheelZoom.enable();
        }
    }
    
    // Р вЂќР С›Р вЂР С’Р вЂ™Р вЂєР вЂўР СњР С›: Р С›РЎвЂљР С”Р В»РЎР‹РЎвЂЎР В°Р ВµР С РЎР‚Р ВµР В¶Р С‘Р С Р В·Р С•Р Р… Р ВµРЎРѓР В»Р С‘ Р С•Р Р… Р Р†Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…
    if (appState.zoneModeEnabled) {
        cancelPolygon();
        appState.zoneModeEnabled = false;
        appState.currentZoneColor = null;
        
        const zoneBtn = document.getElementById('createZoneBtn');
        zoneBtn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В·Р С•Р Р…РЎС“';
        zoneBtn.classList.remove('active');
        zoneBtn.style.background = '#2a3444';
        zoneBtn.style.color = '#ddd';
        zoneBtn.style.border = 'none';
        
        if (appState.leafletMap) {
            appState.leafletMap.dragging.enable();
            appState.leafletMap.off('click', onMapClickForZone);
            appState.leafletMap.off('mousemove', onMapMouseMoveForZone);
        }
        
    }
    
    if (appState.objectModeEnabled) {
        appState.objectModeEnabled = false;
        const objBtn = document.getElementById('createObjectBtn');
        objBtn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р С•Р В±РЎР‰Р ВµР С”РЎвЂљ';
        objBtn.classList.remove('active');
        objBtn.style.background = '#2a3444';
        objBtn.style.color = '#ddd';
        objBtn.style.border = 'none';
        removeTempObjectMarker();
        updateObjectList();
    }
    
    appState.bsModeEnabled = !appState.bsModeEnabled;
    
    const createBsBtn = document.getElementById('createBsBtn');
    if (createBsBtn) {
        if (appState.bsModeEnabled) {
            createBsBtn.textContent = 'Р С›РЎвЂљР СР ВµР Р…Р В°';
            createBsBtn.classList.add('active');
            createBsBtn.style.background = '#4af';
            createBsBtn.style.color = '#000';
            createBsBtn.style.border = 'none';
            disableButtonHover(createBsBtn);
        } else {
            createBsBtn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В±Р В°Р В·Р С•Р Р†РЎС“РЎР‹ РЎРѓРЎвЂљР В°Р Р…РЎвЂ Р С‘РЎР‹';
            createBsBtn.classList.remove('active');
            createBsBtn.style.background = '#2a3444';
            createBsBtn.style.color = '#ddd';
            createBsBtn.style.border = 'none';
            enableButtonHover(createBsBtn);
        }
    }
    
    updateCursor();
    
    if (appState.leafletMap) {
        if (appState.bsModeEnabled) {
            appState.leafletMap.dragging.enable();
            appState.leafletMap.scrollWheelZoom.enable();
            canvas.style.pointerEvents = 'auto';
            document.body.classList.add('bs-cursor');
        } else {
            canvas.style.pointerEvents = 'none';
            document.body.classList.remove('bs-cursor');
            if (!appState.moveGridEnabled) appState.leafletMap.dragging.enable();
        }
    }
    
    if (!appState.bsModeEnabled) {
        removeTempMarker();
        removePreviewCircle();
    }
    
    updateBsList();
    draw();
}

// Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘РЎРЏ Р С—Р ВµРЎР‚Р ВµР С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р С‘РЎРЏ РЎР‚Р ВµР В¶Р С‘Р СР В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С•Р В±РЎР‰Р ВµР С”РЎвЂљР С•Р Р†
function toggleObjectMode(event) {
    if (event) event.stopPropagation();
    
    const dialog = document.getElementById('objectDialog');
    if (dialog.classList.contains('active')) {
        cancelObject();
        return;
    }
    
    if (appState.buildEnabled) {
        appState.buildEnabled = false;
        const buildBtn = document.getElementById('buildToggleInside');
        if (buildBtn) {
            buildBtn.textContent = 'Р вЂ™Р С”Р В»РЎР‹РЎвЂЎР С‘РЎвЂљРЎРЉ РЎР‚Р В°Р В·Р СР ВµРЎвЂљР С”РЎС“';
            buildBtn.classList.remove('active');
            buildBtn.style.background = '#2a3444';
            buildBtn.style.color = '#ddd';
        }
        appState.possibleHexes.clear();
        
    }
    
    if (appState.bsModeEnabled) {
        appState.bsModeEnabled = false;
        const createBsBtn = document.getElementById('createBsBtn');
        if (createBsBtn) {
            createBsBtn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В±Р В°Р В·Р С•Р Р†РЎС“РЎР‹ РЎРѓРЎвЂљР В°Р Р…РЎвЂ Р С‘РЎР‹';
            createBsBtn.classList.remove('active');
            createBsBtn.style.background = '#2a3444';
            createBsBtn.style.color = '#ddd';
            createBsBtn.style.border = 'none';
            enableButtonHover(createBsBtn);
        }
        document.getElementById('bsToggle').classList.remove('active');
        removeTempMarker();
        removePreviewCircle();
    }
    
    if (appState.moveGridEnabled) {
        appState.moveGridEnabled = false;
        document.getElementById('moveGrid').checked = false;
        if (appState.leafletMap) {
            appState.leafletMap.dragging.enable();
            appState.leafletMap.scrollWheelZoom.enable();
        }
    }
    
    // Р вЂќР С›Р вЂР С’Р вЂ™Р вЂєР вЂўР СњР С›: Р С›РЎвЂљР С”Р В»РЎР‹РЎвЂЎР В°Р ВµР С РЎР‚Р ВµР В¶Р С‘Р С Р В·Р С•Р Р… Р ВµРЎРѓР В»Р С‘ Р С•Р Р… Р Р†Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…
    if (appState.zoneModeEnabled) {
        cancelPolygon();
        appState.zoneModeEnabled = false;
        appState.currentZoneColor = null;
        
        const zoneBtn = document.getElementById('createZoneBtn');
        zoneBtn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В·Р С•Р Р…РЎС“';
        zoneBtn.classList.remove('active');
        zoneBtn.style.background = '#2a3444';
        zoneBtn.style.color = '#ddd';
        zoneBtn.style.border = 'none';
        
        if (appState.leafletMap) {
            appState.leafletMap.dragging.enable();
            appState.leafletMap.off('click', onMapClickForZone);
            appState.leafletMap.off('mousemove', onMapMouseMoveForZone);
        }
        
    }
    
    appState.objectModeEnabled = !appState.objectModeEnabled;
    const btn = document.getElementById('createObjectBtn');
    
    if (appState.objectModeEnabled) {
        btn.textContent = 'Р С›РЎвЂљР СР ВµР Р…Р В°';
        btn.classList.add('active');
        btn.style.background = '#4af';
        btn.style.color = '#000';
        btn.style.border = 'none';
        disableButtonHover(btn);
        
        canvas.style.pointerEvents = 'auto';
        canvas.style.cursor = 'crosshair';
        document.body.classList.add('bs-cursor');
        
        if (appState.leafletMap) {
            appState.leafletMap.dragging.enable();
            appState.leafletMap.scrollWheelZoom.enable();
        }
    } else {
        btn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р С•Р В±РЎР‰Р ВµР С”РЎвЂљ';
        btn.classList.remove('active');
        btn.style.background = '#2a3444';
        btn.style.color = '#ddd';
        btn.style.border = 'none';
        enableButtonHover(btn);
        
        canvas.style.pointerEvents = 'none';
        canvas.style.cursor = 'default';
        document.body.classList.remove('bs-cursor');
        removeTempObjectMarker();
        
        if (appState.leafletMap && !appState.moveGridEnabled && !appState.buildEnabled && !appState.bsModeEnabled) {
            appState.leafletMap.dragging.enable();
            appState.leafletMap.scrollWheelZoom.enable();
        }
    }
    
    updateObjectList();
    draw();
}

// Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘Р С‘ Р Т‘Р В»РЎРЏ РЎР‚Р В°Р В±Р С•РЎвЂљРЎвЂ№ РЎРѓ Р С•Р В±РЎР‰Р ВµР С”РЎвЂљР В°Р СР С‘
function createTempObjectMarker(lat, lng) {
    if (!appState.leafletMap) return null;
    removeTempObjectMarker();
    const markerHtml = document.createElement('div');
    markerHtml.className = 'object-marker temp';
    markerHtml.title = 'Р СњР С•Р Р†РЎвЂ№Р в„– Р С•Р В±РЎР‰Р ВµР С”РЎвЂљ';
    appState.tempObjectMarker = L.marker([lat, lng], {
        icon: L.divIcon({ html: markerHtml.outerHTML, iconSize: [22, 22], iconAnchor: [11, 11], className: 'object-marker-icon' }),
        draggable: false
    }).addTo(appState.leafletMap);
    return appState.tempObjectMarker;
}

function removeTempObjectMarker() {
    if (appState.tempObjectMarker && appState.leafletMap) {
        appState.leafletMap.removeLayer(appState.tempObjectMarker);
        appState.tempObjectMarker = null;
    }
}

function importObjects() {
    alert('Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘РЎРЏ Р С‘Р СР С—Р С•РЎР‚РЎвЂљР В° Р С•Р В±РЎР‰Р ВµР С”РЎвЂљР С•Р Р† Р Р† РЎР‚Р В°Р В·РЎР‚Р В°Р В±Р С•РЎвЂљР С”Р Вµ');
}

function createObjectMarker(lat, lng, name = '', comment = '', id = null, deviceCount = 0, meterPointCount = 0) {
    if (!appState.leafletMap) return null;
    
    const markerHtml = document.createElement('div');
    markerHtml.className = 'object-marker';
    markerHtml.title = name || 'Р С›Р В±РЎР‰Р ВµР С”РЎвЂљ';
    
    const marker = L.marker([lat, lng], {
        icon: L.divIcon({ html: markerHtml.outerHTML, iconSize: [22, 22], iconAnchor: [11, 11], className: 'object-marker-icon' }),
        draggable: true
    }).addTo(appState.leafletMap);
    
    marker.on('dragstart', function(e) {
        appState.isDraggingObject = true;
        appState.draggedObjectId = id;
        const iconElement = marker.getElement();
        if (iconElement) iconElement.classList.add('dragging');
        marker.closePopup();
        appState.selectedObjectId = null;
        updateObjectList();
    });
    
    marker.on('dragend', function(e) {
        appState.isDraggingObject = false;
        appState.draggedObjectId = null;
        const iconElement = marker.getElement();
        if (iconElement) iconElement.classList.remove('dragging');
        
        const markerIndex = appState.leafletObjectMarkers.findIndex(m => m.id === id);
        if (markerIndex !== -1) {
            const newLatLng = e.target.getLatLng();
            appState.leafletObjectMarkers[markerIndex].lat = newLatLng.lat;
            appState.leafletObjectMarkers[markerIndex].lng = newLatLng.lng;
            
            const objectIndex = appState.objects.findIndex(m => m.id === id);
            if (objectIndex !== -1) {
                appState.objects[objectIndex].lat = newLatLng.lat;
                appState.objects[objectIndex].lng = newLatLng.lng;
                markMapAsChanged();
            }
        }
    });
    
    const popupContent = document.createElement('div');
    
    const title = document.createElement('div');
    title.className = 'marker-popup-title';
    title.textContent = name || 'Р С›Р В±РЎР‰Р ВµР С”РЎвЂљ';
    popupContent.appendChild(title);
    
    if (comment) {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'marker-popup-comment';
        commentDiv.textContent = comment;
        popupContent.appendChild(commentDiv);
    }
    
    const deviceInfo = document.createElement('div');
    deviceInfo.className = 'marker-popup-comment';
    deviceInfo.innerHTML = `Р СџРЎР‚Р С‘Р В±Р С•РЎР‚Р С•Р Р† РЎС“РЎвЂЎР ВµРЎвЂљР В°: ${deviceCount}<br>Р СћР С•РЎвЂЎР ВµР С” РЎС“РЎвЂЎР ВµРЎвЂљР В°: ${meterPointCount}`;
    deviceInfo.style.color = '#4af';
    deviceInfo.style.marginTop = '6px';
    popupContent.appendChild(deviceInfo);
    
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'popup-buttons';
    buttonsDiv.innerHTML = `
        <button data-click="editObject(${id})">Р В Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ</button>
        <button data-click="deleteObjectById(${id})" style="background:#ff4444;color:white;">Р Р€Р Т‘Р В°Р В»Р С‘РЎвЂљРЎРЉ</button>
    `;
    popupContent.appendChild(buttonsDiv);
    
    marker.bindPopup(popupContent);
    
    marker.on('popupopen', function() {
        if (appState.leafletMap) appState.leafletMap.dragging.enable();
    });
    
    return { 
        marker, id: id || Date.now(), lat, lng, name, comment,
        deviceCount: deviceCount || 0, meterPointCount: meterPointCount || 0
    };
}

function editObject(objectId) {
    const markerIndex = appState.leafletObjectMarkers.findIndex(m => m.id === objectId);
    if (markerIndex !== -1) appState.leafletObjectMarkers[markerIndex].marker.closePopup();
    
    const objectIndex = appState.objects.findIndex(m => m.id === objectId);
    if (objectIndex === -1) return;
    
    const obj = appState.objects[objectIndex];
    appState.editingObjectId = objectId;
    
    appState.originalObjectValues = {
        lat: obj.lat, lng: obj.lng, name: obj.name, comment: obj.comment,
        deviceCount: obj.deviceCount || 0, meterPointCount: obj.meterPointCount || 0
    };
    
    document.getElementById('objectName').value = obj.name || '';
    document.getElementById('objectComment').value = obj.comment || '';
    document.getElementById('deviceCount').value = obj.deviceCount || 0;
    document.getElementById('meterPointCount').value = obj.meterPointCount || 0;
    
    document.getElementById('deleteObjectBtn').style.display = 'block';
    
    const objPx = appState.leafletMap.latLngToContainerPoint([obj.lat, obj.lng]);
    positionObjectDialogNearMarker(objPx.x, objPx.y);
    
    showObjectDialog(true);
}

function deleteObjectById(objectId) {
    const objectIndex = appState.objects.findIndex(m => m.id === objectId);
    if (objectIndex === -1) return;
    
    const leafletMarkerIndex = appState.leafletObjectMarkers.findIndex(m => m.id === objectId);
    if (leafletMarkerIndex !== -1) {
        const leafletMarker = appState.leafletObjectMarkers[leafletMarkerIndex];
        if (leafletMarker.marker && appState.leafletMap) appState.leafletMap.removeLayer(leafletMarker.marker);
        appState.leafletObjectMarkers.splice(leafletMarkerIndex, 1);
    }
    
    appState.objects.splice(objectIndex, 1);
    
    if (appState.selectedObjectId === objectId) appState.selectedObjectId = null;
    if (appState.editingObjectId === objectId) hideObjectDialog();
    
    updateObjectList();
    markMapAsChanged();
}

function deleteObject() {
    if (!appState.editingObjectId) return;
    deleteObjectById(appState.editingObjectId);
    hideObjectDialog();
}

function showObjectDialog(isEditing = false) {
    document.getElementById('objectDialog').classList.add('active');
    
    if (isEditing) {
        document.getElementById('deleteObjectBtn').style.display = 'block';
    } else {
        const nextNumber = getNextObjectNumber();
        const defaultName = `Р С›Р В±РЎР‰Р ВµР С”РЎвЂљ ${nextNumber}`;
        document.getElementById('objectName').value = defaultName;
        document.getElementById('objectName').placeholder = defaultName;
        document.getElementById('objectComment').value = '';
        document.getElementById('deviceCount').value = 0;
        document.getElementById('meterPointCount').value = 0;
        document.getElementById('deleteObjectBtn').style.display = 'none';
    }
    
    document.getElementById('objectName').focus();
}

function hideObjectDialog() {
    document.getElementById('objectDialog').classList.remove('active');
    if (!appState.editingObjectId) appState.currentObjectData = null;
    appState.editingObjectId = null;
    appState.originalObjectValues = null;
    
    if (appState.objectModeEnabled) {
        canvas.style.cursor = 'crosshair';
        canvas.style.pointerEvents = 'auto';
    }
}

function positionObjectDialogNearMarker(x, y) {
    const dialog = document.getElementById('objectDialog');
    const rect = canvas.getBoundingClientRect();
    const dialogWidth = 300, dialogHeight = 380;
    
    let left = rect.left + x + 20;
    let top = rect.top + y;
    
    if (left + dialogWidth > window.innerWidth) left = rect.left + x - dialogWidth - 20;
    if (top + dialogHeight > window.innerHeight) top = rect.top + y - dialogHeight;
    
    dialog.style.left = left + 'px';
    dialog.style.top = top + 'px';
}

function saveObject() {
    const nameInput = document.getElementById('objectName');
    let name = nameInput.value.trim();
    const comment = document.getElementById('objectComment').value.trim();
    const deviceCount = parseInt(document.getElementById('deviceCount').value) || 0;
    const meterPointCount = parseInt(document.getElementById('meterPointCount').value) || 0;
    
    if (!name) {
        const nextNumber = getNextObjectNumber();
        name = `Р С›Р В±РЎР‰Р ВµР С”РЎвЂљ ${nextNumber}`;
        nameInput.value = name;
    }
    
    if (appState.editingObjectId) {
        const objectIndex = appState.objects.findIndex(m => m.id === appState.editingObjectId);
        if (objectIndex !== -1) {
            appState.objects[objectIndex].name = name;
            appState.objects[objectIndex].comment = comment;
            appState.objects[objectIndex].deviceCount = deviceCount;
            appState.objects[objectIndex].meterPointCount = meterPointCount;
            
            const leafletMarkerIndex = appState.leafletObjectMarkers.findIndex(m => m.id === appState.editingObjectId);
            if (leafletMarkerIndex !== -1) {
                appState.leafletObjectMarkers[leafletMarkerIndex].name = name;
                appState.leafletObjectMarkers[leafletMarkerIndex].comment = comment;
                appState.leafletObjectMarkers[leafletMarkerIndex].deviceCount = deviceCount;
                appState.leafletObjectMarkers[leafletMarkerIndex].meterPointCount = meterPointCount;
                updateObjectPopup(appState.leafletObjectMarkers[leafletMarkerIndex]);
            }
            
            updateObjectList();
            markMapAsChanged();
        }
    } else if (appState.currentObjectData) {
        const objectId = Date.now();
        let finalName = name;
        if (!finalName || finalName.trim() === '') {
            finalName = `Р С›Р В±РЎР‰Р ВµР С”РЎвЂљ ${getNextObjectNumber()}`;
        }
        
        const obj = {
            id: objectId, lat: appState.currentObjectData.lat, lng: appState.currentObjectData.lng,
            name: finalName, comment: comment,
            deviceCount: deviceCount, meterPointCount: meterPointCount
        };
        
        appState.objects.push(obj);
        
        const leafletMarker = createObjectMarker(obj.lat, obj.lng, obj.name, obj.comment, objectId, obj.deviceCount, obj.meterPointCount);
        if (leafletMarker) appState.leafletObjectMarkers.push(leafletMarker);
        
        updateObjectList();
        markMapAsChanged();
    }
    
    appState.originalObjectValues = null;
    hideObjectDialog();
    
    if (!appState.editingObjectId && appState.objectModeEnabled) {
        appState.objectModeEnabled = false;
        const btn = document.getElementById('createObjectBtn');
        btn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р С•Р В±РЎР‰Р ВµР С”РЎвЂљ';
        btn.classList.remove('active');
        btn.style.background = '#2a3444';
        btn.style.color = '#ddd';
        btn.style.border = 'none';
        // Р вЂ™Р С•Р В·Р Р†РЎР‚Р В°РЎвЂ°Р В°Р ВµР С РЎРЊРЎвЂћРЎвЂћР ВµР С”РЎвЂљРЎвЂ№ Р С—РЎР‚Р С‘ Р Р…Р В°Р Р†Р ВµР Т‘Р ВµР Р…Р С‘Р С‘
        enableButtonHover(btn);
        
        updateCursor();
        removeTempObjectMarker();
        
        if (appState.leafletMap && !appState.moveGridEnabled && !appState.buildEnabled && !appState.bsModeEnabled) {
            appState.leafletMap.dragging.enable();
            appState.leafletMap.scrollWheelZoom.enable();
        }
        
        canvas.style.pointerEvents = 'none';
        document.body.classList.remove('bs-cursor');
    }
}

function cancelObject() {
    if (appState.editingObjectId && appState.originalObjectValues) {
        const objectIndex = appState.objects.findIndex(m => m.id === appState.editingObjectId);
        if (objectIndex !== -1) {
            const leafletMarkerIndex = appState.leafletObjectMarkers.findIndex(m => m.id === appState.editingObjectId);
            if (leafletMarkerIndex !== -1) {
                appState.leafletObjectMarkers[leafletMarkerIndex].name = appState.originalObjectValues.name;
                appState.leafletObjectMarkers[leafletMarkerIndex].comment = appState.originalObjectValues.comment;
                appState.leafletObjectMarkers[leafletMarkerIndex].deviceCount = appState.originalObjectValues.deviceCount;
                appState.leafletObjectMarkers[leafletMarkerIndex].meterPointCount = appState.originalObjectValues.meterPointCount;
                updateObjectPopup(appState.leafletObjectMarkers[leafletMarkerIndex]);
            }
            appState.objects[objectIndex].name = appState.originalObjectValues.name;
            appState.objects[objectIndex].comment = appState.originalObjectValues.comment;
            appState.objects[objectIndex].deviceCount = appState.originalObjectValues.deviceCount;
            appState.objects[objectIndex].meterPointCount = appState.originalObjectValues.meterPointCount;
        }
    }
    
    appState.originalObjectValues = null;
    hideObjectDialog();
    
    // Р СџР С•РЎРѓР В»Р Вµ Р С•РЎвЂљР СР ВµР Р…РЎвЂ№ Р Р†РЎвЂ№Р С”Р В»РЎР‹РЎвЂЎР В°Р ВµР С РЎР‚Р ВµР В¶Р С‘Р С РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С•Р В±РЎР‰Р ВµР С”РЎвЂљР С•Р Р†
    if (!appState.editingObjectId && appState.objectModeEnabled) {
        appState.objectModeEnabled = false;
        const btn = document.getElementById('createObjectBtn');
        btn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р С•Р В±РЎР‰Р ВµР С”РЎвЂљ';
        btn.classList.remove('active');
        btn.style.background = '#2a3444';
        btn.style.color = '#ddd';
        btn.style.border = 'none';
        // Р вЂ™Р С•Р В·Р Р†РЎР‚Р В°РЎвЂ°Р В°Р ВµР С РЎРЊРЎвЂћРЎвЂћР ВµР С”РЎвЂљРЎвЂ№ Р С—РЎР‚Р С‘ Р Р…Р В°Р Р†Р ВµР Т‘Р ВµР Р…Р С‘Р С‘
        enableButtonHover(btn);
        
        updateCursor();
        removeTempObjectMarker();
        
        if (appState.leafletMap && !appState.moveGridEnabled && !appState.buildEnabled && !appState.bsModeEnabled) {
            appState.leafletMap.dragging.enable();
            appState.leafletMap.scrollWheelZoom.enable();
        }
        
        canvas.style.pointerEvents = 'none';
        document.body.classList.remove('bs-cursor');
    }
}

function updateObjectPopup(markerData) {
    if (!markerData.marker) return;
    
    const popupContent = document.createElement('div');
    
    const title = document.createElement('div');
    title.className = 'marker-popup-title';
    title.textContent = markerData.name || 'Р С›Р В±РЎР‰Р ВµР С”РЎвЂљ';
    popupContent.appendChild(title);
    
    if (markerData.comment) {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'marker-popup-comment';
        commentDiv.textContent = markerData.comment;
        popupContent.appendChild(commentDiv);
    }
    
    const deviceInfo = document.createElement('div');
    deviceInfo.className = 'marker-popup-comment';
    deviceInfo.innerHTML = `Р СџРЎР‚Р С‘Р В±Р С•РЎР‚Р С•Р Р† РЎС“РЎвЂЎР ВµРЎвЂљР В°: ${markerData.deviceCount}<br>Р СћР С•РЎвЂЎР ВµР С” РЎС“РЎвЂЎР ВµРЎвЂљР В°: ${markerData.meterPointCount}`;
    deviceInfo.style.color = '#4af';
    deviceInfo.style.marginTop = '6px';
    popupContent.appendChild(deviceInfo);
    
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'popup-buttons';
    buttonsDiv.innerHTML = `
        <button data-click="editObject(${markerData.id})">Р В Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ</button>
        <button data-click="deleteObjectById(${markerData.id})" style="background:#ff4444;color:white;">Р Р€Р Т‘Р В°Р В»Р С‘РЎвЂљРЎРЉ</button>
    `;
    popupContent.appendChild(buttonsDiv);
    
    markerData.marker.bindPopup(popupContent);
}

function updateObjectList() {
    const objectCountEl = document.getElementById('objectCount');
    const objectListEl = document.getElementById('objectList');
    
    objectCountEl.textContent = `Р С™Р С•Р В»Р С‘РЎвЂЎР ВµРЎРѓРЎвЂљР Р†Р С• Р С•Р В±РЎР‰Р ВµР С”РЎвЂљР С•Р Р†: ${appState.objects.length}`;
    
    if (appState.objects.length === 0) {
        objectListEl.style.display = 'none';
        return;
    }
    
    objectListEl.style.display = 'block';
    objectListEl.innerHTML = '';
    
    appState.objects.forEach((obj, index) => {
        const listItem = document.createElement('div');
        listItem.className = 'bs-list-item';
        listItem.dataset.id = obj.id;
        if (appState.selectedObjectId === obj.id) listItem.classList.add('active');
        
        const nameSpan = document.createElement('div');
        nameSpan.className = 'bs-list-item-name';
        nameSpan.textContent = obj.name || `Р С›Р В±РЎР‰Р ВµР С”РЎвЂљ ${index + 1}`;
        
        const infoSpan = document.createElement('div');
        infoSpan.className = 'bs-list-item-info';
        if (obj.comment && obj.comment.trim()) {
            const comment = obj.comment.trim();
            infoSpan.textContent = comment.length > 20 ? comment.substring(0, 20) + '...' : comment;
            infoSpan.title = comment;
            infoSpan.style.color = '#aaa';
        } else {
            infoSpan.textContent = '';
        }
        
        const deviceInfo = document.createElement('div');
        deviceInfo.className = 'bs-list-item-info';
        deviceInfo.textContent = `СЂСџвЂњР‰ ${obj.deviceCount || 0}/${obj.meterPointCount || 0}`;
        deviceInfo.style.color = '#4af';
        deviceInfo.style.marginLeft = '4px';
        
        const editBtn = document.createElement('button');
        editBtn.innerHTML = 'РІСљРЏРїС‘РЏ';
        editBtn.style.cssText = 'background:transparent; border:none; color:#aaa; cursor:pointer; font-size:12px; padding:2px 6px; margin-left:4px; opacity:0.7; transition:opacity 0.2s;';
        editBtn.addEventListener('click', (e) => { e.stopPropagation(); editObject(obj.id); });
        editBtn.addEventListener('mouseover', function() { this.style.opacity = '1'; });
        editBtn.addEventListener('mouseout', function() { this.style.opacity = '0.7'; });
        
        listItem.appendChild(nameSpan);
        listItem.appendChild(infoSpan);
        listItem.appendChild(deviceInfo);
        listItem.appendChild(editBtn);
        
        listItem.addEventListener('click', function(e) {
            if (e.target !== editBtn && !editBtn.contains(e.target)) selectObject(obj.id);
        });
        
        objectListEl.appendChild(listItem);
    });
}

function selectObject(objectId) {
    appState.selectedObjectId = objectId;
    const markerIndex = appState.leafletObjectMarkers.findIndex(m => m.id === objectId);
    if (markerIndex !== -1 && appState.leafletMap) {
        const marker = appState.leafletObjectMarkers[markerIndex];
        appState.leafletMap.setView([marker.lat, marker.lng], appState.leafletMap.getZoom());
        marker.marker.openPopup();
        updateObjectList();
    }
}

function clearObjects() {
    appState.leafletObjectMarkers.forEach(markerData => {
        if (markerData.marker && appState.leafletMap) appState.leafletMap.removeLayer(markerData.marker);
    });
    appState.objects = [];
    appState.leafletObjectMarkers = [];
    appState.selectedObjectId = null;
    updateObjectList();
    markMapAsChanged();
}

function createObject() {
    toggleObjectMode();
}

// Р С›Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…Р С‘Р Вµ Р С”Р Р…Р С•Р С—Р С”Р С‘ Р Р† РЎР‚Р В°Р В·Р Т‘Р ВµР В»Р Вµ Р В¤Р В°Р в„–Р В»
function updateFileToggleButton() {
    const fileToggle = document.getElementById('fileToggle');
    const hasDataToSave = appState.bsMarkers.length > 0 || appState.activeHexes.size > 0 || appState.zones.length > 0 || appState.objects.length > 0;
    fileToggle.textContent = hasDataToSave ? 'Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…Р С‘РЎвЂљРЎРЉ' : 'Р С›РЎвЂљР С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ';
    fileToggle.classList.toggle('changed', hasDataToSave);
}

function markMapAsChanged() {
    updateFileToggleButton();
}

function resetMapChanged() {
    updateFileToggleButton();
}

// Р С›Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…Р С‘Р Вµ РЎРѓР С—Р С‘РЎРѓР С”Р В° Р вЂР РЋ
function updateBsList() {
    const bsCountElement = document.getElementById('bsCount');
    const bsListElement = document.getElementById('bsList');
    const bsEmptyMessage = document.getElementById('bsEmptyMessage');
    
    bsCountElement.textContent = `Р вЂР В°Р В·Р С•Р Р†РЎвЂ№РЎвЂ¦ РЎРѓРЎвЂљР В°Р Р…РЎвЂ Р С‘Р в„–: ${appState.bsMarkers.length}`;
    
    if (appState.bsMarkers.length === 0) {
        bsListElement.style.display = 'none';
        bsEmptyMessage.style.display = 'none';
    } else {
        bsListElement.style.display = 'block';
        bsEmptyMessage.style.display = 'none';
        bsListElement.innerHTML = '';
        
        appState.bsMarkers.forEach((marker, index) => {
            const listItem = document.createElement('div');
            listItem.className = 'bs-list-item';
            if (appState.selectedBsId === marker.id) listItem.classList.add('active');
            listItem.dataset.id = marker.id;
            
            const nameSpan = document.createElement('div');
            nameSpan.className = 'bs-list-item-name';
            nameSpan.textContent = marker.name || `Р вЂР В°Р В·Р С•Р Р†Р В°РЎРЏ РЎРѓРЎвЂљР В°Р Р…РЎвЂ Р С‘РЎРЏ ${index + 1}`;
            
            const infoSpan = document.createElement('div');
            infoSpan.className = 'bs-list-item-info';
            if (marker.comment && marker.comment.trim()) {
                const comment = marker.comment.trim();
                infoSpan.textContent = comment.length > 20 ? comment.substring(0, 20) + '...' : comment;
                infoSpan.title = comment;
                infoSpan.style.color = '#aaa';
            } else {
                infoSpan.textContent = '';
            }
            
            const editBtn = document.createElement('button');
            editBtn.innerHTML = 'РІСљРЏРїС‘РЏ';
            editBtn.style.cssText = 'background:transparent; border:none; color:#aaa; cursor:pointer; font-size:12px; padding:2px 6px; margin-left:4px; opacity:0.7; transition:opacity 0.2s;';
            editBtn.addEventListener('click', (e) => { e.stopPropagation(); editMarker(marker.id); });
            editBtn.addEventListener('mouseover', function() { this.style.opacity = '1'; });
            editBtn.addEventListener('mouseout', function() { this.style.opacity = '0.7'; });
            
            listItem.appendChild(nameSpan);
            listItem.appendChild(infoSpan);
            listItem.appendChild(editBtn);
            
            listItem.addEventListener('click', function(e) {
                if (e.target !== editBtn && !editBtn.contains(e.target)) selectBsInList(marker.id);
            });
            
            bsListElement.appendChild(listItem);
        });
    }
}

function selectBsInList(bsId) {
    appState.selectedBsId = bsId;
    const markerIndex = appState.leafletMarkers.findIndex(m => m.id === bsId);
    if (markerIndex !== -1 && appState.leafletMap) {
        const marker = appState.leafletMarkers[markerIndex];
        appState.leafletMap.setView([marker.lat, marker.lng], appState.leafletMap.getZoom());
        marker.marker.openPopup();
        updateBsList();
    }
}

// Р вЂњР ВµР С•Р СР ВµРЎвЂљРЎР‚Р С‘РЎвЂЎР ВµРЎРѓР С”Р С‘Р Вµ РЎвЂћРЎС“Р Р…Р С”РЎвЂ Р С‘Р С‘
function getRadiusInPixels() {
    if (!appState.leafletMap) return appState.radiusMeters;
    let centerLat, centerLng;
    if (appState.gridCenterLat !== null && appState.gridCenterLng !== null) {
        centerLat = appState.gridCenterLat;
        centerLng = appState.gridCenterLng;
    } else {
        const mapCenter = appState.leafletMap.getCenter();
        centerLat = mapCenter.lat;
        centerLng = mapCenter.lng;
    }
    const centerPx = appState.leafletMap.latLngToContainerPoint([centerLat, centerLng]);
    const eastPoint = L.latLng(centerLat, centerLng + metersToLngDegrees(centerLat, appState.radiusMeters));
    const eastPx = appState.leafletMap.latLngToContainerPoint(eastPoint);
    return Math.abs(eastPx.x - centerPx.x);
}

function getGridCenterInPixels() {
    if (appState.leafletMap) {
        if (appState.gridCenterLat !== null && appState.gridCenterLng !== null) {
            return appState.leafletMap.latLngToContainerPoint([appState.gridCenterLat, appState.gridCenterLng]);
        } else {
            const center = appState.leafletMap.getCenter();
            return appState.leafletMap.latLngToContainerPoint([center.lat, center.lng]);
        }
    } else {
        return { x: canvas.width / 2, y: canvas.height / 2 };
    }
}

function getRotationCenter() { return { x: 0, y: 0 }; }

function hexToRelativeCoords(q, r) {
    return getHexRelativeCoords(q, r, getRadiusInPixels());
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    if (appState.bsModeEnabled || appState.objectModeEnabled) {
        canvas.style.pointerEvents = 'auto';
        canvas.style.cursor = 'crosshair';
        document.body.classList.add('bs-cursor');
    } else if (appState.buildEnabled || appState.moveGridEnabled) {
        canvas.style.pointerEvents = 'auto';
        canvas.style.cursor = appState.buildEnabled ? 'pointer' : 'move';
        document.body.classList.remove('bs-cursor');
    } else {
        canvas.style.pointerEvents = 'none';
        canvas.style.cursor = 'default';
        document.body.classList.remove('bs-cursor');
    }
    
    // Р СџР ВµРЎР‚Р ВµРЎР‚Р С‘РЎРѓР С•Р Р†РЎвЂ№Р Р†Р В°Р ВµР С РЎвЂљР С•Р В»РЎРЉР С”Р С• Р ВµРЎРѓР В»Р С‘ Р Р†Р С‘Р Т‘Р С‘Р СР С•РЎРѓРЎвЂљРЎРЉ Р Р†Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р В°
    if (isCellularGridVisible()) {
        draw();
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function parseNum(str, fallback = 0) {
    if (!str.trim()) return fallback;
    const cleaned = str.trim().replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? fallback : num;
}

function validateRadiusInput(value) {
    const num = parseInt(value);
    if (isNaN(num)) return false;
    return num >= CONFIG.MIN_RADIUS && num <= CONFIG.MAX_RADIUS;
}

function applyRadius() {
    const slider = document.getElementById('radiusSlider');
    const text = document.getElementById('radiusText');
    
    if (text.value !== slider.value) {
        if (!validateRadiusInput(text.value)) {
            alert(`Р В Р В°Р Т‘Р С‘РЎС“РЎРѓ Р Т‘Р С•Р В»Р В¶Р ВµР Р… Р В±РЎвЂ№РЎвЂљРЎРЉ Р С•РЎвЂљ ${CONFIG.MIN_RADIUS} Р Т‘Р С• ${CONFIG.MAX_RADIUS} Р СР ВµРЎвЂљРЎР‚Р С•Р Р†`);
            text.value = appState.radiusMeters;
            return;
        }
        appState.radiusMeters = parseNum(text.value, appState.radiusMeters);
    } else {
        appState.radiusMeters = parseFloat(slider.value) || appState.radiusMeters;
    }
    
    appState.radiusMeters = Math.max(CONFIG.MIN_RADIUS, Math.min(CONFIG.MAX_RADIUS, appState.radiusMeters));
    slider.value = appState.radiusMeters;
    text.value = Math.round(appState.radiusMeters * 100) / 100;
    
    if (appState.buildEnabled && appState.activeHexes.size > 0) updatePossibleHexes();
    draw();
}

function applyRotation() {
    const slider = document.getElementById('rotSlider');
    const text = document.getElementById('rotText');
    
    if (text.value !== slider.value) {
        appState.rotation = parseNum(text.value, appState.rotation);
    } else {
        appState.rotation = parseFloat(slider.value) || appState.rotation;
    }
    
    while (appState.rotation < -180) appState.rotation += 360;
    while (appState.rotation > 180) appState.rotation -= 360;
    
    slider.value = appState.rotation;
    text.value = Math.round(appState.rotation * 100) / 100;
    draw();
}

// Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘Р С‘ Р Т‘Р В»РЎРЏ РЎР‚Р В°Р В±Р С•РЎвЂљРЎвЂ№ РЎРѓ РЎРѓР ВµРЎвЂљР С”Р С•Р в„–
function getHexNeighbors(q, r) {
    return hexDirections.map(dir => ({ q: q + dir.q, r: r + dir.r }));
}

function updatePossibleHexes() {
    if (!appState.buildEnabled || appState.activeHexes.size === 0) {
        appState.possibleHexes.clear();
        return;
    }
    appState.possibleHexes.clear();
    for (const hex of appState.activeHexes.values()) {
        const neighbors = getHexNeighbors(hex.q, hex.r);
        for (const neighbor of neighbors) {
            const key = `${neighbor.q},${neighbor.r}`;
            if (!appState.activeHexes.has(key) && !appState.possibleHexes.has(key)) {
                appState.possibleHexes.set(key, neighbor);
            }
        }
    }
}

function getHexScreenPosition(q, r) {
    const gridCenterPx = getGridCenterInPixels();
    const relativeCoords = hexToRelativeCoords(q, r);
    const rotationCenter = getRotationCenter();
    
    let x = gridCenterPx.x + relativeCoords.x;
    let y = gridCenterPx.y + relativeCoords.y;
    
    if (appState.rotation !== 0) {
        const centerX = gridCenterPx.x + rotationCenter.x;
        const centerY = gridCenterPx.y + rotationCenter.y;
        const rotated = rotatePointAroundCenter(x, y, centerX, centerY, appState.rotation);
        x = rotated.x;
        y = rotated.y;
    }
    
    return { x, y, radius: relativeCoords.radius };
}

function isPointInHexagon(px, py, hexX, hexY, hexRadius) {
    const gridCenterPx = getGridCenterInPixels();
    const rotationCenter = getRotationCenter();
    
    if (appState.rotation !== 0) {
        const centerX = gridCenterPx.x + rotationCenter.x;
        const centerY = gridCenterPx.y + rotationCenter.y;
        const unrotatedPoint = rotatePointAroundCenter(px, py, centerX, centerY, -appState.rotation);
        px = unrotatedPoint.x;
        py = unrotatedPoint.y;
        const unrotatedCenter = rotatePointAroundCenter(hexX, hexY, centerX, centerY, -appState.rotation);
        hexX = unrotatedCenter.x;
        hexY = unrotatedCenter.y;
    }
    
    const dx = px - hexX;
    const dy = py - hexY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > hexRadius) return false;
    
    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += 2 * Math.PI;
    const segmentAngle = Math.PI / 3;
    const segment = Math.floor(angle / segmentAngle);
    const segmentStart = segment * segmentAngle;
    const angleInSegment = angle - segmentStart;
    const maxDistance = hexRadius * Math.cos(segmentAngle / 2 - angleInSegment) / Math.cos(segmentAngle / 2);
    
    return distance <= maxDistance;
}

// Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘Р С‘ Р Т‘Р В»РЎРЏ РЎР‚Р В°Р В±Р С•РЎвЂљРЎвЂ№ РЎРѓ Р СР В°РЎР‚Р С”Р ВµРЎР‚Р В°Р СР С‘ Р вЂР РЋ
function createTempMarker(lat, lng) {
    if (!appState.leafletMap) return null;
    removeTempMarker();
    const markerHtml = document.createElement('div');
    markerHtml.className = 'bs-marker temp';
    markerHtml.title = 'Р СњР С•Р Р†Р В°РЎРЏ Р В±Р В°Р В·Р С•Р Р†Р В°РЎРЏ РЎРѓРЎвЂљР В°Р Р…РЎвЂ Р С‘РЎРЏ';
    appState.tempMarker = L.marker([lat, lng], {
        icon: L.divIcon({ html: markerHtml.outerHTML, iconSize: [22, 22], iconAnchor: [11, 11], className: 'bs-marker-icon' }),
        draggable: false
    }).addTo(appState.leafletMap);
    return appState.tempMarker;
}

function removeTempMarker() {
    if (appState.tempMarker && appState.leafletMap) {
        appState.leafletMap.removeLayer(appState.tempMarker);
        appState.tempMarker = null;
    }
}

function createPreviewCircle(lat, lng, radius) {
    if (!appState.leafletMap) return null;
    removePreviewCircle();
    appState.previewCircle = L.circle([lat, lng], {
        radius: radius, color: '#ff4444', fillColor: '#ff4444', fillOpacity: 0.1, weight: 2, dashArray: '5, 5'
    }).addTo(appState.leafletMap);
    return appState.previewCircle;
}

function updatePreviewCircle(lat, lng, radius) {
    if (!appState.previewCircle) {
        createPreviewCircle(lat, lng, radius);
    } else {
        appState.previewCircle.setLatLng([lat, lng]);
        appState.previewCircle.setRadius(radius);
    }
}

function removePreviewCircle() {
    if (appState.previewCircle && appState.leafletMap) {
        appState.leafletMap.removeLayer(appState.previewCircle);
        appState.previewCircle = null;
    }
}

function positionDialogNearMarker(x, y) {
    const dialog = document.getElementById('markerDialog');
    const rect = canvas.getBoundingClientRect();
    const dialogWidth = 300, dialogHeight = 320;
    
    let left = rect.left + x + 20;
    let top = rect.top + y;
    
    if (left + dialogWidth > window.innerWidth) left = rect.left + x - dialogWidth - 20;
    if (top + dialogHeight > window.innerHeight) top = rect.top + y - dialogHeight;
    
    dialog.style.left = left + 'px';
    dialog.style.top = top + 'px';
}

function createMarker(lat, lng, name = '', comment = '', id = null, showCircle = false, circleRadius = CONFIG.DEFAULT_BS_RADIUS) {
    if (!appState.leafletMap) return null;
    
    const markerHtml = document.createElement('div');
    markerHtml.className = 'bs-marker';
    markerHtml.title = name || 'Р вЂР В°Р В·Р С•Р Р†Р В°РЎРЏ РЎРѓРЎвЂљР В°Р Р…РЎвЂ Р С‘РЎРЏ';
    
    const marker = L.marker([lat, lng], {
        icon: L.divIcon({ html: markerHtml.outerHTML, iconSize: [22, 22], iconAnchor: [11, 11], className: 'bs-marker-icon' }),
        draggable: true
    }).addTo(appState.leafletMap);
    
    marker.on('dragstart', function(e) {
        appState.isDraggingMarker = true;
        appState.draggedMarkerId = id;
        const iconElement = marker.getElement();
        if (iconElement) iconElement.classList.add('dragging');
        marker.closePopup();
        appState.selectedBsId = null;
        updateBsList();
    });
    
    marker.on('drag', function(e) {
        const markerIndex = appState.leafletMarkers.findIndex(m => m.id === id);
        if (markerIndex !== -1) {
            const markerData = appState.leafletMarkers[markerIndex];
            if (markerData.circle) markerData.circle.setLatLng(e.target.getLatLng());
        }
    });
    
    marker.on('dragend', function(e) {
        appState.isDraggingMarker = false;
        appState.draggedMarkerId = null;
        const iconElement = marker.getElement();
        if (iconElement) iconElement.classList.remove('dragging');
        
        const markerIndex = appState.leafletMarkers.findIndex(m => m.id === id);
        if (markerIndex !== -1) {
            const newLatLng = e.target.getLatLng();
            appState.leafletMarkers[markerIndex].lat = newLatLng.lat;
            appState.leafletMarkers[markerIndex].lng = newLatLng.lng;
            
            const bsMarkerIndex = appState.bsMarkers.findIndex(m => m.id === id);
            if (bsMarkerIndex !== -1) {
                appState.bsMarkers[bsMarkerIndex].lat = newLatLng.lat;
                appState.bsMarkers[bsMarkerIndex].lng = newLatLng.lng;
                markMapAsChanged();
            }
        }
    });
    
    const popupContent = document.createElement('div');
    
    const title = document.createElement('div');
    title.className = 'marker-popup-title';
    title.textContent = name || 'Р вЂР В°Р В·Р С•Р Р†Р В°РЎРЏ РЎРѓРЎвЂљР В°Р Р…РЎвЂ Р С‘РЎРЏ';
    popupContent.appendChild(title);
    
    if (comment) {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'marker-popup-comment';
        commentDiv.textContent = comment;
        popupContent.appendChild(commentDiv);
    }
    
    if (showCircle) {
        const circleInfo = document.createElement('div');
        circleInfo.className = 'marker-popup-comment';
        circleInfo.textContent = `Р В Р В°Р Т‘Р С‘РЎС“РЎРѓ: ${circleRadius} Р С`;
        circleInfo.style.color = '#ff4444';
        popupContent.appendChild(circleInfo);
    }
    
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'popup-buttons';
    buttonsDiv.innerHTML = `
        <button data-click="editMarker(${id})">Р В Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ</button>
        <button data-click="deleteMarkerById(${id})" style="background:#ff4444;color:white;">Р Р€Р Т‘Р В°Р В»Р С‘РЎвЂљРЎРЉ</button>
    `;
    popupContent.appendChild(buttonsDiv);
    
    marker.bindPopup(popupContent);
    
    marker.on('popupopen', function() {
        if (appState.leafletMap) appState.leafletMap.dragging.enable();
    });
    
    let circle = null;
    if (showCircle && circleRadius > 0) {
        circle = L.circle([lat, lng], {
            radius: circleRadius, color: '#ff4444', fillColor: '#ff4444', fillOpacity: 0.1, weight: 2, dashArray: '5, 5'
        }).addTo(appState.leafletMap);
    }
    
    return { marker, id: id || Date.now(), lat, lng, name, comment, showCircle, circleRadius, circle };
}

function updateMarkerCircle(markerData) {
    if (markerData.circle && appState.leafletMap) appState.leafletMap.removeLayer(markerData.circle);
    markerData.circle = null;
    
    if (markerData.showCircle && markerData.circleRadius > 0) {
        markerData.circle = L.circle([markerData.lat, markerData.lng], {
            radius: markerData.circleRadius, color: '#ff4444', fillColor: '#ff4444', fillOpacity: 0.1, weight: 2, dashArray: '5, 5'
        }).addTo(appState.leafletMap);
    }
    updateMarkerPopup(markerData);
}

// Р СџР ВµРЎР‚Р ВµРЎР‚Р С‘РЎРѓР С•Р Р†РЎвЂ№Р Р†Р В°Р ВµР С Р Р†РЎРѓР Вµ Р С”РЎР‚РЎС“Р С–Р С‘ Р вЂР РЋ, Р С—РЎР‚Р С‘Р СР ВµР Р…РЎРЏРЎРЏ Р С–Р В»Р С•Р В±Р В°Р В»РЎРЉР Р…РЎвЂ№Р в„– РЎР‚Р В°Р Т‘Р С‘РЎС“РЎРѓ РЎвЂљР С•Р В»РЎРЉР С”Р С• Р С” РЎвЂљР ВµР С,
// РЎС“ Р С”Р С•Р С–Р С• Р С‘Р Р…Р Т‘Р С‘Р Р†Р С‘Р Т‘РЎС“Р В°Р В»РЎРЉР Р…Р В°РЎРЏ Р С–Р В°Р В»Р С•РЎвЂЎР С”Р В° Р вЂ™Р В«Р С™Р вЂєР В®Р В§Р вЂўР СњР С’ (showCircle === false)
function redrawAllBSCirclesWithGlobalOverride() {
    appState.leafletMarkers.forEach(lm => {
        const bs = appState.bsMarkers.find(b => b.id === lm.id);
        if (!bs) return;

        // Р Р€Р Т‘Р В°Р В»РЎРЏР ВµР С РЎРѓРЎвЂљР В°РЎР‚РЎвЂ№Р в„– Р С”РЎР‚РЎС“Р С–, Р ВµРЎРѓР В»Р С‘ Р В±РЎвЂ№Р В»
        if (lm.circle) {
            appState.leafletMap.removeLayer(lm.circle);
            lm.circle = null;
        }

        // Р В Р ВµРЎв‚¬Р В°Р ВµР С, Р С—Р С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°РЎвЂљРЎРЉ Р В»Р С‘ Р С”РЎР‚РЎС“Р С– Р С‘ Р С”Р В°Р С”Р С•Р в„– РЎР‚Р В°Р Т‘Р С‘РЎС“РЎРѓ Р С‘РЎРѓР С—Р С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљРЎРЉ
        let shouldShow = false;
        let effectiveRadius = 0;

        if (bs.showCircle) {
            // Р ВР Р…Р Т‘Р С‘Р Р†Р С‘Р Т‘РЎС“Р В°Р В»РЎРЉР Р…Р С• Р Р†Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р С• РІвЂ вЂ™ Р С‘РЎРѓР С—Р С•Р В»РЎРЉР В·РЎС“Р ВµР С Р С‘Р Р…Р Т‘Р С‘Р Р†Р С‘Р Т‘РЎС“Р В°Р В»РЎРЉР Р…РЎвЂ№Р в„– РЎР‚Р В°Р Т‘Р С‘РЎС“РЎРѓ
            shouldShow = true;
            effectiveRadius = bs.circleRadius || CONFIG.DEFAULT_BS_RADIUS;
        } else if (appState.globalShowCircle) {
            // Р ВР Р…Р Т‘Р С‘Р Р†Р С‘Р Т‘РЎС“Р В°Р В»РЎРЉР Р…Р С• Р Р†РЎвЂ№Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р С•, Р Р…Р С• Р С–Р В»Р С•Р В±Р В°Р В»РЎРЉР Р…Р С• Р Р†Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р С• РІвЂ вЂ™ Р С‘РЎРѓР С—Р С•Р В»РЎРЉР В·РЎС“Р ВµР С Р С–Р В»Р С•Р В±Р В°Р В»РЎРЉР Р…РЎвЂ№Р в„– РЎР‚Р В°Р Т‘Р С‘РЎС“РЎРѓ
            shouldShow = true;
            effectiveRadius = appState.globalCircleRadius;
        }

        if (shouldShow && effectiveRadius > 0) {
            lm.circle = L.circle([bs.lat, bs.lng], {
                radius: effectiveRadius,
                color: '#ff4444',
                fillColor: '#ff4444',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '5, 5'
            }).addTo(appState.leafletMap);
        }
    });
}

function updateMarkerPopup(markerData) {
    if (!markerData.marker) return;
    
    const popupContent = document.createElement('div');
    
    const title = document.createElement('div');
    title.className = 'marker-popup-title';
    title.textContent = markerData.name || 'Р вЂР В°Р В·Р С•Р Р†Р В°РЎРЏ РЎРѓРЎвЂљР В°Р Р…РЎвЂ Р С‘РЎРЏ';
    popupContent.appendChild(title);
    
    if (markerData.comment) {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'marker-popup-comment';
        commentDiv.textContent = markerData.comment;
        popupContent.appendChild(commentDiv);
    }
    
    if (markerData.showCircle) {
        const circleInfo = document.createElement('div');
        circleInfo.className = 'marker-popup-comment';
        circleInfo.textContent = `Р В Р В°Р Т‘Р С‘РЎС“РЎРѓ: ${markerData.circleRadius} Р С`;
        circleInfo.style.color = '#ff4444';
        popupContent.appendChild(circleInfo);
    }
    
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'popup-buttons';
    buttonsDiv.innerHTML = `
        <button data-click="editMarker(${markerData.id})">Р В Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ</button>
        <button data-click="deleteMarkerById(${markerData.id})" style="background:#ff4444;color:white;">Р Р€Р Т‘Р В°Р В»Р С‘РЎвЂљРЎРЉ</button>
    `;
    popupContent.appendChild(buttonsDiv);
    
    markerData.marker.bindPopup(popupContent);
}

function editMarker(markerId) {
    const markerIndex = appState.leafletMarkers.findIndex(m => m.id === markerId);
    if (markerIndex !== -1) appState.leafletMarkers[markerIndex].marker.closePopup();
    
    const markerIndex2 = appState.bsMarkers.findIndex(m => m.id === markerId);
    if (markerIndex2 === -1) return;
    
    const marker = appState.bsMarkers[markerIndex2];
    appState.editingMarkerId = markerId;
    
    appState.originalMarkerValues = {
        lat: marker.lat, lng: marker.lng, name: marker.name, comment: marker.comment,
        showCircle: marker.showCircle || false, circleRadius: marker.circleRadius || CONFIG.DEFAULT_BS_RADIUS
    };
    
    document.getElementById('markerName').value = marker.name || '';
    document.getElementById('markerComment').value = marker.comment || '';
    document.getElementById('markerShowCircle').checked = marker.showCircle || false;
    document.getElementById('markerCircleSlider').value = marker.circleRadius || CONFIG.DEFAULT_BS_RADIUS;
    document.getElementById('markerCircleText').value = marker.circleRadius || CONFIG.DEFAULT_BS_RADIUS;
    
    document.getElementById('markerCircleControls').style.display = marker.showCircle ? 'block' : 'none';
    document.getElementById('deleteMarkerBtn').style.display = 'block';
    
    const leafletMarkerIndex = appState.leafletMarkers.findIndex(m => m.id === markerId);
    if (leafletMarkerIndex !== -1) {
        const leafletMarker = appState.leafletMarkers[leafletMarkerIndex];
        if (leafletMarker.circle) leafletMarker.circle.remove();
    }
    
    if (marker.showCircle && marker.circleRadius > 0) {
        createPreviewCircle(marker.lat, marker.lng, marker.circleRadius);
    }
    
    const markerPx = appState.leafletMap.latLngToContainerPoint([marker.lat, marker.lng]);
    positionDialogNearMarker(markerPx.x, markerPx.y);
    
    showMarkerDialog(true);
}

function deleteMarkerById(markerId) {
    const markerIndex = appState.bsMarkers.findIndex(m => m.id === markerId);
    if (markerIndex === -1) return;
    
    const leafletMarkerIndex = appState.leafletMarkers.findIndex(m => m.id === markerId);
    if (leafletMarkerIndex !== -1) {
        const leafletMarker = appState.leafletMarkers[leafletMarkerIndex];
        if (leafletMarker.marker && appState.leafletMap) appState.leafletMap.removeLayer(leafletMarker.marker);
        if (leafletMarker.circle && appState.leafletMap) appState.leafletMap.removeLayer(leafletMarker.circle);
        appState.leafletMarkers.splice(leafletMarkerIndex, 1);
    }
    
    appState.bsMarkers.splice(markerIndex, 1);
    
    if (appState.selectedBsId === markerId) appState.selectedBsId = null;
    if (appState.editingMarkerId === markerId) hideMarkerDialog();
    
    updateBsList();
    markMapAsChanged();
    updateControlWindowHeight();
	redrawAllBSCirclesWithGlobalOverride();
}

function deleteMarker() {
    if (!appState.editingMarkerId) return;
    deleteMarkerById(appState.editingMarkerId);
    hideMarkerDialog();
}

function showMarkerDialog(isEditing = false) {
    document.getElementById('markerDialog').classList.add('active');
    
    if (isEditing) {
        document.getElementById('deleteMarkerBtn').style.display = 'block';
    } else {
        const nextNumber = getNextBSNumber();
        const defaultName = `Р вЂР В°Р В·Р С•Р Р†Р В°РЎРЏ РЎРѓРЎвЂљР В°Р Р…РЎвЂ Р С‘РЎРЏ ${nextNumber}`;
        document.getElementById('markerName').value = defaultName;
        document.getElementById('markerName').placeholder = defaultName;
        document.getElementById('markerComment').value = '';
        document.getElementById('markerShowCircle').checked = false;
        document.getElementById('markerCircleSlider').value = CONFIG.DEFAULT_BS_RADIUS;
        document.getElementById('markerCircleText').value = CONFIG.DEFAULT_BS_RADIUS;
        document.getElementById('markerCircleControls').style.display = 'none';
        document.getElementById('deleteMarkerBtn').style.display = 'none';
        removePreviewCircle();
    }
    
    document.getElementById('markerName').focus();
}

function hideMarkerDialog() {
    document.getElementById('markerDialog').classList.remove('active');
    if (!appState.editingMarkerId) {
        appState.currentMarkerData = null;
        document.getElementById('markerShowCircle').checked = false;
        document.getElementById('markerCircleSlider').value = CONFIG.DEFAULT_BS_RADIUS;
        document.getElementById('markerCircleText').value = CONFIG.DEFAULT_BS_RADIUS;
        document.getElementById('markerCircleControls').style.display = 'none';
        removePreviewCircle();
    }
    appState.editingMarkerId = null;
    appState.originalMarkerValues = null;
}

function saveMarker() {
    const nameInput = document.getElementById('markerName');
    let name = nameInput.value.trim();
    const comment = document.getElementById('markerComment').value.trim();
    const showCircle = document.getElementById('markerShowCircle').checked;
    const circleRadius = parseInt(document.getElementById('markerCircleText').value) || CONFIG.DEFAULT_BS_RADIUS;
    
    if (!name) {
        name = `Р вЂР В°Р В·Р С•Р Р†Р В°РЎРЏ РЎРѓРЎвЂљР В°Р Р…РЎвЂ Р С‘РЎРЏ ${appState.bsMarkers.length + 1}`;
        nameInput.value = name;
    }
    
    if (appState.editingMarkerId) {
        const markerIndex = appState.bsMarkers.findIndex(m => m.id === appState.editingMarkerId);
        if (markerIndex !== -1) {
            appState.bsMarkers[markerIndex].name = name;
            appState.bsMarkers[markerIndex].comment = comment;
            appState.bsMarkers[markerIndex].showCircle = showCircle;
            appState.bsMarkers[markerIndex].circleRadius = circleRadius;
            
            const leafletMarkerIndex = appState.leafletMarkers.findIndex(m => m.id === appState.editingMarkerId);
            if (leafletMarkerIndex !== -1) {
                appState.leafletMarkers[leafletMarkerIndex].name = name;
                appState.leafletMarkers[leafletMarkerIndex].comment = comment;
                appState.leafletMarkers[leafletMarkerIndex].showCircle = showCircle;
                appState.leafletMarkers[leafletMarkerIndex].circleRadius = circleRadius;
                updateMarkerCircle(appState.leafletMarkers[leafletMarkerIndex]);
            }
            
            updateBsList();
            markMapAsChanged();
        }
    } else if (appState.currentMarkerData) {
        const markerId = Date.now();
        let finalName = name;
        if (!finalName || finalName.trim() === '') {
            finalName = `Р вЂР В°Р В·Р С•Р Р†Р В°РЎРЏ РЎРѓРЎвЂљР В°Р Р…РЎвЂ Р С‘РЎРЏ ${getNextBSNumber()}`;
        }
        
        const marker = {
            id: markerId, lat: appState.currentMarkerData.lat, lng: appState.currentMarkerData.lng,
            name: finalName, comment: comment, showCircle: showCircle, circleRadius: circleRadius
        };
        
        appState.bsMarkers.push(marker);
        
        const leafletMarker = createMarker(marker.lat, marker.lng, marker.name, marker.comment, markerId, marker.showCircle, marker.circleRadius);
        if (leafletMarker) appState.leafletMarkers.push(leafletMarker);
        
        updateBsList();
        markMapAsChanged();
    }
    
    removePreviewCircle();
    appState.originalMarkerValues = null;
    hideMarkerDialog();
	
	// Р СџР С•РЎРѓР В»Р Вµ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р ВµР Р…Р С‘РЎРЏ Р Р†РЎвЂ№Р С”Р В»РЎР‹РЎвЂЎР В°Р ВµР С РЎР‚Р ВµР В¶Р С‘Р С Р вЂР РЋ
    if (!appState.editingMarkerId && appState.bsModeEnabled) {
        appState.bsModeEnabled = false;
        const createBsBtn = document.getElementById('createBsBtn');
        if (createBsBtn) {
            createBsBtn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В±Р В°Р В·Р С•Р Р†РЎС“РЎР‹ РЎРѓРЎвЂљР В°Р Р…РЎвЂ Р С‘РЎР‹';
            createBsBtn.classList.remove('active');
            createBsBtn.style.background = '#2a3444';
            createBsBtn.style.color = '#ddd';
            createBsBtn.style.border = 'none';
            // Р вЂ™Р С•Р В·Р Р†РЎР‚Р В°РЎвЂ°Р В°Р ВµР С РЎРЊРЎвЂћРЎвЂћР ВµР С”РЎвЂљРЎвЂ№ Р С—РЎР‚Р С‘ Р Р…Р В°Р Р†Р ВµР Т‘Р ВµР Р…Р С‘Р С‘
            enableButtonHover(createBsBtn);
        }
        updateCursor();
        removeTempMarker();
        if (appState.leafletMap && !appState.moveGridEnabled) {
            appState.leafletMap.dragging.enable();
        }
        canvas.style.pointerEvents = 'none';
        document.body.classList.remove('bs-cursor');
    }
    
    updateControlWindowHeight();
	redrawAllBSCirclesWithGlobalOverride();
}

// Р С›РЎвЂљР СР ВµР Р…Р С‘РЎвЂљРЎРЉ Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р…Р С‘Р Вµ/РЎР‚Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘Р Вµ Р СР В°РЎР‚Р С”Р ВµРЎР‚Р В°
function cancelMarker() {
    // Р вЂўРЎРѓР В»Р С‘ РЎРЊРЎвЂљР С• РЎР‚Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘Р Вµ РЎРѓРЎС“РЎвЂ°Р ВµРЎРѓРЎвЂљР Р†РЎС“РЎР‹РЎвЂ°Р ВµР С–Р С• Р СР В°РЎР‚Р С”Р ВµРЎР‚Р В°, Р Р†Р С•РЎРѓРЎРѓРЎвЂљР В°Р Р…Р В°Р Р†Р В»Р С‘Р Р†Р В°Р ВµР С Р С•РЎР‚Р С‘Р С–Р С‘Р Р…Р В°Р В»РЎРЉР Р…РЎвЂ№Р Вµ Р В·Р Р…Р В°РЎвЂЎР ВµР Р…Р С‘РЎРЏ
    if (appState.editingMarkerId && appState.originalMarkerValues) {
        const markerIndex = appState.bsMarkers.findIndex(m => m.id === appState.editingMarkerId);
        if (markerIndex !== -1) {
            const leafletMarkerIndex = appState.leafletMarkers.findIndex(m => m.id === appState.editingMarkerId);
            if (leafletMarkerIndex !== -1) {
                // Р вЂ™Р С•РЎРѓРЎРѓРЎвЂљР В°Р Р…Р В°Р Р†Р В»Р С‘Р Р†Р В°Р ВµР С Р Р†РЎРѓР Вµ Р С•РЎР‚Р С‘Р С–Р С‘Р Р…Р В°Р В»РЎРЉР Р…РЎвЂ№Р Вµ Р В·Р Р…Р В°РЎвЂЎР ВµР Р…Р С‘РЎРЏ
                appState.leafletMarkers[leafletMarkerIndex].name = appState.originalMarkerValues.name;
                appState.leafletMarkers[leafletMarkerIndex].comment = appState.originalMarkerValues.comment;
                appState.leafletMarkers[leafletMarkerIndex].showCircle = appState.originalMarkerValues.showCircle;
                appState.leafletMarkers[leafletMarkerIndex].circleRadius = appState.originalMarkerValues.circleRadius;
                
                // Р вЂ™Р С•РЎРѓРЎРѓРЎвЂљР В°Р Р…Р В°Р Р†Р В»Р С‘Р Р†Р В°Р ВµР С Р С•РЎР‚Р С‘Р С–Р С‘Р Р…Р В°Р В»РЎРЉР Р…РЎвЂ№Р в„– Р С”РЎР‚РЎС“Р С–
                if (appState.leafletMarkers[leafletMarkerIndex].circle && appState.leafletMap) {
                    appState.leafletMap.removeLayer(appState.leafletMarkers[leafletMarkerIndex].circle);
                }
                
                if (appState.originalMarkerValues.showCircle && appState.originalMarkerValues.circleRadius > 0) {
                    appState.leafletMarkers[leafletMarkerIndex].circle = L.circle(
                        [appState.originalMarkerValues.lat, appState.originalMarkerValues.lng], 
                        {
                            radius: appState.originalMarkerValues.circleRadius,
                            color: '#ff4444',
                            fillColor: '#ff4444',
                            fillOpacity: 0.1,
                            weight: 2,
                            dashArray: '5, 5'
                        }
                    ).addTo(appState.leafletMap);
                } else {
                    appState.leafletMarkers[leafletMarkerIndex].circle = null;
                }
                
                // Р С›Р В±Р Р…Р С•Р Р†Р В»РЎРЏР ВµР С Р С—Р С•Р С—Р В°Р С—
                updateMarkerPopup(appState.leafletMarkers[leafletMarkerIndex]);
            }
            
            // Р С›Р В±Р Р…Р С•Р Р†Р В»РЎРЏР ВµР С Р Т‘Р В°Р Р…Р Р…РЎвЂ№Р Вµ Р Р† Р С•РЎРѓР Р…Р С•Р Р†Р Р…Р С•Р С Р СР В°РЎРѓРЎРѓР С‘Р Р†Р Вµ
            appState.bsMarkers[markerIndex].name = appState.originalMarkerValues.name;
            appState.bsMarkers[markerIndex].comment = appState.originalMarkerValues.comment;
            appState.bsMarkers[markerIndex].showCircle = appState.originalMarkerValues.showCircle;
            appState.bsMarkers[markerIndex].circleRadius = appState.originalMarkerValues.circleRadius;
        }
    }
    
    // Р Р€Р Т‘Р В°Р В»РЎРЏР ВµР С Р С—РЎР‚Р ВµР Т‘Р С—РЎР‚Р С•РЎРѓР СР С•РЎвЂљРЎР‚
    removePreviewCircle();
    
    // Р РЋР В±РЎР‚Р В°РЎРѓРЎвЂ№Р Р†Р В°Р ВµР С РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р ВµР Р…Р Р…РЎвЂ№Р Вµ Р В·Р Р…Р В°РЎвЂЎР ВµР Р…Р С‘РЎРЏ
    appState.originalMarkerValues = null;
    
    // Р РЋР С”РЎР‚РЎвЂ№Р Р†Р В°Р ВµР С Р Т‘Р С‘Р В°Р В»Р С•Р С–
    hideMarkerDialog();
    
    // Р СџР С•РЎРѓР В»Р Вµ Р С•РЎвЂљР СР ВµР Р…РЎвЂ№ Р Р†РЎвЂ№Р С”Р В»РЎР‹РЎвЂЎР В°Р ВµР С РЎР‚Р ВµР В¶Р С‘Р С Р вЂР РЋ
    if (!appState.editingMarkerId && appState.bsModeEnabled) {
        appState.bsModeEnabled = false;
        const createBsBtn = document.getElementById('createBsBtn');
        if (createBsBtn) {
            createBsBtn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В±Р В°Р В·Р С•Р Р†РЎС“РЎР‹ РЎРѓРЎвЂљР В°Р Р…РЎвЂ Р С‘РЎР‹';
            createBsBtn.classList.remove('active');
            createBsBtn.style.background = '#2a3444';
            createBsBtn.style.color = '#ddd';
            createBsBtn.style.border = 'none';
            // Р вЂ™Р С•Р В·Р Р†РЎР‚Р В°РЎвЂ°Р В°Р ВµР С РЎРЊРЎвЂћРЎвЂћР ВµР С”РЎвЂљРЎвЂ№ Р С—РЎР‚Р С‘ Р Р…Р В°Р Р†Р ВµР Т‘Р ВµР Р…Р С‘Р С‘
            enableButtonHover(createBsBtn);
        }
        updateCursor();
        removeTempMarker();
        if (appState.leafletMap && !appState.moveGridEnabled) {
            appState.leafletMap.dragging.enable();
        }
        canvas.style.pointerEvents = 'none';
        document.body.classList.remove('bs-cursor');
    }
}

function clearMarkers() {
    appState.leafletMarkers.forEach(markerData => {
        if (markerData.marker && appState.leafletMap) appState.leafletMap.removeLayer(markerData.marker);
        if (markerData.circle && appState.leafletMap) appState.leafletMap.removeLayer(markerData.circle);
    });
    appState.bsMarkers = [];
    appState.leafletMarkers = [];
    appState.selectedBsId = null;
    updateBsList();
    markMapAsChanged();
    updateControlWindowHeight();
}

// Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘Р С‘ Р Т‘Р В»РЎРЏ РЎР‚Р В°Р В±Р С•РЎвЂљРЎвЂ№ РЎРѓ Р С”Р В°РЎР‚РЎвЂљР С•Р в„–
function selectMapType(mapType) {
    if (!mapType) return;
    appState.bgMode = mapType;
    
    document.querySelectorAll('.map-option').forEach(option => option.classList.remove('selected'));
    const selectedOption = Array.from(document.querySelectorAll('.map-option')).find(
        option => option.getAttribute('data-click').includes(mapType)
    );
    if (selectedOption) {
        selectedOption.classList.add('selected');
        const radioButton = selectedOption.querySelector('input[type="radio"]');
        if (radioButton) radioButton.checked = true;
    }
    
    initBackground();
}

function toggleAccordion(sectionId, event) {
    if (event) event.stopPropagation();
    
    const header = document.querySelector(`[data-click="toggleAccordion('${sectionId}')"]`);
    const content = document.getElementById(`${sectionId}-content`);
    
    document.querySelectorAll('.accordion-header.active').forEach(otherHeader => {
        if (otherHeader !== header) {
            const otherSectionId = otherHeader.getAttribute('data-click').match(/'([^']+)'/)[1];
            const otherContent = document.getElementById(`${otherSectionId}-content`);
            otherHeader.classList.remove('active');
            otherContent.classList.remove('active');
        }
    });
    
    header.classList.toggle('active');
    content.classList.toggle('active');
    updateControlWindowHeight();
}

function saveMapState() {
    if (!appState.leafletMap) return null;
    return {
        center: appState.leafletMap.getCenter(),
        zoom: appState.leafletMap.getZoom(),
        appState.gridCenterLat: appState.gridCenterLat,
        appState.gridCenterLng: appState.gridCenterLng,
        appState.activeHexes: Array.from(appState.activeHexes.entries()),
        appState.bsMarkers: appState.bsMarkers,
        appState.zones: appState.zones.map(z => ({ ...z, layer: null, vertexMarkers: null, midVertexMarkers: null })), // Р вЂќР С›Р вЂР С’Р вЂ™Р вЂєР вЂўР СњР С›
        appState.objects: appState.objects
    };
}

function restoreMapState(state) {
    if (!state || !appState.leafletMap) return;
    
    appState.leafletMap.setView(state.center, state.zoom);
    appState.gridCenterLat = state.gridCenterLat;
    appState.gridCenterLng = state.gridCenterLng;
    
    appState.activeHexes.clear();
    for (const [key, hex] of state.activeHexes) {
        appState.activeHexes.set(key, hex);
    }
    
    clearMarkers();
    appState.bsMarkers = state.bsMarkers || [];
    appState.bsMarkers.forEach(marker => {
        const leafletMarker = createMarker(marker.lat, marker.lng, marker.name, marker.comment, marker.id, marker.showCircle, marker.circleRadius);
        if (leafletMarker) appState.leafletMarkers.push(leafletMarker);
    });
    
    // Р вЂќР С›Р вЂР С’Р вЂ™Р вЂєР вЂўР СњР С›: Р вЂ™Р С•РЎРѓРЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р В»Р ВµР Р…Р С‘Р Вµ Р В·Р С•Р Р…
    clearZones();
    if (state.zones) {
        state.zones.forEach(zone => {
            appState.zones.push(zone);
            drawZone(zone);
        });
        updateZoneList();
    }
    
    appState.objects = state.objects || [];
    appState.leafletObjectMarkers = [];
    appState.objects.forEach(obj => {
        const leafletMarker = createObjectMarker(obj.lat, obj.lng, obj.name, obj.comment, obj.id, obj.deviceCount, obj.meterPointCount);
        if (leafletMarker) appState.leafletObjectMarkers.push(leafletMarker);
    });
    updateObjectList();
    
    if (appState.buildEnabled && appState.activeHexes.size > 0) updatePossibleHexes();
    
    updateBsList();
    updateCellCount();
    resetMapChanged();
}

function initBackground() {
    const savedState = saveMapState();
    
    if (appState.leafletMap) {
        appState.leafletMap.off();
        appState.leafletMap.remove();
        appState.leafletMap = null;
    }
    
    appState.leafletMarkers = [];
    appState.tempMarker = null;
    appState.previewCircle = null;
    appState.leafletObjectMarkers = [];
    
    const mapDiv = document.getElementById('map');
    mapDiv.innerHTML = '';
    
    if (typeof window.L === 'undefined') {
        console.error('Leaflet failed to load.');
        return;
    }
    
    appState.leafletMap = L.map('map', {
        zoomControl: false,
        attributionControl: true,
        zoomAnimation: false,
        fadeAnimation: false,
        dragging: true,
        doubleClickZoom: false
    });
    
    const baseLayer = createBaseLayer(appState.bgMode);
    if (baseLayer) {
        baseLayer.addTo(appState.leafletMap);
    }
    
    if (savedState) {
        restoreMapState(savedState);
    } else {
        appState.leafletMap.setView([54.7388, 55.9722], 12);
    }
    
    appState.leafletMap.on('move zoom', draw);
    appState.leafletMap.dragging.enable();
    appState.leafletMap.scrollWheelZoom.enable();
    
    updateBsList();
    draw();
    redrawAllBSCirclesWithGlobalOverride();
}
function updateControlWindowHeight() {
    const controls = document.getElementById('controls');
    controls.style.maxHeight = 'none';
    const contentHeight = controls.scrollHeight;
    controls.style.maxHeight = '';
    const maxAvailableHeight = window.innerHeight * 0.95;
    controls.style.maxHeight = Math.min(contentHeight, maxAvailableHeight) + 'px';
}

// Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘Р С‘ РЎР‚Р С‘РЎРѓР С•Р Р†Р В°Р Р…Р С‘РЎРЏ
function drawHexagon(ctx, centerX, centerY, radius, color = '#4af', lineWidth = 2, hexRotation = 0) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3 - Math.PI / 2 + hexRotation;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
}

function drawCenter(ctx, centerX, centerY, radius, color = '#f44') {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawCircle(ctx, centerX, centerY, radius, color = 'rgba(244,68,68,0.5)') {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawPreviewHex() {
    // Р СџРЎР‚Р ВµР Т‘Р С—РЎР‚Р С•РЎРѓР СР С•РЎвЂљРЎР‚ Р Р†РЎРѓР ВµР С–Р Т‘Р В° Р Р† Р С–Р ВµР С•Р СР ВµРЎвЂљРЎР‚Р С‘РЎвЂЎР ВµРЎРѓР С”Р С•Р С РЎвЂ Р ВµР Р…РЎвЂљРЎР‚Р Вµ canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const radiusPx = getRadiusInPixels();

    ctx.globalAlpha = 0.35; // РЎвЂЎРЎС“РЎвЂљРЎРЉ Р С—РЎР‚Р С•Р В·РЎР‚Р В°РЎвЂЎР Р…Р ВµР Вµ, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р В±РЎвЂ№Р В»Р С• Р С—Р С•Р Р…РЎРЏРЎвЂљР Р…Р С• РІР‚вЂќ РЎРЊРЎвЂљР С• Р С—РЎР‚Р ВµР Т‘Р С—РЎР‚Р С•РЎРѓР СР С•РЎвЂљРЎР‚

    if (appState.showHex) {
        drawHexagon(ctx, centerX, centerY, radiusPx, '#4af', 2, appState.rotation * Math.PI / 180);
    }

    if (appState.showCenters) {
        drawCenter(ctx, centerX, centerY, 4, '#f44');
    }

    // Р С›РЎвЂљР С•Р В±РЎР‚Р В°Р В¶Р В°Р ВµР С РЎР‚Р В°Р Т‘Р С‘РЎС“РЎРѓ, Р ВµРЎРѓР В»Р С‘ Р Р†Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р В° Р С•Р С—РЎвЂ Р С‘РЎРЏ "Р В Р В°Р Т‘Р С‘РЎС“РЎРѓРЎвЂ№" - Р С”РЎР‚Р В°РЎРѓР Р…РЎвЂ№Р С РЎвЂ Р Р†Р ВµРЎвЂљР С•Р С
    if (appState.showCircles) {
        drawCircle(ctx, centerX, centerY, radiusPx, 'rgba(244, 68, 68, 0.5)'); // Р С™РЎР‚Р В°РЎРѓР Р…РЎвЂ№Р в„– РЎвЂ Р Р†Р ВµРЎвЂљ
    }

    ctx.globalAlpha = 1.0;
}

function drawGrid() {
    if (appState.buildEnabled) {
        for (const hex of appState.possibleHexes.values()) {
            const screenPos = getHexScreenPosition(hex.q, hex.r);
            const { x, y, radius: currentRadius } = screenPos;
            
            if (appState.showHex) drawHexagon(ctx, x, y, currentRadius, '#888', 1.5, appState.rotation * Math.PI / 180);
            if (appState.showCenters) drawCenter(ctx, x, y, 3, '#888');
            if (appState.showCircles) drawCircle(ctx, x, y, currentRadius, 'rgba(136,136,136,0.5)');
        }
    }
    
    for (const hex of appState.activeHexes.values()) {
        const screenPos = getHexScreenPosition(hex.q, hex.r);
        const { x, y, radius: currentRadius } = screenPos;
        
        if (appState.showHex) {
            drawHexagon(ctx, x, y, currentRadius, '#4af', 2, appState.rotation * Math.PI / 180);
            if (appState.showCenters) drawCenter(ctx, x, y, 4, '#f44');
        } else if (appState.showCenters) {
            drawCenter(ctx, x, y, 4, '#f44');
        }
        
        if (appState.showCircles) drawCircle(ctx, x, y, currentRadius, 'rgba(244,68,68,0.5)');
    }
}

function getScreenCenterLatLng() {
    if (!appState.leafletMap) {
        return { lat: 0, lng: 0 };
    }
    const centerPx = {
        x: canvas.width / 2,
        y: canvas.height / 2
    };
    return appState.leafletMap.containerPointToLatLng(centerPx);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateCellCount();

    const isVisible = isCellularGridVisible();
    if (!isVisible) {
        return;
    }

    // Р вЂ™РЎРѓР ВµР С–Р Т‘Р В° Р С—Р С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµР С Р С—РЎР‚Р ВµР Т‘Р С—РЎР‚Р С•РЎРѓР СР С•РЎвЂљРЎР‚, Р ВµРЎРѓР В»Р С‘ Р Р…Р ВµРЎвЂљ Р В°Р С”РЎвЂљР С‘Р Р†Р Р…РЎвЂ№РЎвЂ¦ РЎРЏРЎвЂЎР ВµР ВµР С”
    if (appState.activeHexes.size === 0) {
        drawPreviewHex();
        return;
    }

    // Р вЂ™Р С•Р В·Р СР С•Р В¶Р Р…РЎвЂ№Р Вµ (РЎРѓР ВµРЎР‚РЎвЂ№Р Вµ) РЎРЏРЎвЂЎР ВµР в„–Р С”Р С‘ РІР‚вЂќ РЎР‚Р С‘РЎРѓРЎС“Р ВµР С Р Р†РЎРѓР ВµР С–Р Т‘Р В°, Р С”Р С•Р С–Р Т‘Р В° РЎР‚Р ВµР В¶Р С‘Р С Р Р†Р С”Р В»РЎР‹РЎвЂЎРЎвЂР Р…
    if (appState.buildEnabled) {
        for (const hex of appState.possibleHexes.values()) {
            const screenPos = getHexScreenPosition(hex.q, hex.r);
            if (appState.showHex) {
                drawHexagon(ctx, screenPos.x, screenPos.y, screenPos.radius, '#888', 1.5, appState.rotation * Math.PI / 180);
            }
            if (appState.showCenters) {
                drawCenter(ctx, screenPos.x, screenPos.y, 3, '#888');
            }
            if (appState.showCircles) {
                drawCircle(ctx, screenPos.x, screenPos.y, screenPos.radius, 'rgba(136,136,136,0.5)');
            }
        }
    }

    // Р С’Р С”РЎвЂљР С‘Р Р†Р Р…РЎвЂ№Р Вµ (РЎРѓР С‘Р Р…Р С‘Р Вµ) РЎРЏРЎвЂЎР ВµР в„–Р С”Р С‘
    for (const hex of appState.activeHexes.values()) {
        const screenPos = getHexScreenPosition(hex.q, hex.r);
        if (appState.showHex) {
            drawHexagon(ctx, screenPos.x, screenPos.y, screenPos.radius, '#4af', 2, appState.rotation * Math.PI / 180);
            if (appState.showCenters) drawCenter(ctx, screenPos.x, screenPos.y, 4, '#f44');
        } else if (appState.showCenters) {
            drawCenter(ctx, screenPos.x, screenPos.y, 4, '#f44');
        }
        if (appState.showCircles) {
            drawCircle(ctx, screenPos.x, screenPos.y, screenPos.radius, 'rgba(244,68,68,0.5)');
        }
    }
}

function forceUpdatePossibleHexesAndDraw() {
    if (!appState.buildEnabled) {
        draw();
        return;
    }

    // Р СџРЎР‚Р С‘Р Р…РЎС“Р Т‘Р С‘РЎвЂљР ВµР В»РЎРЉР Р…Р С• Р С—Р ВµРЎР‚Р ВµРЎРѓРЎвЂЎР С‘РЎвЂљРЎвЂ№Р Р†Р В°Р ВµР С Р Р†Р С•Р В·Р СР С•Р В¶Р Р…РЎвЂ№Р Вµ РЎРЏРЎвЂЎР ВµР в„–Р С”Р С‘ Р Р…Р В° Р С•РЎРѓР Р…Р С•Р Р†Р Вµ РЎвЂљР ВµР С”РЎС“РЎвЂ°Р С‘РЎвЂ¦ Р В°Р С”РЎвЂљР С‘Р Р†Р Р…РЎвЂ№РЎвЂ¦
    updatePossibleHexes();

    // Р В РЎРѓРЎР‚Р В°Р В·РЎС“ РЎР‚Р С‘РЎРѓРЎС“Р ВµР С
    draw();
}

// Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘РЎРЏ РЎРѓР В±РЎР‚Р С•РЎРѓР В°
function reset() {
    const currentBgMode = appState.bgMode;
    
    appState.radiusMeters = CONFIG.DEFAULT_RADIUS;
    appState.rotation = 0;
    appState.buildEnabled = false;
    appState.bsModeEnabled = false;
    appState.moveGridEnabled = false;
    appState.gridCenterLat = null;
    appState.gridCenterLng = null;
    appState.activeHexes.clear();
    appState.possibleHexes.clear();
    appState.showHex = true;
    appState.showCenters = true;
    appState.showCircles = false;
    
    clearMarkers();
    clearZones(); // Р вЂќР С›Р вЂР С’Р вЂ™Р вЂєР вЂўР СњР С›
    clearObjects();
    
    document.getElementById('bsToggle').textContent = 'Р вЂ™Р С”Р В»РЎР‹РЎвЂЎР С‘РЎвЂљРЎРЉ';
    document.getElementById('bsToggle').classList.remove('active');
    document.getElementById('moveGrid').checked = false;
    document.getElementById('appState.showHex').checked = true;
    document.getElementById('appState.showCenters').checked = true;
    document.getElementById('appState.showCircles').checked = false;
    document.getElementById('radiusText').value = CONFIG.DEFAULT_RADIUS.toString();
    document.getElementById('rotText').value = '0';
    document.getElementById('radiusSlider').value = CONFIG.DEFAULT_RADIUS;
    document.getElementById('rotSlider').value = 0;
    
    // Р вЂќР С›Р вЂР С’Р вЂ™Р вЂєР вЂўР СњР С›: Р РЋР В±РЎР‚Р С•РЎРѓ Р С—Р ВµРЎР‚Р ВµР СР ВµР Р…Р Р…РЎвЂ№РЎвЂ¦ Р В·Р С•Р Р…
    appState.zoneModeEnabled = false;
    appState.currentZoneColor = null;
    appState.zoneColorIndex = 0;
    const zoneBtn = document.getElementById('createZoneBtn');
    if (zoneBtn) {
        zoneBtn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В·Р С•Р Р…РЎС“';
        zoneBtn.classList.remove('active');
        zoneBtn.style.background = '#2a3444';
        zoneBtn.style.color = '#ddd';
    }
    document.getElementById('zoneCount').textContent = 'Р С™Р С•Р В»Р С‘РЎвЂЎР ВµРЎРѓРЎвЂљР Р†Р С• Р В·Р С•Р Р…: 0';
    cancelPolygon();
    
    appState.objectModeEnabled = false;
    const objBtn = document.getElementById('createObjectBtn');
    if (objBtn) {
        objBtn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р С•Р В±РЎР‰Р ВµР С”РЎвЂљ';
        objBtn.classList.remove('active');
        objBtn.style.background = '#2a3444';
        objBtn.style.color = '#ddd';
    }
    document.getElementById('objectCount').textContent = 'Р С™Р С•Р В»Р С‘РЎвЂЎР ВµРЎРѓРЎвЂљР Р†Р С• Р С•Р В±РЎР‰Р ВµР С”РЎвЂљР С•Р Р†: 0';
    
    const btn = document.getElementById('buildToggleInside');
    if (btn) btn.textContent = 'Р вЂ™Р С”Р В»РЎР‹РЎвЂЎР С‘РЎвЂљРЎРЉ РЎРѓРЎвЂљРЎР‚Р С•Р ВµР Р…Р С‘Р Вµ', btn.classList.remove('active');
    
    canvas.style.pointerEvents = 'none';
    document.body.classList.remove('bs-cursor');
    updateCursor();
    
    appState.bgMode = currentBgMode;
    
    if (appState.leafletMap) {
        appState.leafletMap.dragging.enable();
        appState.leafletMap.scrollWheelZoom.enable();
    }
    
    appState.isMapChanged = false;
    updateFileToggleButton();
    updateControlWindowHeight();
    
    updateCellCount();
    draw();
}

// Р СџРЎР‚Р С‘Р СР ВµР Р…РЎРЏР ВµР С Р С–Р В»Р С•Р В±Р В°Р В»РЎРЉР Р…Р С•Р Вµ Р Р†Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р С‘Р Вµ РЎР‚Р В°Р Т‘Р С‘РЎС“РЎРѓР В° Р С”Р С• Р Р†РЎРѓР ВµР С Р вЂР РЋ, РЎС“ Р С”Р С•РЎвЂљР С•РЎР‚РЎвЂ№РЎвЂ¦ Р С•Р Р… Р В±РЎвЂ№Р В» Р Р†РЎвЂ№Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…
function applyGlobalShowCircleToAllBS() {
    if (!appState.globalShowCircle) return;  // Р Р†РЎвЂ№Р С”Р В»РЎР‹РЎвЂЎР С‘Р В»Р С‘ Р С–Р В»Р С•Р В±Р В°Р В»РЎРЉР Р…Р С• РІвЂ вЂ™ Р Р…Р Вµ РЎвЂљРЎР‚Р С•Р С–Р В°Р ВµР С Р С‘Р Р…Р Т‘Р С‘Р Р†Р С‘Р Т‘РЎС“Р В°Р В»РЎРЉР Р…РЎвЂ№Р Вµ Р Р…Р В°РЎРѓРЎвЂљРЎР‚Р С•Р в„–Р С”Р С‘

    let anyChanged = false;

    appState.bsMarkers.forEach(bs => {
        if (!bs.showCircle) {
            bs.showCircle = true;
            bs.circleRadius = appState.globalCircleRadius;
            anyChanged = true;
        }
    });

    // РЎРѓР С‘Р Р…РЎвЂ¦РЎР‚Р С•Р Р…Р С‘Р В·Р С‘РЎР‚РЎС“Р ВµР С leaflet-Р СР В°РЎР‚Р С”Р ВµРЎР‚РЎвЂ№
    appState.leafletMarkers.forEach(lm => {
        const bs = appState.bsMarkers.find(b => b.id === lm.id);
        if (bs && (lm.showCircle !== bs.showCircle || lm.circleRadius !== bs.circleRadius)) {
            lm.showCircle = bs.showCircle;
            lm.circleRadius = bs.circleRadius;
            updateMarkerCircle(lm);
            anyChanged = true;
        }
    });

    if (anyChanged) {
        updateBsList();
        markMapAsChanged();
        draw();  // Р Р…Р В° Р Р†РЎРѓРЎРЏР С”Р С‘Р в„– РЎРѓР В»РЎС“РЎвЂЎР В°Р в„–, РЎвЂ¦Р С•РЎвЂљРЎРЏ Р С”РЎР‚РЎС“Р С–Р С‘ Leaflet РЎРѓР В°Р СР С‘ Р С•Р В±Р Р…Р С•Р Р†РЎРЏРЎвЂљРЎРѓРЎРЏ
    }
}


// Р СџРЎР‚Р С‘Р СР ВµР Р…РЎРЏР ВµР С Р С‘Р В·Р СР ВµР Р…Р ВµР Р…Р С‘Р Вµ Р С–Р В»Р С•Р В±Р В°Р В»РЎРЉР Р…Р С•Р С–Р С• РЎР‚Р В°Р Т‘Р С‘РЎС“РЎРѓР В° РЎвЂљР С•Р В»РЎРЉР С”Р С• Р С” РЎвЂљР ВµР С Р вЂР РЋ, РЎС“ Р С”Р С•РЎвЂљР С•РЎР‚РЎвЂ№РЎвЂ¦ РЎР‚Р В°Р Т‘Р С‘РЎС“РЎРѓ РЎС“Р В¶Р Вµ Р С—Р С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµРЎвЂљРЎРѓРЎРЏ
function applyGlobalRadiusToVisibleBS() {
    if (!appState.globalShowCircle) return;

    let anyChanged = false;

    appState.bsMarkers.forEach(bs => {
        if (bs.showCircle && bs.circleRadius !== appState.globalCircleRadius) {
            bs.circleRadius = appState.globalCircleRadius;
            anyChanged = true;
        }
    });

    appState.leafletMarkers.forEach(lm => {
        const bs = appState.bsMarkers.find(b => b.id === lm.id);
        if (bs && bs.showCircle && lm.circleRadius !== appState.globalCircleRadius) {
            lm.circleRadius = appState.globalCircleRadius;
            if (lm.circle) {
                lm.circle.setRadius(appState.globalCircleRadius);
            }
            anyChanged = true;
        }
    });

    if (anyChanged) {
        markMapAsChanged();
    }
}

// Р С›Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…Р С‘Р Вµ Р С”РЎС“РЎР‚РЎРѓР С•РЎР‚Р В°
function updateCursor() {
    canvas.style.pointerEvents = 'none';
    canvas.style.cursor = 'default';
    document.body.classList.remove('bs-cursor');
    
    if (appState.bsModeEnabled) {
        canvas.style.cursor = 'crosshair';
        canvas.style.pointerEvents = 'auto';
        document.body.classList.add('bs-cursor');
    } else if (appState.objectModeEnabled) {
        canvas.style.cursor = 'crosshair';
        canvas.style.pointerEvents = 'auto';
        document.body.classList.add('bs-cursor');
    } else if (appState.moveGridEnabled && appState.activeHexes.size > 0) {
        canvas.style.cursor = 'move';
        canvas.style.pointerEvents = 'auto';
    } else if (appState.buildEnabled) {
        canvas.style.cursor = 'pointer';
        canvas.style.pointerEvents = 'auto';
    }
    
    // Р вЂќР С›Р вЂР С’Р вЂ™Р вЂєР вЂўР СњР С›: Р вЂќР В»РЎРЏ РЎР‚Р ВµР В¶Р С‘Р СР В° Р В·Р С•Р Р… canvas Р Р…Р Вµ Р С‘РЎРѓР С—Р С•Р В»РЎРЉР В·РЎС“Р ВµРЎвЂљРЎРѓРЎРЏ
    if (appState.zoneModeEnabled) {
        canvas.style.pointerEvents = 'none';
        canvas.style.cursor = 'default';
        document.body.classList.remove('bs-cursor');
    }
}

// Р СџР С•Р С”Р В°Р В·Р В°РЎвЂљРЎРЉ Р С—Р С•Р Т‘РЎРѓР С”Р В°Р В·Р С”РЎС“ Р Т‘Р В»РЎРЏ Р В°Р Р…Р В°Р В»Р С‘РЎвЂљР С‘Р С”Р С‘
function showAnalyticsTooltip(event) {
	const tooltip = document.getElementById('analyticsTooltip');
	if (!tooltip) return;
	
	// Р СџР С•Р В·Р С‘РЎвЂ Р С‘Р С•Р Р…Р С‘РЎР‚РЎС“Р ВµР С РЎР‚РЎРЏР Т‘Р С•Р С РЎРѓ Р С‘Р С”Р С•Р Р…Р С”Р С•Р в„–
	const icon = event.currentTarget;
	const rect = icon.getBoundingClientRect();
	
	tooltip.style.display = 'block';
	tooltip.style.left = (rect.left + 10) + 'px';
	tooltip.style.top = (rect.bottom + 10) + 'px';
}

// Р РЋР С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ Р С—Р С•Р Т‘РЎРѓР С”Р В°Р В·Р С”РЎС“ Р В°Р Р…Р В°Р В»Р С‘РЎвЂљР С‘Р С”Р С‘
function hideAnalyticsTooltip() {
	const tooltip = document.getElementById('analyticsTooltip');
	if (tooltip) {
		tooltip.style.display = 'none';
	}
}

// Р С›Р В±РЎР‚Р В°Р В±Р С•РЎвЂљРЎвЂЎР С‘Р С”Р С‘ РЎРѓР С•Р В±РЎвЂ№РЎвЂљР С‘Р в„– canvas
canvas.addEventListener('click', function(e) {
    if (!appState.buildEnabled && !appState.moveGridEnabled && !appState.bsModeEnabled && !appState.objectModeEnabled) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Р В Р ВµР В¶Р С‘Р С РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С•Р В±РЎР‰Р ВµР С”РЎвЂљР С•Р Р†
    if (appState.objectModeEnabled && appState.leafletMap) {
        const latLng = appState.leafletMap.containerPointToLatLng([clickX, clickY]);
        createTempObjectMarker(latLng.lat, latLng.lng);
        appState.currentObjectData = { lat: latLng.lat, lng: latLng.lng, temp: true };

        const nextNumber = getNextObjectNumber();
        const defaultName = `Р С›Р В±РЎР‰Р ВµР С”РЎвЂљ ${nextNumber}`;

        document.getElementById('objectName').value = defaultName;
        document.getElementById('objectName').placeholder = defaultName;
        document.getElementById('objectComment').value = '';
        document.getElementById('deviceCount').value = 0;
        document.getElementById('meterPointCount').value = 0;

        positionObjectDialogNearMarker(clickX, clickY);
        showObjectDialog(false);
        return;
    }

    if (!appState.buildEnabled && !appState.moveGridEnabled && !appState.bsModeEnabled) return;

    appState.currentClickPosition = { x: clickX, y: clickY };

    // Р В Р ВµР В¶Р С‘Р С РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р В±Р В°Р В·Р С•Р Р†РЎвЂ№РЎвЂ¦ РЎРѓРЎвЂљР В°Р Р…РЎвЂ Р С‘Р в„–
    if (appState.bsModeEnabled && appState.leafletMap) {
		const latLng = appState.leafletMap.containerPointToLatLng([clickX, clickY]);
		createTempMarker(latLng.lat, latLng.lng);

		// Р вЂ™РЎР‚Р ВµР СР ВµР Р…Р Р…РЎвЂ№Р в„– Р СР В°РЎР‚Р С”Р ВµРЎР‚ Р Р†РЎРѓР ВµР С–Р Т‘Р В° Р В±Р ВµР В· Р С–Р В°Р В»Р С•РЎвЂЎР С”Р С‘ Р С‘ РЎРѓ Р Т‘Р ВµРЎвЂћР С•Р В»РЎвЂљР Р…РЎвЂ№Р С РЎР‚Р В°Р Т‘Р С‘РЎС“РЎРѓР С•Р С Р Р† Р Т‘Р С‘Р В°Р В»Р С•Р С–Р Вµ
		appState.currentMarkerData = {
			lat: latLng.lat,
			lng: latLng.lng,
			temp: true,
			showCircle: false,
			circleRadius: CONFIG.DEFAULT_BS_RADIUS
		};

		// Р С™РЎР‚РЎС“Р С– Р С—Р С•Р Т‘ Р С”РЎС“РЎР‚РЎРѓР С•РЎР‚Р С•Р С РЎС“Р В¶Р Вµ Р С•РЎвЂљР С•Р В±РЎР‚Р В°Р В¶Р В°Р ВµРЎвЂљРЎРѓРЎРЏ РЎвЂЎР ВµРЎР‚Р ВµР В· mousemove, Р ВµРЎРѓР В»Р С‘ Р С–Р В»Р С•Р В±Р В°Р В»РЎРЉР Р…Р С• Р Р†Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р С•
		// Р СњР С• Р Р…Р В° Р Р†РЎРѓРЎРЏР С”Р С‘Р в„– РЎРѓР В»РЎС“РЎвЂЎР В°Р в„– РЎвЂћР С‘Р С”РЎРѓР С‘РЎР‚РЎС“Р ВµР С Р С—Р С•Р В·Р С‘РЎвЂ Р С‘РЎР‹ Р С—Р С•РЎРѓР В»Р Вµ Р С”Р В»Р С‘Р С”Р В°
		if (appState.globalShowCircle && appState.previewCircle) {
			appState.previewCircle.setLatLng(latLng);
			appState.previewCircle.setRadius(appState.globalCircleRadius);
		}

		const nextNumber = getNextBSNumber();
		const defaultName = `Р вЂР В°Р В·Р С•Р Р†Р В°РЎРЏ РЎРѓРЎвЂљР В°Р Р…РЎвЂ Р С‘РЎРЏ ${nextNumber}`;
		document.getElementById('markerName').value = defaultName;
		document.getElementById('markerName').placeholder = defaultName;
		document.getElementById('markerComment').value = '';

		document.getElementById('markerShowCircle').checked = false;
		document.getElementById('markerCircleSlider').value = CONFIG.DEFAULT_BS_RADIUS;
		document.getElementById('markerCircleText').value = CONFIG.DEFAULT_BS_RADIUS;
		document.getElementById('markerCircleControls').style.display = 'none';

		positionDialogNearMarker(clickX, clickY);
		showMarkerDialog(false);

		// Р С™РЎР‚РЎС“Р С– Р С•РЎРѓРЎвЂљР В°РЎвЂРЎвЂљРЎРѓРЎРЏ Р Р…Р В° Р СР ВµРЎРѓРЎвЂљР Вµ Р С”Р В»Р С‘Р С”Р В° Р Т‘Р С• РЎвЂљР ВµРЎвЂ¦ Р С—Р С•РЎР‚, Р С—Р С•Р С”Р В° Р Т‘Р С‘Р В°Р В»Р С•Р С– Р С•РЎвЂљР С”РЎР‚РЎвЂ№РЎвЂљ
		// Р СџР С•РЎРѓР В»Р Вµ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р ВµР Р…Р С‘РЎРЏ Р С‘Р В»Р С‘ Р С•РЎвЂљР СР ВµР Р…РЎвЂ№ РІР‚вЂќ removePreviewCircle() Р Р†РЎвЂ№Р В·РЎвЂ№Р Р†Р В°Р ВµРЎвЂљРЎРѓРЎРЏ Р В°Р Р†РЎвЂљР С•Р СР В°РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С‘
		return;
	}

    // Р В Р ВµР В¶Р С‘Р С РЎР‚Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘РЎРЏ РЎРѓР С•РЎвЂљР С•Р Р†Р С•Р в„– РЎР‚Р В°Р В·Р СР ВµРЎвЂљР С”Р С‘
    if (appState.buildEnabled) {
        // РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚
        // 1. Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЏР ВµР С Р С”Р В»Р С‘Р С” Р С—Р С• РЎС“Р В¶Р Вµ Р В°Р С”РЎвЂљР С‘Р Р†Р Р…Р С•Р в„– (РЎРѓР С‘Р Р…Р ВµР в„–) РЎРЏРЎвЂЎР ВµР в„–Р С”Р Вµ РІвЂ вЂ™ РЎС“Р Т‘Р В°Р В»Р ВµР Р…Р С‘Р Вµ
        // РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚
        let clickedActiveHex = null;
        for (const hex of appState.activeHexes.values()) {
            const screenPos = getHexScreenPosition(hex.q, hex.r);
            if (isPointInHexagon(clickX, clickY, screenPos.x, screenPos.y, screenPos.radius)) {
                clickedActiveHex = hex;
                break;
            }
        }

        if (clickedActiveHex) {
            const key = `${clickedActiveHex.q},${clickedActiveHex.r}`;
            appState.activeHexes.delete(key);

            // Р СџРЎР‚Р С‘Р Р…РЎС“Р Т‘Р С‘РЎвЂљР ВµР В»РЎРЉР Р…Р С• Р С•Р В±Р Р…Р С•Р Р†Р В»РЎРЏР ВµР С Р Р†Р С•Р В·Р СР С•Р В¶Р Р…РЎвЂ№Р Вµ РЎРЏРЎвЂЎР ВµР в„–Р С”Р С‘ Р С‘ Р С—Р ВµРЎР‚Р ВµРЎР‚Р С‘РЎРѓР С•Р Р†РЎвЂ№Р Р†Р В°Р ВµР С
            forceUpdatePossibleHexesAndDraw();

            updateCellCount();
            markMapAsChanged();

            // Р вЂўРЎРѓР В»Р С‘ РЎС“Р Т‘Р В°Р В»Р С‘Р В»Р С‘ Р С—Р С•РЎРѓР В»Р ВµР Т‘Р Р…РЎР‹РЎР‹ РЎРЏРЎвЂЎР ВµР в„–Р С”РЎС“ РІвЂ вЂ™ Р Р†РЎвЂ№Р С”Р В»РЎР‹РЎвЂЎР В°Р ВµР С РЎР‚Р ВµР В¶Р С‘Р С + Р С—Р С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµР С Р С—РЎР‚Р ВµР Т‘Р С—РЎР‚Р С•РЎРѓР СР С•РЎвЂљРЎР‚ Р Р† РЎвЂ Р ВµР Р…РЎвЂљРЎР‚Р Вµ
            if (appState.activeHexes.size === 0) {
                appState.buildEnabled = false;

                const btn = document.getElementById('buildToggleInside');
                if (btn) {
                    btn.textContent = 'Р вЂ™Р С”Р В»РЎР‹РЎвЂЎР С‘РЎвЂљРЎРЉ РЎР‚Р В°Р В·Р СР ВµРЎвЂљР С”РЎС“';
                    btn.classList.remove('active');
                    btn.style.background = '#2a3444';
                    btn.style.color = '#ddd';
                    enableButtonHover(btn);
                }

                appState.possibleHexes.clear();
                updateCursor();
                canvas.style.pointerEvents = 'none';

                // Р РЋР В±РЎР‚Р В°РЎРѓРЎвЂ№Р Р†Р В°Р ВµР С РЎвЂ Р ВµР Р…РЎвЂљРЎР‚ РЎРѓР ВµРЎвЂљР С”Р С‘ Р Р…Р В° РЎвЂљР ВµР С”РЎС“РЎвЂ°Р С‘Р в„– РЎвЂ Р ВµР Р…РЎвЂљРЎР‚ РЎРЊР С”РЎР‚Р В°Р Р…Р В°
                if (appState.leafletMap) {
                    const center = appState.leafletMap.getCenter();
                    appState.gridCenterLat = center.lat;
                    appState.gridCenterLng = center.lng;
                }

                draw();           // РІвЂ С’ Р В·Р Т‘Р ВµРЎРѓРЎРЉ Р Т‘Р С•Р В»Р В¶Р ВµР Р… Р С—Р С•РЎРЏР Р†Р С‘РЎвЂљРЎРЉРЎРѓРЎРЏ Р С—РЎР‚Р ВµР Т‘Р С—РЎР‚Р С•РЎРѓР СР С•РЎвЂљРЎР‚ Р С—Р С• РЎвЂ Р ВµР Р…РЎвЂљРЎР‚РЎС“
                updateCellCount();
            }

            return;
        }

        // РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚
        // 2. Р СџРЎР‚Р С•Р Р†Р ВµРЎР‚РЎРЏР ВµР С Р С”Р В»Р С‘Р С” Р С—Р С• Р Р†Р С•Р В·Р СР С•Р В¶Р Р…Р С•Р в„– (РЎРѓР ВµРЎР‚Р С•Р в„–) РЎРЏРЎвЂЎР ВµР в„–Р С”Р Вµ РІвЂ вЂ™ Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р…Р С‘Р Вµ
        // РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚
        let clickedPossibleHex = null;
        for (const hex of appState.possibleHexes.values()) {
            const screenPos = getHexScreenPosition(hex.q, hex.r);
            if (isPointInHexagon(clickX, clickY, screenPos.x, screenPos.y, screenPos.radius)) {
                clickedPossibleHex = hex;
                break;
            }
        }

        if (clickedPossibleHex) {
            const key = `${clickedPossibleHex.q},${clickedPossibleHex.r}`;
            appState.activeHexes.set(key, { q: clickedPossibleHex.q, r: clickedPossibleHex.r });

            // Р СџРЎР‚Р С‘Р Р…РЎС“Р Т‘Р С‘РЎвЂљР ВµР В»РЎРЉР Р…Р С• Р С•Р В±Р Р…Р С•Р Р†Р В»РЎРЏР ВµР С Р С‘ Р С—Р ВµРЎР‚Р ВµРЎР‚Р С‘РЎРѓР С•Р Р†РЎвЂ№Р Р†Р В°Р ВµР С
            forceUpdatePossibleHexesAndDraw();

            updateCellCount();
            markMapAsChanged();
        }
    }
});

canvas.addEventListener('mousedown', function(e) {
    if (!appState.moveGridEnabled || !appState.leafletMap || appState.activeHexes.size === 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    appState.dragStartPixelX = mouseX;
    appState.dragStartPixelY = mouseY;
    appState.dragStartLat = appState.gridCenterLat;
    appState.dragStartLng = appState.gridCenterLng;
    
    appState.isDragging = true;
    e.preventDefault();
});

canvas.addEventListener('mousemove', function(e) {
    if (!appState.isDragging || !appState.moveGridEnabled || !appState.leafletMap) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const deltaPixelX = mouseX - appState.dragStartPixelX;
    const deltaPixelY = mouseY - appState.dragStartPixelY;
    
    const startPx = appState.leafletMap.latLngToContainerPoint([appState.dragStartLat, appState.dragStartLng]);
    const newPx = { x: startPx.x + deltaPixelX, y: startPx.y + deltaPixelY };
    const newLatLng = appState.leafletMap.containerPointToLatLng([newPx.x, newPx.y]);
    
    appState.gridCenterLat = newLatLng.lat;
    appState.gridCenterLng = newLatLng.lng;
    
    draw();
});

canvas.addEventListener('mouseup', function() { appState.isDragging = false; });

canvas.addEventListener('mouseleave', function() {
    appState.isDragging = false;
    if (appState.bsModeEnabled || appState.objectModeEnabled) canvas.style.cursor = 'crosshair';
});

// Р ВР Р…Р С‘РЎвЂ Р С‘Р В°Р В»Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ Р С•Р В±РЎР‚Р В°Р В±Р С•РЎвЂљРЎвЂЎР С‘Р С”Р С•Р Р† Р С‘Р Р…РЎвЂљР ВµРЎР‚РЎвЂћР ВµР в„–РЎРѓР В°
document.getElementById('radiusSlider').oninput = function() {
    document.getElementById('radiusText').value = this.value;
    applyRadius();
};

document.getElementById('radiusText').addEventListener('blur', applyRadius);
document.getElementById('radiusText').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); applyRadius(); }
});

document.getElementById('rotSlider').oninput = function() {
    document.getElementById('rotText').value = this.value;
    applyRotation();
};

document.getElementById('rotText').addEventListener('blur', applyRotation);
document.getElementById('rotText').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); applyRotation(); }
});

document.getElementById('moveGrid').onchange = function() {
    appState.moveGridEnabled = this.checked;
    updateCursor();
    canvas.style.pointerEvents = (appState.buildEnabled || appState.moveGridEnabled) ? 'auto' : 'none';
    if (appState.leafletMap) {
        if (appState.moveGridEnabled) {
            appState.leafletMap.dragging.disable();
            appState.leafletMap.scrollWheelZoom.disable();
        } else {
            appState.leafletMap.dragging.enable();
            appState.leafletMap.scrollWheelZoom.enable();
        }
    }
    draw();
};

document.getElementById('appState.showHex').onchange = function() {
    appState.showHex = this.checked;
    forceUpdatePossibleHexesAndDraw();
};

document.getElementById('appState.showCenters').onchange = function() {
    appState.showCenters = this.checked;
    forceUpdatePossibleHexesAndDraw();
};

document.getElementById('appState.showCircles').onchange = function() {
    appState.showCircles = this.checked;
    forceUpdatePossibleHexesAndDraw();
};

document.getElementById('markerShowCircle').onchange = function() {
    document.getElementById('markerCircleControls').style.display = this.checked ? 'block' : 'none';
    
    if (appState.currentMarkerData && appState.tempMarker) {
        const circleRadius = parseInt(document.getElementById('markerCircleText').value) || CONFIG.DEFAULT_BS_RADIUS;
        if (this.checked) {
            createPreviewCircle(appState.currentMarkerData.lat, appState.currentMarkerData.lng, circleRadius);
        } else {
            removePreviewCircle();
        }
    }
    
    if (appState.editingMarkerId && appState.leafletMap) {
        const markerIndex = appState.bsMarkers.findIndex(m => m.id === appState.editingMarkerId);
        if (markerIndex !== -1) {
            const marker = appState.bsMarkers[markerIndex];
            const circleRadius = parseInt(document.getElementById('markerCircleText').value) || CONFIG.DEFAULT_BS_RADIUS;
            if (this.checked) {
                createPreviewCircle(marker.lat, marker.lng, circleRadius);
            } else {
                removePreviewCircle();
            }
        }
    }
};

document.getElementById('markerCircleSlider').oninput = function() {
    document.getElementById('markerCircleText').value = this.value;
    if (appState.currentMarkerData && appState.tempMarker && document.getElementById('markerShowCircle').checked) {
        updatePreviewCircle(appState.currentMarkerData.lat, appState.currentMarkerData.lng, parseInt(this.value));
    }
    if (appState.editingMarkerId && appState.leafletMap && document.getElementById('markerShowCircle').checked) {
        const markerIndex = appState.bsMarkers.findIndex(m => m.id === appState.editingMarkerId);
        if (markerIndex !== -1) {
            const marker = appState.bsMarkers[markerIndex];
            updatePreviewCircle(marker.lat, marker.lng, parseInt(this.value));
        }
    }
};

document.getElementById('markerCircleText').addEventListener('blur', function() {
    const value = parseInt(this.value) || CONFIG.DEFAULT_BS_RADIUS;
    const clampedValue = Math.max(CONFIG.MIN_BS_RADIUS, Math.min(CONFIG.MAX_BS_RADIUS, value));
    this.value = clampedValue;
    document.getElementById('markerCircleSlider').value = clampedValue;
    
    if (appState.currentMarkerData && appState.tempMarker && document.getElementById('markerShowCircle').checked) {
        updatePreviewCircle(appState.currentMarkerData.lat, appState.currentMarkerData.lng, clampedValue);
    }
    if (appState.editingMarkerId && appState.leafletMap && document.getElementById('markerShowCircle').checked) {
        const markerIndex = appState.bsMarkers.findIndex(m => m.id === appState.editingMarkerId);
        if (markerIndex !== -1) {
            const marker = appState.bsMarkers[markerIndex];
            updatePreviewCircle(marker.lat, marker.lng, clampedValue);
        }
    }
});

document.getElementById('markerCircleText').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        this.blur();
    }
});

document.querySelector('.file-btn-close').addEventListener('click', reset);

window.onresize = function() {
    resize();
    updateControlWindowHeight();
};

document.addEventListener('click', function(e) {
    // Р вЂўРЎРѓР В»Р С‘ Р С”Р В»Р С‘Р С” Р Р…Р Вµ Р С—Р С• Р С—Р С•Р В»Р С‘Р С–Р С•Р Р…РЎС“, Р Р…Р Вµ Р С—Р С• Р С—Р С•Р С—Р В°Р С—РЎС“ Р С‘ Р Р…Р Вµ Р С—Р С• Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…Р В°Р С
    if (!e.target.closest('.leaflet-popup') && 
        !e.target.closest('.leaflet-interactive') && 
        !e.target.closest('.zone-vertex-marker') && 
        !e.target.closest('.zone-mid-vertex-marker')) {
        
        if (appState.leafletMap) {
            appState.leafletMap.closePopup();
            
            // Р РЋР С”РЎР‚РЎвЂ№Р Р†Р В°Р ВµР С Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…РЎвЂ№ РЎвЂљР С•Р В»РЎРЉР С”Р С• Р ВµРЎРѓР В»Р С‘ РЎРЊРЎвЂљР С• Р Р…Р Вµ Р С”Р В»Р С‘Р С” Р С—Р С• Р Р†Р ВµРЎР‚РЎв‚¬Р С‘Р Р…Р Вµ
            if (appState.selectedZoneId) {
                const zone = appState.zones.find(z => z.id === appState.selectedZoneId);
                if (zone) {
                    hideZoneVertices(zone);
                }
                appState.selectedZoneId = null;
                updateZoneList();
            }
        }
    }
});

window.onload = () => {
    resize();

    // Р ВР Р…Р С‘РЎвЂ Р С‘Р В°Р В»Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ РЎРЊР В»Р ВµР СР ВµР Р…РЎвЂљР С•Р Р† РЎС“Р С—РЎР‚Р В°Р Р†Р В»Р ВµР Р…Р С‘РЎРЏ РЎРѓР ВµРЎвЂљР С”Р С•Р в„–
    document.getElementById('radiusSlider').min = CONFIG.MIN_RADIUS;
    document.getElementById('radiusSlider').max = CONFIG.MAX_RADIUS;
    document.getElementById('radiusSlider').value = CONFIG.DEFAULT_RADIUS;
    document.getElementById('radiusSlider').step = 10;

    document.getElementById('rotSlider').min = -180;
    document.getElementById('rotSlider').max = 180;
    document.getElementById('rotSlider').value = 0;
    document.getElementById('rotSlider').step = 1;

    document.getElementById('radiusText').value = CONFIG.DEFAULT_RADIUS.toString();
    document.getElementById('rotText').value = '0';
    document.getElementById('moveGrid').checked = false;

    setNetworkSectionState(false);

    // Р ВР Р…Р С‘РЎвЂ Р С‘Р В°Р В»Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ РЎРЊР В»Р ВµР СР ВµР Р…РЎвЂљР С•Р Р† РЎС“Р С—РЎР‚Р В°Р Р†Р В»Р ВµР Р…Р С‘РЎРЏ Р вЂР РЋ
    document.getElementById('markerCircleSlider').min = CONFIG.MIN_BS_RADIUS;
    document.getElementById('markerCircleSlider').max = CONFIG.MAX_BS_RADIUS;
    document.getElementById('markerCircleSlider').value = CONFIG.DEFAULT_BS_RADIUS;
    document.getElementById('markerCircleSlider').step = 10;
    document.getElementById('markerCircleText').value = CONFIG.DEFAULT_BS_RADIUS.toString();

    // Р ВР Р…Р С‘РЎвЂ Р С‘Р В°Р В»Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ Р С–Р В»Р С•Р В±Р В°Р В»РЎРЉР Р…РЎвЂ№РЎвЂ¦ Р Р…Р В°РЎРѓРЎвЂљРЎР‚Р С•Р ВµР С” РЎР‚Р В°Р Т‘Р С‘РЎС“РЎРѓР В° Р вЂР РЋ
    appState.globalShowCircle = document.getElementById('globalShowCircle').checked;
    appState.globalCircleRadius = parseInt(document.getElementById('globalCircleText').value) || CONFIG.DEFAULT_BS_RADIUS;

    // Р С›Р В±РЎР‚Р В°Р В±Р С•РЎвЂљРЎвЂЎР С‘Р С”Р С‘ Р С–Р В»Р С•Р В±Р В°Р В»РЎРЉР Р…Р С•Р С–Р С• Р С—Р ВµРЎР‚Р ВµР С”Р В»РЎР‹РЎвЂЎР В°РЎвЂљР ВµР В»РЎРЏ Р С‘ РЎР‚Р В°Р Т‘Р С‘РЎС“РЎРѓР В°
	document.getElementById('globalShowCircle').onchange = function() {
		appState.globalShowCircle = this.checked;
		redrawAllBSCirclesWithGlobalOverride();
	};

    document.getElementById('globalCircleSlider').oninput = function() {
		document.getElementById('globalCircleText').value = this.value;
		appState.globalCircleRadius = parseInt(this.value) || CONFIG.DEFAULT_BS_RADIUS;
		redrawAllBSCirclesWithGlobalOverride();
	};

    document.getElementById('globalCircleText').onblur = function() {
		let val = parseInt(this.value) || CONFIG.DEFAULT_BS_RADIUS;
		val = Math.max(CONFIG.MIN_BS_RADIUS, Math.min(CONFIG.MAX_BS_RADIUS, val));
		this.value = val;
		document.getElementById('globalCircleSlider').value = val;
		appState.globalCircleRadius = val;
		redrawAllBSCirclesWithGlobalOverride();
	};
	
	document.getElementById('globalCircleText').onkeydown = function(e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			this.blur();
		}
	};

    // Р ВР Р…Р С‘РЎвЂ Р С‘Р В°Р В»Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ Р С”Р Р…Р С•Р С—Р С”Р С‘ Р Р† РЎР‚Р В°Р В·Р Т‘Р ВµР В»Р Вµ Р В¤Р В°Р в„–Р В»
    updateFileToggleButton();

    // Р ВР Р…Р С‘РЎвЂ Р С‘Р В°Р В»Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ РЎР‚Р В°Р Т‘Р С‘Р С•Р С”Р Р…Р С•Р С—Р С•Р С” Р Р† РЎР‚Р В°Р В·Р Т‘Р ВµР В»Р Вµ Р С™Р В°РЎР‚РЎвЂљР В°
    const mapOptions = document.querySelectorAll('.map-option');
    mapOptions.forEach(option => {
        const clickAttr = option.getAttribute('data-click');
        if (clickAttr) {
            const match = clickAttr.match(/selectMapType\('([^']+)'\)/);
            if (match) {
                const value = match[1];
                const radio = option.querySelector('input[type="radio"]');
                if (radio) {
                    radio.value = value;
                    if (value === 'osm') {
                        radio.checked = true;
                        option.classList.add('selected');
                        appState.bgMode = value;
                    }
                }
            }
        }
    });

    // Р ВР Р…Р С‘РЎвЂ Р С‘Р В°Р В»Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ РЎРѓРЎвЂЎР ВµРЎвЂљРЎвЂЎР С‘Р С”Р В° Р В·Р С•Р Р…
    document.getElementById('zoneCount').textContent = 'Р С™Р С•Р В»Р С‘РЎвЂЎР ВµРЎРѓРЎвЂљР Р†Р С• Р В·Р С•Р Р…: 0';

    if (!appState.bgMode || appState.bgMode === '') appState.bgMode = 'osm';

    // Р ВР Р…Р С‘РЎвЂ Р С‘Р В°Р В»Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ Р С”Р В°РЎР‚РЎвЂљРЎвЂ№
    initBackground();

    // Р ВР Р…Р С‘РЎвЂ Р С‘Р В°Р В»Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ Р Р†РЎвЂ№РЎРѓР С•РЎвЂљРЎвЂ№ Р С—Р В°Р Р…Р ВµР В»Р С‘ Р Р…Р В°РЎРѓРЎвЂљРЎР‚Р С•Р ВµР С”
    updateControlWindowHeight();

    // Р С›Р В±РЎР‚Р В°Р В±Р С•РЎвЂљРЎвЂЎР С‘Р С”Р С‘ Р С”Р Р…Р С•Р С—Р С•Р С” РЎвЂћР В°Р в„–Р В»Р С•Р Р†Р С•Р С–Р С• Р СР ВµР Р…РЎР‹
    document.querySelector('.file-btn-open').addEventListener('click', () => alert('Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘РЎРЏ "Р С›РЎвЂљР С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ" Р Р† РЎР‚Р В°Р В·РЎР‚Р В°Р В±Р С•РЎвЂљР С”Р Вµ'));
    document.querySelector('.file-btn-save').addEventListener('click', () => alert('Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘РЎРЏ "Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…Р С‘РЎвЂљРЎРЉ" Р Р† РЎР‚Р В°Р В·РЎР‚Р В°Р В±Р С•РЎвЂљР С”Р Вµ'));
    document.querySelector('.file-btn-save-image').addEventListener('click', () => alert('Р В¤РЎС“Р Р…Р С”РЎвЂ Р С‘РЎРЏ "Р РЋР С•РЎвЂ¦РЎР‚Р В°Р Р…Р С‘РЎвЂљРЎРЉ Р С‘Р В·Р С•Р В±РЎР‚Р В°Р В¶Р ВµР Р…Р С‘Р Вµ" Р Р† РЎР‚Р В°Р В·РЎР‚Р В°Р В±Р С•РЎвЂљР С”Р Вµ'));

    // Р ВР Р…Р С‘РЎвЂ Р С‘Р В°Р В»Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ РЎРѓР С—Р С‘РЎРѓР С”Р В° Р С•Р В±РЎР‰Р ВµР С”РЎвЂљР С•Р Р†
    updateObjectList();

    // Р С›Р В±Р Р…Р С•Р Р†Р В»Р ВµР Р…Р С‘Р Вµ РЎРѓРЎвЂЎРЎвЂРЎвЂљРЎвЂЎР С‘Р С”Р В° РЎРЏРЎвЂЎР ВµР ВµР С”
    updateCellCount();

    // Р С›Р В±РЎР‚Р В°Р В±Р С•РЎвЂљРЎвЂЎР С‘Р С” Р С—Р ВµРЎР‚Р ВµР С”Р В»РЎР‹РЎвЂЎР В°РЎвЂљР ВµР В»РЎРЏ РЎвЂљР ВµРЎР‚РЎР‚Р С‘РЎвЂљР С•РЎР‚Р С‘Р С‘
    const territoryToggle = document.getElementById('territoryToggle');
    const territorySection = document.querySelector('.accordion-section:has(#territoryToggle)');
    if (territoryToggle && territorySection) {
        territoryToggle.addEventListener('change', function(e) {
            if (this.checked) {
                territorySection.classList.remove('disabled');
                showAllZones();
            } else {
                if (appState.zoneModeEnabled) {
                    cancelPolygon();
                    appState.zoneModeEnabled = false;
                    appState.currentZoneColor = null;
                    const zoneBtn = document.getElementById('createZoneBtn');
                    if (zoneBtn) {
                        zoneBtn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В·Р С•Р Р…РЎС“';
                        zoneBtn.classList.remove('active');
                        zoneBtn.style.background = '#2a3444';
                        zoneBtn.style.color = '#ddd';
                    }
                    if (appState.leafletMap) {
                        appState.leafletMap.dragging.enable();
                        appState.leafletMap.off('click', onMapClickForZone);
                        appState.leafletMap.off('mousemove', onMapMouseMoveForZone);
                    }
                    canvas.style.pointerEvents = 'none';
                    updateCursor();
                }
                territorySection.classList.add('disabled');
                hideAllZones();
                if (appState.selectedZoneId) {
                    appState.selectedZoneId = null;
                    updateZoneList();
                }
            }
        });
    }

    // Enter Р Р† Р С—Р С•Р В»РЎРЏРЎвЂ¦ РЎР‚Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°Р Р…Р С‘РЎРЏ Р В·Р С•Р Р…РЎвЂ№
    document.getElementById('zoneName').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveZone();
        }
    });

    document.getElementById('zoneComment').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            saveZone();
        }
    });

    // Р СџР ВµРЎР‚Р ВµР С”Р В»РЎР‹РЎвЂЎР В°РЎвЂљР ВµР В»РЎРЉ РЎРѓР С•РЎвЂљР С•Р Р†Р С•Р в„– РЎР‚Р В°Р В·Р СР ВµРЎвЂљР С”Р С‘
    const networkToggle = document.getElementById('networkToggle');
    if (networkToggle) {
        setNetworkSectionState(false);
        networkToggle.addEventListener('change', function(e) {
            if (this.checked) {
                setNetworkSectionState(true);
                showCellularGrid();
            } else {
                setNetworkSectionState(false);
                hideCellularGrid();
                if (appState.buildEnabled) {
                    appState.buildEnabled = false;
                    const buildBtn = document.getElementById('buildToggleInside');
                    if (buildBtn) {
                        buildBtn.textContent = 'Р В Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ РЎР‚Р В°Р В·Р СР ВµРЎвЂљР С”РЎС“';
                        buildBtn.classList.remove('active');
                        buildBtn.style.background = '#2a3444';
                        buildBtn.style.color = '#ddd';
                        enableButtonHover(buildBtn);
                    }
                    appState.possibleHexes.clear();
                    updateCursor();
                    canvas.style.pointerEvents = 'none';
                    draw();
                }
                if (appState.moveGridEnabled) {
                    appState.moveGridEnabled = false;
                    document.getElementById('moveGrid').checked = false;
                    if (appState.leafletMap) {
                        appState.leafletMap.dragging.enable();
                        appState.leafletMap.scrollWheelZoom.enable();
                    }
                    updateCursor();
                }
            }
        });
    }
	
	// Р вЂ™РЎР‚Р ВµР СР ВµР Р…Р Р…Р С• Р С—Р С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµР С Р С”РЎР‚РЎС“Р С– Р С—Р С•Р Т‘ Р С”РЎС“РЎР‚РЎРѓР С•РЎР‚Р С•Р С Р Р† РЎР‚Р ВµР В¶Р С‘Р СР Вµ РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р вЂР РЋ, Р ВµРЎРѓР В»Р С‘ Р С–Р В»Р С•Р В±Р В°Р В»РЎРЉР Р…Р С• Р Р†Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…Р С•
	appState.leafletMap.on('mousemove', function(e) {
		if (!appState.bsModeEnabled) {
			// Р СњР вЂў РЎС“Р Т‘Р В°Р В»РЎРЏР ВµР С Р С”РЎР‚РЎС“Р С–, Р ВµРЎРѓР В»Р С‘ РЎР‚Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚РЎС“Р ВµР С РЎРѓРЎС“РЎвЂ°Р ВµРЎРѓРЎвЂљР Р†РЎС“РЎР‹РЎвЂ°РЎС“РЎР‹ Р вЂР РЋ
			if (!appState.editingMarkerId) {
				removePreviewCircle();
			}
			return;
		}

		const latlng = e.latlng;

		if (appState.globalShowCircle) {
			if (!appState.previewCircle) {
				appState.previewCircle = L.circle(latlng, {
					radius: appState.globalCircleRadius,
					color: '#ff8888',           // РЎвЂЎРЎС“РЎвЂљРЎРЉ РЎРѓР Р†Р ВµРЎвЂљР В»Р ВµР Вµ, РЎвЂЎРЎвЂљР С•Р В±РЎвЂ№ Р С•РЎвЂљР В»Р С‘РЎвЂЎР В°РЎвЂљРЎРЉ Р С•РЎвЂљ РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…РЎвЂР Р…Р Р…РЎвЂ№РЎвЂ¦
					fillColor: '#ff8888',
					fillOpacity: 0.15,
					weight: 2,
					dashArray: '5, 5'
				}).addTo(appState.leafletMap);
			} else {
				appState.previewCircle.setLatLng(latlng);
				appState.previewCircle.setRadius(appState.globalCircleRadius);
			}
		} else {
			removePreviewCircle();
		}
	});
	
};

// Р С›Р В±РЎР‚Р В°Р В±Р С•РЎвЂљРЎвЂЎР С‘Р С” Р С”Р В»Р В°Р Р†Р С‘РЎв‚¬Р С‘ Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Р СџРЎР‚Р С‘Р С•РЎР‚Р С‘РЎвЂљР ВµРЎвЂљ 1: Р вЂ”Р В°Р С”РЎР‚РЎвЂ№Р Р†Р В°Р ВµР С Р С•РЎвЂљР С”РЎР‚РЎвЂ№РЎвЂљРЎвЂ№Р Вµ Р Т‘Р С‘Р В°Р В»Р С•Р С–Р С‘
        const markerDialog = document.getElementById('markerDialog');
        if (markerDialog.classList.contains('active')) {
            cancelMarker();
            return;
        }
        
        const objectDialog = document.getElementById('objectDialog');
        if (objectDialog.classList.contains('active')) {
            cancelObject();
            return;
        }
        
        const zoneDialog = document.getElementById('zoneDialog');
        if (zoneDialog.classList.contains('active')) {
            cancelZone();
            return;
        }
        
        // Р СџРЎР‚Р С‘Р С•РЎР‚Р С‘РЎвЂљР ВµРЎвЂљ 2: Р С›РЎвЂљР СР ВµР Р…Р В° РЎР‚Р ВµР В¶Р С‘Р СР В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р В·Р С•Р Р…
        if (appState.zoneModeEnabled) {
            e.preventDefault();
            
            appState.zoneModeEnabled = false;
            appState.currentZoneColor = null;
            
            const btn = document.getElementById('createZoneBtn');
            btn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В·Р С•Р Р…РЎС“';
            btn.classList.remove('active');
            btn.style.background = '#2a3444';
            btn.style.color = '#ddd';
            
            cancelPolygon();
            
            if (appState.leafletMap) {
                appState.leafletMap.dragging.enable();
                appState.leafletMap.off('click', onMapClickForZone);
                appState.leafletMap.off('mousemove', onMapMouseMoveForZone);
            }
            
            canvas.style.pointerEvents = 'none';
            updateCursor();
            return;
        }
        
        // Р СџРЎР‚Р С‘Р С•РЎР‚Р С‘РЎвЂљР ВµРЎвЂљ 3: Р С›РЎвЂљР СР ВµР Р…Р В° РЎР‚Р ВµР В¶Р С‘Р СР В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р вЂР РЋ
        if (appState.bsModeEnabled) {
            e.preventDefault();
            
            appState.bsModeEnabled = false;
            const createBsBtn = document.getElementById('createBsBtn');
            if (createBsBtn) {
                createBsBtn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р В±Р В°Р В·Р С•Р Р†РЎС“РЎР‹ РЎРѓРЎвЂљР В°Р Р…РЎвЂ Р С‘РЎР‹';
                createBsBtn.classList.remove('active');
                createBsBtn.style.background = '#2a3444';
                createBsBtn.style.color = '#ddd';
                createBsBtn.style.border = 'none';
                enableButtonHover(createBsBtn);
            }
            
            removeTempMarker();
            removePreviewCircle();
            
            if (appState.leafletMap) {
                appState.leafletMap.dragging.enable();
            }
            
            canvas.style.pointerEvents = 'none';
            document.body.classList.remove('bs-cursor');
            updateCursor();
            return;
        }
        
        // Р СџРЎР‚Р С‘Р С•РЎР‚Р С‘РЎвЂљР ВµРЎвЂљ 4: Р С›РЎвЂљР СР ВµР Р…Р В° РЎР‚Р ВµР В¶Р С‘Р СР В° РЎРѓР С•Р В·Р Т‘Р В°Р Р…Р С‘РЎРЏ Р С•Р В±РЎР‰Р ВµР С”РЎвЂљР С•Р Р†
        if (appState.objectModeEnabled) {
            e.preventDefault();
            
            appState.objectModeEnabled = false;
            const btn = document.getElementById('createObjectBtn');
            btn.textContent = 'Р РЋР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ Р С•Р В±РЎР‰Р ВµР С”РЎвЂљ';
            btn.classList.remove('active');
            btn.style.background = '#2a3444';
            btn.style.color = '#ddd';
            btn.style.border = 'none';
            enableButtonHover(btn);
            
            removeTempObjectMarker();
            
            if (appState.leafletMap && !appState.moveGridEnabled && !appState.buildEnabled && !appState.bsModeEnabled) {
                appState.leafletMap.dragging.enable();
                appState.leafletMap.scrollWheelZoom.enable();
            }
            
            canvas.style.pointerEvents = 'none';
            document.body.classList.remove('bs-cursor');
            updateCursor();
            return;
        }
        
        // Р СџРЎР‚Р С‘Р С•РЎР‚Р С‘РЎвЂљР ВµРЎвЂљ 5: Р С›РЎвЂљР СР ВµР Р…Р В° РЎР‚Р ВµР В¶Р С‘Р СР В° РЎРѓР С•РЎвЂљР С•Р Р†Р С•Р в„– РЎР‚Р В°Р В·Р СР ВµРЎвЂљР С”Р С‘
        if (appState.buildEnabled) {
            e.preventDefault();
            
            appState.buildEnabled = false;
            const buildBtn = document.getElementById('buildToggleInside');
            if (buildBtn) {
                buildBtn.textContent = 'Р В Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ РЎР‚Р В°Р В·Р СР ВµРЎвЂљР С”РЎС“';
                buildBtn.classList.remove('active');
                buildBtn.style.background = '#2a3444';
                buildBtn.style.color = '#ddd';
                enableButtonHover(buildBtn);
            }
            
            appState.possibleHexes.clear();
            
            // Р вЂ™РЎвЂ№Р С”Р В»РЎР‹РЎвЂЎР В°Р ВµР С РЎР‚Р ВµР В¶Р С‘Р С Р С—Р ВµРЎР‚Р ВµР СР ВµРЎвЂ°Р ВµР Р…Р С‘РЎРЏ РЎР‚Р В°Р В·Р СР ВµРЎвЂљР С”Р С‘, Р ВµРЎРѓР В»Р С‘ Р В±РЎвЂ№Р В» Р Р†Р С”Р В»РЎР‹РЎвЂЎР ВµР Р…
            if (appState.moveGridEnabled) {
                appState.moveGridEnabled = false;
                document.getElementById('moveGrid').checked = false;
                if (appState.leafletMap) {
                    appState.leafletMap.dragging.enable();
                }
            }
            
            canvas.style.pointerEvents = 'none';
            updateCursor();
            draw();
            return;
        }
    }
});
export const actionHandlers = {
    toggleAccordion,
    reset,
    changeMap,
    selectMapType,
    toggleZoneMode,
    toggleBuild,
    toggleBSMode,
    createObject,
    importObjects,
    showBSCircleTooltip,
    hideBSCircleTooltip,
    showAnalyticsTooltip,
    hideAnalyticsTooltip,
    saveZone,
    cancelZone,
    deleteZoneFromDialog,
    saveMarker,
    cancelMarker,
    deleteMarker,
    saveObject,
    cancelObject,
    deleteObject,
    editZone,
    deleteZoneById,
    deleteVertex,
    editObject,
    deleteObjectById,
    editMarker,
    deleteMarkerById
};
