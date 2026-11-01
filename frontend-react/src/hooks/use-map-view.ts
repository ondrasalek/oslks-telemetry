import { useState } from 'react';

export const MAP_VIEWS = ['map', 'globe'] as const;
export type MapView = (typeof MAP_VIEWS)[number];

const STORAGE_KEY = 'locations-view';

/** The last view the viewer picked; a per-viewer convenience, so storage may be unavailable. */
function readView(): MapView {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'globe' ? 'globe' : 'map';
    } catch {
        return 'map';
    }
}

/** Flat map or globe, remembered per viewer and shared by every card that draws one. */
export function useMapView(): [MapView, (next: MapView) => void] {
    const [view, setView] = useState<MapView>(readView);

    const choose = (next: MapView) => {
        setView(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Storage unavailable: the choice just lasts for this visit.
        }
    };

    return [view, choose];
}
