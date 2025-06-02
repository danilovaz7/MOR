// src/components/RoutingMachine.tsx
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-routing-machine";

interface RoutingMachineProps {
  waypoints: Array<{ lat: number; lng: number }>;
}

export default function RoutingMachine({ waypoints }: RoutingMachineProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || waypoints.length < 2) return; // precisa de, pelo menos, dois pontos para traçar rota

    // Cria um novo controle de rota sempre que `waypoints` mudar
    const control = L.Routing.control({
      waypoints: waypoints.map((pt) => L.latLng(pt.lat, pt.lng)),
      fitSelectedRoutes: true,    // auto-zoom no polígono
      showAlternatives: false,    
      addWaypoints: false,        // não permite clicar na linha para inserir ponto
      routeWhileDragging: false,  
      lineOptions: {
        styles: [{ color: "#0074D9", weight: 4 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0,
      },
      router: L.Routing.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1",
      }),
    }).addTo(map);

    return () => {
      map.removeControl(control);
    };
  }, [map, waypoints]);

  return null;
}
