import {
  Money,
  addMoney,
  multiplyMoney,
} from '@railway/shared';
import { CharterType } from '../types/contract.types.js';

export class CharterPricingCalculator {
  /**
   * Minimum baseline markup margins (ECONOMY_RULES.md §3.4)
   */
  public static readonly MINIMUM_MARGIN_MARKUP: Record<CharterType, number> = Object.freeze({
    CORPORATE_EXECUTIVE: 0.80, // 80% minimum markup
    TOURISM_GROUP: 0.45,       // 45% minimum markup
  });

  /**
   * Fleet opportunity cost factor (ECONOMY_RULES.md §3.4)
   * 120% of regular route revenue
   */
  public static readonly FLEET_OPPORTUNITY_COST_FACTOR = 1.20;

  /**
   * Calculates minimum compliant charter price quote.
   * OfferedPrice = DirectOPEX * (1.0 + MarginMarkup) + FleetOpportunityCost
   */
  public static calculateCharterPrice(
    charterType: CharterType,
    directOpex: Money,
    projectedRegularRevenue: Money,
    customMarkup?: number
  ): {
    marginMarkup: number;
    opexComponent: Money;
    opportunityCost: Money;
    totalOfferedPrice: Money;
  } {
    const minMarkup = this.MINIMUM_MARGIN_MARKUP[charterType];
    const marginMarkup = customMarkup !== undefined ? Math.max(minMarkup, customMarkup) : minMarkup;

    // DirectOPEX * (1.0 + MarginMarkup)
    const opexComponent = multiplyMoney(directOpex, 1.0 + marginMarkup);

    // Fleet Opportunity Cost = 120% of regular revenue
    const opportunityCost = multiplyMoney(projectedRegularRevenue, this.FLEET_OPPORTUNITY_COST_FACTOR);

    const totalOfferedPrice = addMoney(opexComponent, opportunityCost);

    return {
      marginMarkup,
      opexComponent,
      opportunityCost,
      totalOfferedPrice,
    };
  }

  /**
   * Verifies if a proposed charter price meets minimum regulatory/commercial margins.
   */
  public static isQuoteAcceptable(
    charterType: CharterType,
    proposedPrice: Money,
    directOpex: Money,
    projectedRegularRevenue: Money
  ): boolean {
    const minimumQuote = this.calculateCharterPrice(charterType, directOpex, projectedRegularRevenue);
    return proposedPrice >= minimumQuote.totalOfferedPrice;
  }
}
