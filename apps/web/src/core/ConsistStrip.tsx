import { coreProduct } from "@railway/simulation";
import { Asset } from "./presentation";
import type { FormationUnit } from "./formation-draft";
/** Show every carriage in formation order; multipliers belong only to stock cards. */
export function ConsistStrip({ units }: { units: readonly FormationUnit[] }) {
  return (
    <div
      className="consist-strip"
      aria-label={`Rangkaian ${units.length} unit`}
    >
      {units.map((unit, index) => (
        <div
          className="consist-vehicle"
          key={unit.id}
          style={{ flexGrow: coreProduct(unit.productId).length }}
          title={`Unit ${index + 1}: ${coreProduct(unit.productId).name}`}
        >
          <Asset id={unit.productId} />
          <small>{index + 1}</small>
        </div>
      ))}
    </div>
  );
}
