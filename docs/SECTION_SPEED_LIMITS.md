# User-supplied operating speed sections

The 29 rules supplied on 2026-10-03 apply in both directions to each constituent rail section. They replace previous provisional game caps, including parallel representations of the same physical station pair. They are gameplay inputs, not independently verified official railway restrictions.

Distances below come from the current schematic game network: OSM station positions with distances scaled to the parent corridor. They are not surveyed rail distances. Routing follows the connected rail graph, not a straight line between cities.

| Section | Cap (km/h) | Game rail distance (km) |
| --- | ---: | ---: |
| Gambir – Cikampek | 90 | 79.3 |
| Cikampek – Purwakarta | 60 | 18.9 |
| Purwakarta – Cimahi | 30 | 45.3 |
| Cimahi – Cicalengka | 110 | 40.1 |
| Cicalengka – Ciawi | 45 | 47.4 |
| Ciawi – Maos | 90 | 155.9 |
| Maos – Kroya | 110 | 14.8 |
| Kroya – Wates | 90 | 123.0 |
| Wates – Yogyakarta | 60 | 28.0 |
| Yogyakarta – Solo Balapan | 110 | 60.0 |
| Solo Balapan – Madiun | 110 | 95.9 |
| Madiun – Kertosono | 90 | 68.4 |
| Kertosono – Blitar | 90 | 120.0 |
| Blitar – Kepanjen | 60 | 58.4 |
| Kepanjen – Surabaya Kota | 90 | 138.8 |
| Wonokromo – Kertosono | 110 | 81.2 |
| Bangil – Probolinggo | 110 | 70.0 |
| Probolinggo – Leces | 90 | 13.0 |
| Leces – Malasan | 45 | 6.3 |
| Malasan – Klakah | 60 | 14.2 |
| Klakah – Kotok | 90 | 78.3 |
| Kotok – Ledokombo | 45 | 12.9 |
| Ledokombo – Kalibaru | 60 | 27.1 |
| Kalibaru – Rogojampi | 110 | 40.7 |
| Rogojampi – Ketapang | 90 | 27.6 |
| Surabaya Kota – Semarang Tawang | 110 | 292.2 |
| Semarang Tawang – Cikampek | 110 | 365.4 |
| Semarang Tawang – Gundih | 110 | 65.5 |
| Gundih – Solo Balapan | 90 | 41.2 |

Travel forecasts sum each section’s motion time, using the lower of the track cap and trainset cap. Mass-dependent acceleration, braking before speed reductions, full stops at selected stations, and the default three-minute intermediate dwell are included. Terrain contributes only where a gradient value already exists; no invented gradients are added. Fuel remains the game’s existing per-distance consumption model and the planning footer sums all draft departures.

Old saved whole-corridor edges retain their IDs and receive a distance-weighted travel-time equivalent speed (total distance divided by the sum of distance/speed). New relations use the detailed intermediate edges. Runs already in progress retain their stored motion; subsequent forecasts/departures use the new limits. Existing active departure times may need review if slower routes no longer leave enough turnaround time.
