"""Synthetic geometry is test-only; no invented stations enter the game catalog."""
import importlib.util
import io
import json
import tempfile
from unittest.mock import patch
from urllib.error import HTTPError
import pathlib
import unittest

spec = importlib.util.spec_from_file_location("osm_importer", pathlib.Path(__file__).resolve().parents[1] / "import-osm-network.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def fixture():
    nodes = [
        {"type": "node", "id": 1, "lat": -7, "lon": 110, "tags": {"railway": "station", "name": "Test A"}},
        {"type": "node", "id": 2, "lat": -7.001, "lon": 110.001},
        {"type": "node", "id": 3, "lat": -7.002, "lon": 110.002, "tags": {"railway": "halt", "name": "Test Small"}},
        {"type": "node", "id": 4, "lat": -7.003, "lon": 110.003, "tags": {"railway": "station", "name": "Test B"}},
        {"type": "node", "id": 5, "lat": -7.001, "lon": 110.004, "tags": {"railway": "station", "name": "Test Branch"}},
        {"type": "node", "id": 6, "lat": -6, "lon": 111, "tags": {"railway": "station", "name": "Test Disconnected"}},
    ]
    return {"osm3s": {"timestamp_osm_base": "2026-10-02T00:00:00Z"}, "elements": nodes + [
        {"type": "way", "id": 10, "nodes": [1, 2, 3, 4], "tags": {"railway": "rail", "gauge": "1067"}},
        {"type": "way", "id": 11, "nodes": [2, 5], "tags": {"railway": "rail", "gauge": "1067"}},
    ]}


class ImportTests(unittest.TestCase):
    def test_preserves_curves_and_splits_at_small_stations_and_branches(self):
        result = module.compile_network(fixture())
        self.assertEqual(5, sum(s["kind"] == "station" for s in result["stations"]))
        self.assertEqual(4, len(result["segments"]))
        self.assertTrue(any(s["kind"] == "junction" and s["id"] == "STN_OSMN2" for s in result["stations"]))
        self.assertFalse(next(s for s in result["stations"] if s["id"] == "STN_OSMN6")["connected"])
        self.assertTrue(all(s["distanceKm"] > 0 for s in result["segments"]))
        self.assertEqual(len(result["stations"]), len({s["id"] for s in result["stations"]}))

    def test_station_only_does_not_replace_railway_geometry(self):
        data = fixture()
        data["elements"] = [e for e in data["elements"] if not (e["type"] == "way" and e["id"] == 11)]
        result = module.compile_network(data)
        first = next(s for s in result["segments"] if s["from"] == "STN_OSMN1")
        self.assertEqual([[-7, 110], [-7.001, 110.001], [-7.002, 110.002]], [list(p) for p in first["geometry"]])

    def test_retains_legacy_station_ids_and_inherits_access_only_along_real_paths(self):
        legacy = [{"id": "STN_A", "code": "AA", "name": "Old A", "coordinates": {"lat": -7, "lng": 110}},
                  {"id": "STN_B", "code": "BB", "name": "Old B", "coordinates": {"lat": -7.003, "lng": 110.003}}]
        tracks = [{"id": "SEG_A_B", "originStationId": "STN_A", "destinationStationId": "STN_B"}]
        result = module.compile_network(fixture(), legacy, tracks)
        route = result["legacyRoutes"]["SEG_A_B"]
        self.assertEqual(3, len(route))
        for s in result["segments"]:
            self.assertEqual(s["id"] in route, "SEG_A_B" in s["accessKeys"])

    def test_rejects_partial_response_and_incompatible_tracks(self):
        data = fixture()
        data["remark"] = "runtime timeout"
        with self.assertRaisesRegex(ValueError, "Incomplete"):
            module.compile_network(data)
        data = fixture()
        for e in data["elements"]:
            if e["type"] == "way":
                e["tags"]["gauge"] = "1435"
        with self.assertRaisesRegex(ValueError, "No compatible"):
            module.compile_network(data)

    def test_source_speed_limits_and_numeric_gradients_are_preserved(self):
        data = fixture()
        for e in data["elements"]:
            if e["type"] == "way" and e["id"] == 10:
                e["tags"].update({"maxspeed": "80", "incline": "1.5%"})
        result = module.compile_network(data)
        section = next(s for s in result["segments"] if 10 in s["osmWayIds"])
        self.assertEqual(80, section["speedLimitKmh"])
        self.assertEqual(15, section["gradientPermille"])
        branch = next(s for s in result["segments"] if s["osmWayIds"] == [11])
        self.assertNotIn("gradientPermille", branch)

    def test_node_and_way_id_namespaces_cannot_collide(self):
        data = fixture()
        data["elements"].append({"type": "way", "id": 1, "nodes": [3, 4], "tags": {"railway": "station", "name": "Test Way Station"}})
        result = module.compile_network(data)
        ids = [s["id"] for s in result["stations"]]
        self.assertIn("STN_OSMN1", ids)
        self.assertIn("STN_OSMW1", ids)
        self.assertEqual(len(ids), len(set(ids)))

    def test_skeleton_nodes_do_not_erase_station_names(self):
        data = fixture()
        data["elements"].append({"type": "node", "id": 1, "lat": -7, "lon": 110})
        result = module.compile_network(data)
        self.assertEqual("Test A", next(s for s in result["stations"] if s["id"] == "STN_OSMN1")["name"])


class DownloadTests(unittest.TestCase):
    def test_failed_region_keeps_prior_national_cache_intact(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = pathlib.Path(directory) / "national.json"
            cache.write_text('previous snapshot')
            response = io.BytesIO(json.dumps({"elements": [{"type": "node", "id": 1}]}).encode())
            denied = HTTPError("https://overpass-api.de/api/interpreter", 403, "Denied", {}, None)
            with patch.object(module, "REGIONS", {"first": (0, 0, 1, 1), "second": (1, 1, 2, 2)}), patch.object(module.urllib.request, "urlopen", side_effect=[response, denied]) as request:
                with self.assertRaises(HTTPError):
                    module.download_snapshot(cache)
            self.assertEqual("previous snapshot", cache.read_text())
            self.assertEqual(2, request.call_count)  # No retries of denied access.

    def test_gateway_timeout_subdivides_and_validates_every_part_before_replacing_cache(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = pathlib.Path(directory) / "national.json"
            timeout = HTTPError("https://overpass-api.de/api/interpreter", 504, "Timeout", {}, None)
            responses = [io.BytesIO(json.dumps({"elements": [{"type": "node", "id": id}]}).encode()) for id in (1, 2)]
            with patch.object(module, "REGIONS", {"region": (0, 0, 2, 4)}), patch.object(module.urllib.request, "urlopen", side_effect=[timeout, *responses]) as request:
                result = module.download_snapshot(cache)
            self.assertEqual([1, 2], [item["id"] for item in result["elements"]])
            self.assertEqual(result, json.loads(cache.read_text()))
            self.assertEqual(3, request.call_count)
            self.assertNotEqual(request.call_args_list[1].args[0].data, request.call_args_list[2].args[0].data)


if __name__ == "__main__":
    unittest.main()
