import type { CoreProduct } from "@railway/game-data";

// Use the previous closest-zoom scale at every zoom level: screen pixels/metre.
export const MAP_CONSIST_SCALE = 1.35;
export const MAP_CONSIST_HEIGHT = 19;
const SVG_NS = "http://www.w3.org/2000/svg";

/** Small top-down vector symbols. No vehicle image downloads are used on the map. */
export function mapVehicleVector(product: CoreProduct, width: number) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${MAP_CONSIST_HEIGHT}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(MAP_CONSIST_HEIGHT));
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", product.name);
  svg.classList.add("map-consist-unit");
  svg.style.width = `${width}px`;
  svg.style.height = `${MAP_CONSIST_HEIGHT}px`;
  const shape = (tag: string, attributes: Record<string, string | number>) => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes))
      node.setAttribute(key, String(value));
    svg.append(node);
    return node;
  };
  const cargo = product.kind === "cargo",
    loco = product.kind === "loco";
  const fill = loco
    ? "#eb762e"
    : cargo
      ? "#637b8c"
      : product.id === "generator"
        ? "#d9ac40"
        : "#f7f5e9";
  // Couplers and outlined roof/body remain readable above station/rail colours.
  shape("path", { d: `M0 9.5H${width}`, stroke: "#163f49", "stroke-width": 2 });
  if (loco) {
    shape("path", {
      d: `M4 2H${width - 6}L${width - 2} 6V13L${width - 6} 17H4Q2 17 2 15V4Q2 2 4 2Z`,
      fill,
      stroke: "#173e47",
      "stroke-width": 1.4,
    });
    shape("path", {
      d: `M${width - 8} 4H${width - 5}V7H${width - 8}Z M${width - 8} 12H${width - 5}V15H${width - 8}Z`,
      fill: "#e1f3f5",
    });
    shape("rect", {
      x: 5,
      y: 6,
      width: Math.max(3, width - 16),
      height: 7,
      rx: 1,
      fill: "#ad5123",
    });
  } else {
    shape("rect", {
      x: 2,
      y: 2,
      width: width - 4,
      height: 15,
      rx: cargo ? 2 : 4,
      fill,
      stroke: "#173e47",
      "stroke-width": 1.4,
    });
    if (cargo) {
      shape("rect", {
        x: 5,
        y: 5,
        width: width - 10,
        height: 9,
        rx: product.cargoType === "oil" ? 4 : 1,
        fill: product.cargoType === "mineral" ? "#394b50" : "#b5c9cf",
        stroke: "#173e47",
        "stroke-width": 0.8,
      });
      shape("path", {
        d: `M${width / 2} 5V14`,
        stroke: "#173e47",
        "stroke-width": 1,
      });
    } else if (product.id === "generator") {
      shape("path", {
        d: `M${width / 2 + 2} 4L${width / 2 - 3} 10H${width / 2}L${width / 2 - 1} 15L${width / 2 + 4} 8H${width / 2 + 1}Z`,
        fill: "#173e47",
      });
    } else {
      for (let i = 0; i < 4; i++) {
        const x = 5 + (i * (width - 12)) / 4;
        shape("rect", {
          x,
          y: 3.5,
          width: 2.5,
          height: 3,
          rx: 0.5,
          fill: "#397e87",
        });
        shape("rect", {
          x,
          y: 12.5,
          width: 2.5,
          height: 3,
          rx: 0.5,
          fill: "#397e87",
        });
      }
      shape("path", {
        d: `M5 9.5H${width - 5}`,
        stroke: "#b4c9c5",
        "stroke-width": 2,
      });
    }
  }
  return svg;
}
