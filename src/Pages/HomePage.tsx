// src/Pages/HomePage.tsx
import React, { useState, FormEvent } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import RoutingMachine from "../components/RoutingMachine";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// ================================
// Função de Geocoding Estruturado, versão com debug
// ================================
async function geocodeAddressStructured(
  logradouro: string,
  numero: string,
  cidade: string,
  estado?: string,
  pais?: string,
  bairro?: string,
  cep?: string
): Promise<{ lat: number; lng: number }> {
  const params = new URLSearchParams({
    format: "json",
    limit: "1",
    street: `${logradouro} ${numero}`,  // ex: "Rua das Borboletas 22"
    city: cidade,                       // ex: "Santos"
  });

  // Se tiver bairro, anexa como parâmetro extra (pode ajudar a filtrar)
  if (bairro) {
    params.append("neighbourhood", bairro);
  }
  if (estado) {
    params.append("state", estado);     // ex: "São Paulo"
  }
  if (pais) {
    params.append("country", pais);     // ex: "Brazil"
  }
  if (cep) {
    params.append("postalcode", cep);   // ex: "11015-010"
  }

  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

  // Debug: imprima a URL exata para testar no navegador
  console.log("Chamando Nominatim URL:", url);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "meu-app-exemplo/1.0 (seu-email@exemplo.com)",
    },
  });
  const data = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    importance?: number;
  }>;

  // Debug: imprima o JSON retornado
  console.log("Nominatim retornou:", data);

  if (!data || data.length === 0) {
    throw new Error(
      `Endereço não encontrado (busca estruturada): ${logradouro}, ${numero}, ${cidade}` +
        (bairro ? `, bairro ${bairro}` : "") +
        (cep ? `, CEP ${cep}` : "")
    );
  }

  // Se existirem multiple resultados, você pode inspecionar data[0].importance para ver se é confiável
  // Ou mostrar data[0].display_name para entender o que ele achou
  console.log("Melhor correspondência:", data[0].display_name, " (importance:", data[0].importance, ")");

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
}

export default function HomePage() {
  const [showForm, setShowForm] = useState(true);
  // Começa com 2 campos: origem e destino. Usuário pode adicionar paradas (bairro e CEP podem ser incluídos no mesmo campo, separados por vírgula).
  const [addresses, setAddresses] = useState<string[]>(["", ""]);
  const [waypointsCoords, setWaypointsCoords] = useState<
    Array<{ lat: number; lng: number }>
  >([]);

  function addAddressField() {
    setAddresses((prev) => [...prev, ""]);
  }

  function removeAddressField(index: number) {
    if (addresses.length <= 2) return;
    setAddresses((prev) => prev.filter((_, idx) => idx !== index));
  }

  function updateAddressText(index: number, text: string) {
    setAddresses((prev) => prev.map((addr, idx) => (idx === index ? text : addr)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (addresses.length < 2) {
      alert("Informe ao menos origem e destino.");
      return;
    }
    for (let i = 0; i < addresses.length; i++) {
      if (!addresses[i].trim()) {
        alert(`Preencha o campo ${i + 1} antes de calcular a rota.`);
        return;
      }
    }

    try {
      // Geocodifica cada endereço. A ideia é extrair logradouro, número, cidade, bairro e CEP se vierem junto
      const coordsPromises = addresses.map((end) => {
        // Como exemplo de parsing simples, vamos assumir que usuário usou vírgulas:
        // "Rua X, 22, Bairro Y, Cidade Z, Estado W, 12345-678"
        const partes = end.split(",").map((s) => s.trim());
        if (partes.length < 3) {
          // Se tiver menos de 3 partes, é improvável que tenha número e cidade separados
          throw new Error(
            `Formato inválido: "${end}". Use pelo menos "Rua X, 22, Cidade Z".`
          );
        }
        const logradouro = partes[0];            // ex: "Rua das Borboletas"
        const numero = partes[1];                // ex: "22"
        let bairro = "";
        let cidade = "";
        let estado = "";
        let cep = "";

        // Se houver 3 partes exatamente, interpretamos como [logradouro, número, cidade]
        if (partes.length === 3) {
          cidade = partes[2];
        } else {
          // Se tiver >3, podemos tentar extrair bairro e/ou estado e/ou cep
          // Ex: ["Rua X", "22", "Bairro Y", "Cidade Z"] → bairro=partes[2], cidade=partes[3]
          bairro = partes[2];
          cidade = partes[3] || "";
          if (partes.length >= 5) {
            estado = partes[4] || "";
          }
          if (partes.length >= 6) {
            cep = partes[5] || "";
          }
        }

        return geocodeAddressStructured(
          logradouro,
          numero,
          cidade,
          estado,
          "Brazil", 
          bairro,
          cep
        );
      });

      const coordsArray = await Promise.all(coordsPromises);
      const coordsString = coordsArray.map((pt) => `${pt.lng},${pt.lat}`).join(";");

      // Trip Service com roundtrip=false & source=first & destination=last
      const tripUrl = `https://router.project-osrm.org/trip/v1/driving/${coordsString}?roundtrip=false&source=first&destination=last`;
      console.log("Chamando OSRM Trip URL:", tripUrl);

      const tripResponse = await fetch(tripUrl);
      const tripData = await tripResponse.json();

      if (tripData.code !== "Ok" || !tripData.waypoints) {
        console.error("Erro no OSRM Trip:", tripData);
        alert("Não foi possível otimizar a rota. Tente novamente.");
        return;
      }

      const orderedWaypoints = tripData.waypoints
        .slice()
        .sort((a: any, b: any) => a.trips_index - b.trips_index)
        .map((wp: any) => coordsArray[wp.waypoint_index]);

      setWaypointsCoords(orderedWaypoints);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao processar a rota.");
    }
  }

  return (
    <div className="w-screen h-screen flex flex-col">
      <div className="p-4 bg-gray-200">
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showForm ? "Ocultar formulário" : "Mostrar formulário"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-4 bg-gray-100 flex flex-col gap-4"
        >
          <h2 className="text-xl font-semibold">
            Informe os endereços (incluindo número, cidade, bairro e CEP se possível):
          </h2>

          {addresses.map((addr, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1 flex flex-col">
                <label className="font-medium">
                  {idx === 0
                    ? "Origem"
                    : idx === addresses.length - 1
                    ? "Destino"
                    : `Parada ${idx}`}
                </label>
                <input
                  type="text"
                  placeholder={
                    idx === 0
                      ? "Ex: Rua das Borboletas, 22, Santos"
                      : idx === addresses.length - 1
                      ? "Ex: Av. da Praia, 150, Santos"
                      : "Ex: Rua X, 123, Bairro Y, Cidade Z"
                  }
                  value={addr}
                  onChange={(e) => updateAddressText(idx, e.target.value)}
                  className="px-3 py-2 border rounded-md w-full"
                />
              </div>

              {addresses.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeAddressField(idx)}
                  className="px-2 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={addAddressField}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + Adicionar parada
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Calcular rota otimizada
            </button>
          </div>
        </form>
      )}

      <div className="flex-1">
        <MapContainer
          center={[-23.55052, -46.633308]}
          zoom={13}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">
              OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {waypointsCoords.length >= 2 && (
            <RoutingMachine waypoints={waypointsCoords} />
          )}

          {waypointsCoords.map((pt, idx) => (
            <Marker key={idx} position={pt}>
              <Popup>
                {idx === 0
                  ? "Origem"
                  : idx === waypointsCoords.length - 1
                  ? "Destino"
                  : `Parada ${idx}`}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
