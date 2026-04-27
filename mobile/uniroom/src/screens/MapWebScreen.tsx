import mapboxgl from "mapbox-gl"
import React, { useEffect, useRef } from "react"

mapboxgl.accessToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN as string

export default function MapScreen() {
    const mapContainer = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }, []);
 useEffect(() => {
  const link = document.createElement('link');
  link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}, []);
    useEffect(() => {
        if (!mapContainer.current) return

        const map = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/streets-v11",
            center: [-101.186311, 19.723090],
            zoom: 13
        })

        return () => map.remove()
    }, [])

    return (
        <div
            ref={mapContainer}
            style={{
                width: "100%",
                height: "100vh"
            }}
        />
    )
}