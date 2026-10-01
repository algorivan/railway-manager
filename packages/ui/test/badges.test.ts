import { describe, it, expect } from 'vitest';
import {
  getSolvencyBadge,
  getDelaySeverity,
  getServiceStatusBadge,
  getProcurementBadge,
  getB2BContractBadge,
  getConditionBadge,
  getEmployeeStatusBadge,
} from '../src/badges/index.js';

describe('Status Badge Resolvers (UI_SPEC.md §2 & §3)', () => {
  it('resolves solvency status badges with correct semantic variants', () => {
    const solvent = getSolvencyBadge('SOLVENT');
    expect(solvent.label).toBe('Solven');
    expect(solvent.variant).toBe('success');

    const warning = getSolvencyBadge('WARNING');
    expect(warning.label).toBe('Peringatan Defisit');
    expect(warning.variant).toBe('warning');

    const insolvent = getSolvencyBadge('INSOLVENT');
    expect(insolvent.label).toBe('Insolven');
    expect(insolvent.variant).toBe('danger');

    const suspended = getSolvencyBadge('SUSPENDED');
    expect(suspended.label).toBe('Izin Dicabut');
    expect(suspended.variant).toBe('danger');
  });

  it('evaluates operational delay severity tiers', () => {
    expect(getDelaySeverity(0)).toEqual({
      severity: 'on_time',
      label: 'Tepat Waktu',
      variant: 'success',
    });

    expect(getDelaySeverity(12)).toEqual({
      severity: 'minor',
      label: '+12 mnt',
      variant: 'warning',
    });

    expect(getDelaySeverity(45)).toEqual({
      severity: 'moderate',
      label: '+45 mnt',
      variant: 'danger',
    });

    expect(getDelaySeverity(90).severity).toBe('severe');
  });

  it('resolves active service run status badges', () => {
    expect(getServiceStatusBadge('BOARDING').variant).toBe('info');
    expect(getServiceStatusBadge('IN_TRANSIT', 0).variant).toBe('success');
    expect(getServiceStatusBadge('IN_TRANSIT', 10).variant).toBe('warning');
    expect(getServiceStatusBadge('IN_TRANSIT', 35).variant).toBe('danger');
    expect(getServiceStatusBadge('COMPLETED').label).toBe('Selesai');
  });

  it('resolves procurement pipeline order progress percentages', () => {
    expect(getProcurementBadge('ORDERED').progressPercent).toBe(10);
    expect(getProcurementBadge('IN_PRODUCTION').progressPercent).toBe(50);
    expect(getProcurementBadge('TESTING').progressPercent).toBe(80);
    expect(getProcurementBadge('IN_TRANSIT').progressPercent).toBe(90);
    expect(getProcurementBadge('DELIVERED').progressPercent).toBe(100);
  });

  it('resolves commercial contract and rolling stock condition badges', () => {
    expect(getB2BContractBadge('ACTIVE').variant).toBe('success');
    expect(getB2BContractBadge('BREACHED').variant).toBe('danger');

    expect(getConditionBadge(95).label).toBe('Prima');
    expect(getConditionBadge(75).label).toBe('Baik');
    expect(getConditionBadge(45).label).toBe('Perlu Rawat');
    expect(getConditionBadge(20).label).toBe('Kritis');

    expect(getEmployeeStatusBadge('ON_DUTY').label).toBe('Sedang Dinas');
    expect(getEmployeeStatusBadge('RESTING').label).toBe('Istirahat Depo');
  });
});
