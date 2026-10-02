#!/usr/bin/env python3
"""Import OSM rail topology as a reproducible, offline game catalog (ODbL 1.0)."""
import argparse
import collections
import datetime
import heapq
import json
import math
import pathlib
import re
import subprocess
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
QUERY = '''[out:json][timeout:180];
area["ISO3166-1"="ID"]["admin_level"="2"]->.country;
(way["railway"="rail"](area.country);nwr["railway"~"^(station|halt)$"](area.country););
out body; >; out skel qt;'''


def distance(a, b):
    lat, lng = math.radians(b[0] - a[0]), math.radians(b[1] - a[1])
    h = math.sin(lat / 2) ** 2 + math.cos(math.radians(a[0])) * math.cos(math.radians(b[0])) * math.sin(lng / 2) ** 2
    return 6371 * 2 * math.asin(min(1, math.sqrt(h)))


def shortest(graph, start, end):
    queue, best, previous = [(0, start)], {start: 0}, {}
    while queue:
        cost, current = heapq.heappop(queue)
        if cost != best.get(current):
            continue
        if current == end:
            path = []
            while current != start:
                current, edge = previous[current]
                path.append(edge)
            return path[::-1]
        for target, weight, edge in graph.get(current, []):
            candidate = cost + weight
            if candidate < best.get(target, math.inf):
                best[target], previous[target] = candidate, (current, edge)
                heapq.heappush(queue, (candidate, target))
    return None


def compile_network(data, legacy_stations=(), legacy_tracks=()):
    if not isinstance(data.get("elements"), list) or data.get("remark"):
        raise ValueError("Incomplete/error Overpass response; refusing to replace the catalog")
    elements = {}
    for item in data["elements"]:
        key = item.get("type"), item.get("id")
        previous = elements.get(key, {})
        elements[key] = {**previous, **item, "tags": {**previous.get("tags", {}), **item.get("tags", {})}}
    nodes = {id: (e["lat"], e["lon"]) for (kind, id), e in elements.items() if kind == "node" and "lat" in e and "lon" in e}
    if any(not isinstance(value, (float, int)) or not math.isfinite(value) for point in nodes.values() for value in point):
        raise ValueError("Invalid geographic coordinates")
    if any(not -90 <= point[0] <= 90 or not -180 <= point[1] <= 180 for point in nodes.values()):
        raise ValueError("Coordinates outside valid latitude/longitude bounds")
    way_tags = {}
    adjacency, owners = collections.defaultdict(set), collections.defaultdict(set)
    for (kind, id), way in elements.items():
        tags = way.get("tags", {})
        if kind != "way" or tags.get("railway") != "rail":
            continue
        if tags.get("service") in {"yard", "siding", "spur"} or tags.get("usage") in {"industrial", "military", "test", "tourism"}:
            continue
        if tags.get("gauge") and "1067" not in tags["gauge"].split(";"):
            continue  # Excludes incompatible high-speed/MRT networks.
        way_tags[id] = {"tags": tags, "nodes": way.get("nodes", [])}
        sequence = way.get("nodes", [])
        for a, b in zip(sequence, sequence[1:]):
            if a not in nodes or b not in nodes:
                raise ValueError(f"Way {id} is missing geometry nodes")
            if a == b:
                continue
            adjacency[a].add(b)
            adjacency[b].add(a)
            owners[tuple(sorted((a, b)))].add(id)
    if not adjacency:
        raise ValueError("No compatible railway geometry in input")
    cells = collections.defaultdict(list)
    def cell(point):
        return math.floor(point[0] / 0.005), math.floor(point[1] / 0.005)
    for id in adjacency:
        cells[cell(nodes[id])].append(id)
    def snap(point):
        x, y = cell(point)
        candidates = [id for dx in range(-2, 3) for dy in range(-2, 3) for id in cells.get((x + dx, y + dy), [])]
        found = min(candidates, key=lambda id: distance(point, nodes[id]), default=None)
        return found if found is not None and distance(point, nodes[found]) <= 0.5 else None
    candidates = []
    for (kind, id), element in sorted(elements.items()):
        tags = element.get("tags", {})
        if tags.get("railway") not in {"station", "halt"} or not (tags.get("name") or tags.get("name:id")):
            continue
        point = nodes.get(id) if kind == "node" else None
        if not point and kind == "way":
            points = [nodes[n] for n in element.get("nodes", []) if n in nodes]
            if points:
                point = tuple(sum(p[i] for p in points) / len(points) for i in range(2))
        # Relation-only station areas are not guessed when no source geometry exists.
        if not point:
            continue
        anchor = snap(point)
        name = tags.get("name:id") or tags["name"]
        if any(name.casefold() == s["name"].casefold() and distance(point, s["point"]) < 0.35 for s in candidates):
            continue
        candidates.append({"id": f"STN_OSM{kind[0].upper()}{id}", "code": tags.get("ref") or f"O{id}", "name": name,
                           "osmId": f"{kind}/{id}", "kind": "station", "connected": anchor is not None,
                           "point": point, "anchor": anchor, **({"city": tags["addr:city"]} if tags.get("addr:city") else {}), **({"province": tags["addr:state"]} if tags.get("addr:state") else {}),
                           **({"stationClass": tags["railway:station_category"]} if tags.get("railway:station_category") else {})})
    used_candidates = set()
    for legacy in legacy_stations:
        point = legacy["coordinates"]["lat"], legacy["coordinates"]["lng"]
        matches = [s for s in candidates if s["anchor"] is not None and s["id"] not in used_candidates and distance(point, s["point"]) < 1]
        if matches:
            station = min(matches, key=lambda s: distance(point, s["point"]))
            used_candidates.add(station["id"])
            station["id"], station["code"], station["name"] = legacy["id"], legacy["code"], legacy["name"]
    station_by_anchor = {}
    for station in candidates:
        if station["anchor"] is not None:
            previous = station_by_anchor.get(station["anchor"])
            # Prefer persistent legacy IDs at coincident platform/station nodes.
            if previous and not station["id"].startswith("STN_OSM"):
                previous["connected"] = False
                station_by_anchor[station["anchor"]] = station
            elif previous:
                station["connected"] = False
            else:
                station_by_anchor[station["anchor"]] = station
    boundaries = {node for node, targets in adjacency.items() if len(targets) != 2} | set(station_by_anchor)
    for node in boundaries:
        if node not in station_by_anchor:
            station_by_anchor[node] = {"id": f"STN_OSMN{node}", "code": f"O{node}", "name": f"Simpang rel OSM {node}",
                                       "osmId": f"node/{node}", "kind": "junction", "connected": True, "point": nodes[node], "anchor": node}
    # Every segment ends at a station, branch, or line end; retain rail shape between them.
    visited, segments = set(), []
    for start in sorted(boundaries):
        for neighbor in sorted(adjacency[start]):
            if tuple(sorted((start, neighbor))) in visited:
                continue
            chain, current, previous = [start], neighbor, start
            while True:
                visited.add(tuple(sorted((previous, current))))
                chain.append(current)
                if current in boundaries:
                    break
                target = next(n for n in adjacency[current] if n != previous)
                previous, current = current, target
            if current == start:
                continue
            shape = [nodes[n] for n in chain]
            km = sum(distance(a, b) for a, b in zip(shape, shape[1:]))
            if km <= 0:
                continue
            segments.append({"id": f"SEG_OSM{start}_OSM{current}", "from": station_by_anchor[start]["id"], "to": station_by_anchor[current]["id"],
                             "distanceKm": round(km, 6), "geometry": shape, "osmWayIds": sorted({id for a, b in zip(chain, chain[1:]) for id in owners[tuple(sorted((a, b)))]}), "accessKeys": []})
    unique = {}
    for edge in segments:
        key = tuple(sorted((edge["from"], edge["to"])))
        if key not in unique or edge["distanceKm"] < unique[key]["distanceKm"]:
            unique[key] = edge
    segments = list(unique.values())
    for edge in segments:
        limits, grades = [], []
        for id in edge["osmWayIds"]:
            way = way_tags[id]
            raw = way["tags"].get("maxspeed", "")
            match = re.fullmatch(r"([0-9]+(?:\.[0-9]+)?)(?:\s*(km/h|mph))?", raw)
            if match:
                speed = float(match[1]) * (1.609344 if match[2] == "mph" else 1)
                if 5 <= speed <= 200:
                    limits.append(speed)
            incline = way["tags"].get("incline", "")
            match = re.fullmatch(r"([+-]?[0-9]+(?:\.[0-9]+)?)%", incline)
            # Use only explicit numerical source tags; no elevation guesses from lat/lon.
            if match:
                grade = float(match[1]) * 10
                first, last = nodes[way["nodes"][0]], nodes[way["nodes"][-1]]
                if distance(edge["geometry"][0], first) > distance(edge["geometry"][0], last):
                    grade = -grade
                if abs(grade) <= 60:
                    grades.append(grade)
        if limits:
            edge["speedLimitKmh"] = min(limits)
        if grades:
            edge["gradientPermille"] = max(grades, key=abs)
    graph = collections.defaultdict(list)
    for edge in segments:
        graph[edge["from"]].append((edge["to"], edge["distanceKm"], edge["id"]))
        graph[edge["to"]].append((edge["from"], edge["distanceKm"], edge["id"]))
    station_ids = {s["id"] for s in candidates if s["connected"]}
    eligible, examined = set(), set()
    for start in graph:
        if start in examined:
            continue
        component, queue = set(), [start]
        while queue:
            current = queue.pop()
            if current in component:
                continue
            component.add(current)
            queue.extend(target for target, _, _ in graph[current] if target not in component)
        examined.update(component)
        if len(component & station_ids) >= 2:
            eligible.update(component)
    for station in candidates:
        station["connected"] = station["connected"] and station["id"] in eligible
    by_id = {edge["id"]: edge for edge in segments}
    legacy_routes = {}
    for track in legacy_tracks:
        route = shortest(graph, track["originStationId"], track["destinationStationId"])
        if route:
            legacy_routes[track["id"]] = route
            for id in route:
                by_id[id]["accessKeys"].append(track["id"])
    stations = list(candidates) + [s for s in station_by_anchor.values() if s["kind"] == "junction"]
    for s in stations:
        point = nodes[s["anchor"]] if s["connected"] and s["anchor"] is not None else s["point"]
        s["coordinates"] = {"lat": point[0], "lng": point[1]}
        del s["point"], s["anchor"]
    return {"importedAt": data.get("osm3s", {}).get("timestamp_osm_base") or datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "source": "OpenStreetMap contributors, ODbL 1.0; compatible railway=rail in Indonesia; station class/operating limits unverified",
            "stations": stations, "segments": segments, "legacyRoutes": legacy_routes}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=pathlib.Path, help="Overpass JSON input or cache path for --download")
    parser.add_argument("--download", action="store_true", help="Download the Indonesia snapshot from Overpass; never called during Vercel builds")
    parser.add_argument("--output", type=pathlib.Path, default=ROOT / "packages/game-data/src/catalog/osm-network-data.ts")
    args = parser.parse_args()
    if args.download:
        request = urllib.request.Request("https://overpass-api.de/api/interpreter", data=urllib.parse.urlencode({"data": QUERY}).encode(), headers={"User-Agent": "RailwayManagerDataImporter/1.0"})
        with urllib.request.urlopen(request, timeout=240) as response:
            content = response.read()
        parsed = json.loads(content)
        if parsed.get("remark") or not parsed.get("elements"):
            raise ValueError("Overpass query failed or returned no data")
        args.input.parent.mkdir(parents=True, exist_ok=True)
        args.input.write_bytes(content)
    legacy = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", "import {JAVA_STATION_CATALOG as stations} from './packages/game-data/dist/catalog/stations.js'; import {JAVA_TRACK_CORRIDOR_SEGMENTS as tracks} from './packages/game-data/dist/catalog/tracks.js'; console.log(JSON.stringify({stations,tracks}));"], cwd=ROOT))
    snapshot = compile_network(json.loads(args.input.read_text()), legacy["stations"], legacy["tracks"])
    if not any(s["kind"] == "station" for s in snapshot["stations"]):
        raise ValueError("No stations found; refusing to replace national catalog")
    generated = '// Generated by scripts/import-osm-network.py; OpenStreetMap contributors, ODbL 1.0.\nimport type { OsmNetworkSnapshot } from "./operating-network.js";\nexport const OSM_NETWORK_DATA: OsmNetworkSnapshot = ' + json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + ';\n'
    # Validate before replacing; retain cache outside Git for reproducibility.
    temporary = args.output.with_suffix(".tmp")
    temporary.write_text(generated)
    temporary.replace(args.output)
    print(json.dumps({"stations": sum(s["kind"] == "station" for s in snapshot["stations"]), "connectedStations": sum(s["kind"] == "station" and s["connected"] for s in snapshot["stations"]), "segments": len(snapshot["segments"]), "mappedLegacyCorridors": len(snapshot["legacyRoutes"]), "output": str(args.output)}))


if __name__ == "__main__":
    main()
