import { toKm } from '@railway/shared';
import { RouteEntity } from '@railway/network';
import { TimetableSlotEntity, ActiveServiceRunEntity } from '@railway/timetable';
import {
  GapekaChartViewModel,
  GapekaStationMarker,
  GapekaServiceLine,
} from '../types/ui.types.js';
import { RAIL_COLORS } from '../tokens/colors.js';

export function createGapekaChartViewModel(
  route: RouteEntity,
  timetableSlots: ReadonlyArray<TimetableSlotEntity>,
  activeServices: ReadonlyArray<ActiveServiceRunEntity>,
  currentSimMinute: number
): GapekaChartViewModel {
  // Markers for origin & destination
  const stations: GapekaStationMarker[] = [
    {
      stationId: route.originStationId,
      name: route.name.split(' - ')[0] ?? 'Origin',
      code: route.code,
      distanceKm: toKm(0),
      verticalPercent: 0,
    },
    {
      stationId: route.destinationStationId,
      name: route.name.split(' - ')[1] ?? 'Destination',
      code: route.code,
      distanceKm: route.distanceKm,
      verticalPercent: 100,
    },
  ];

  // Map slots & active runs to line segments
  const serviceLines: GapekaServiceLine[] = [];

  for (const slot of timetableSlots) {
    if (slot.routeId !== route.id || !slot.active) {
      continue;
    }

    // Check if an active service run exists for this slot
    const activeRun = activeServices.find((s) => s.timetableSlotId === slot.id);
    const delay = activeRun?.delayMinutes ?? 0;
    const isDelayed = delay > 5;

    let colorHex: string = RAIL_COLORS.status.success.solid;
    if (delay > 15) {
      colorHex = RAIL_COLORS.status.danger.solid;
    } else if (delay > 0) {
      colorHex = RAIL_COLORS.status.warning.solid;
    }

    const arrivalMin = (slot.scheduledArrivalMinuteOfDay + delay) % 1440;

    serviceLines.push({
      serviceRunId: activeRun?.id ?? (slot.id as any),
      timetableSlotId: slot.id,
      trainCode: route.code,
      departureMinute: slot.departureMinuteOfDay,
      arrivalMinute: arrivalMin,
      originStationId: route.originStationId,
      destinationStationId: route.destinationStationId,
      isDelayed,
      delayMinutes: delay,
      colorHex,
      startPoint: {
        minuteOfDay: slot.departureMinuteOfDay,
        distanceKm: toKm(0),
      },
      endPoint: {
        minuteOfDay: arrivalMin,
        distanceKm: route.distanceKm,
      },
    });
  }

  return {
    routeId: route.id,
    corridorName: route.name,
    totalDistanceKm: route.distanceKm,
    stations: Object.freeze(stations),
    serviceLines: Object.freeze(serviceLines),
    currentSimMinute,
  };
}
