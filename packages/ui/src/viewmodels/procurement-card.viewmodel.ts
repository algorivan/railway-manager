import { ProcurementOrderEntity } from '@railway/procurement';
import { JAVA_ROLLING_STOCK_CATALOG, RollingStockSpecCatalogEntry } from '@railway/game-data';
import {
  CatalogSpecCardViewModel,
  ProcurementPipelineOrderViewModel,
} from '../types/ui.types.js';
import { formatRupiah, formatRupiahCompact } from '../formatters/currency.formatter.js';
import { formatSpeed, formatMass } from '../formatters/distance.formatter.js';
import { getProcurementBadge } from '../badges/status-variants.js';

export function createCatalogSpecCardViewModels(
  catalog: ReadonlyArray<RollingStockSpecCatalogEntry> = JAVA_ROLLING_STOCK_CATALOG
): ReadonlyArray<CatalogSpecCardViewModel> {
  return Object.freeze(
    catalog.map((entry) => ({
      specId: entry.id,
      modelName: entry.modelName,
      category: entry.category,
      categoryLabel: formatCategoryLabel(entry.category),
      maxSpeedFormatted: formatSpeed(entry.maximumSpeedKmh),
      passengerCapacityFormatted:
        entry.passengerCapacity > 0 ? `${entry.passengerCapacity} Kursi` : '0 (Non-Penumpang)',
      tareWeightFormatted: formatMass(entry.tareWeightTons),
      basePurchaseCostFormatted: formatRupiah(entry.basePurchaseCost),
      basePurchaseCostCompact: formatRupiahCompact(entry.basePurchaseCost),
      leadTimeDaysFormatted: `${entry.standardLeadTimeDays} Hari`,
    }))
  );
}

export function createProcurementPipelineOrderViewModels(
  orders: ReadonlyArray<ProcurementOrderEntity>,
  catalog: ReadonlyArray<RollingStockSpecCatalogEntry> = JAVA_ROLLING_STOCK_CATALOG
): ReadonlyArray<ProcurementPipelineOrderViewModel> {
  return Object.freeze(
    orders.map((order) => {
      const spec = catalog.find((s) => s.id === order.specId);
      const badge = getProcurementBadge(order.status);

      return {
        orderId: order.id,
        specId: order.specId,
        modelName: spec?.modelName ?? order.specId,
        quantity: order.quantity,
        totalCostFormatted: formatRupiah(order.totalCost),
        deliveryDepotName: order.deliveryDepotId,
        status: order.status,
        statusBadge: badge,
        progressPercent: badge.progressPercent,
        remainingDaysFormatted: `${order.leadTimeDays} Hari Lead Time`,
      };
    })
  );
}

function formatCategoryLabel(category: string): string {
  switch (category) {
    case 'LOCOMOTIVE':
      return 'Lokomotif Diesel-Elektrik';
    case 'PASSENGER_CARRIAGE':
      return 'Kereta Penumpang';
    case 'DINING_CAR':
      return 'Kereta Makan (Restorasi)';
    case 'POWER_GENERATOR_CAR':
      return 'Kereta Pembangkit (P)';
    case 'CONTAINER_WAGON':
      return 'Gerbong Datar Kontainer';
    case 'COMMODITY_WAGON':
      return 'Gerbong Curah Terbuka';
    default:
      return category;
  }
}
