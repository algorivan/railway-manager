import { describe, it, expect } from 'vitest';
import {
  createBrandedId,
  UnitId,
  CompanyId,
  CompositionId,
  RouteId,
} from '@railway/shared';
import { TrainCompositionEntity } from '../src/index.js';

describe('TrainCompositionEntity', () => {
  const companyId = createBrandedId<CompanyId>('CMP_01');
  const compId = createBrandedId<CompositionId>('COMP_ARGO_01');
  const locoId = createBrandedId<UnitId>('UNIT_LOCO_01');
  const coach1 = createBrandedId<UnitId>('UNIT_COACH_01');
  const coach2 = createBrandedId<UnitId>('UNIT_COACH_02');
  const powerCar = createBrandedId<UnitId>('UNIT_POWER_01');
  const diningCar = createBrandedId<UnitId>('UNIT_DINING_01');

  it('instantiates valid composition and counts total units', () => {
    const comp = new TrainCompositionEntity({
      id: compId,
      companyId,
      name: 'Argo Parahyangan Consist A',
      locomotiveUnitIds: [locoId],
      carriageUnitIds: [coach1, coach2],
      powerCarUnitId: powerCar,
      diningCarUnitId: diningCar,
    });

    expect(comp.getTotalUnitCount()).toBe(5);
    expect(comp.getAllUnitIds()).toEqual([locoId, powerCar, diningCar, coach1, coach2]);
  });

  it('rejects composition without locomotives', () => {
    expect(() => {
      new TrainCompositionEntity({
        id: compId,
        companyId,
        name: 'Invalid Consist',
        locomotiveUnitIds: [],
        carriageUnitIds: [coach1],
      });
    }).toThrow('Train composition must have at least one locomotive');
  });

  it('assigns and unassigns route', () => {
    const comp = new TrainCompositionEntity({
      id: compId,
      companyId,
      name: 'Argo Parahyangan Consist A',
      locomotiveUnitIds: [locoId],
      carriageUnitIds: [coach1],
    });

    const routeId = createBrandedId<RouteId>('RT_GMR_BDG');
    comp.assignRoute(routeId);
    expect(comp.assignedRouteId).toBe(routeId);

    comp.unassignRoute();
    expect(comp.assignedRouteId).toBeUndefined();
  });
});
