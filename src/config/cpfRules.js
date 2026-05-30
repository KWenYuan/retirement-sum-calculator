export const cpfRules = {
  version: '2026-01',
  cpfOaInterestRate: 0.025,
  cpfSaInterestRate: 0.04,
  cpfMaInterestRate: 0.04,
  cpfRaInterestRate: 0.04,
  monthlyContributionAllocation: {
    oa: 0.6,
    sa: 0.25,
    ma: 0.15,
  },
  defaultWithdrawalAt55IfBelowRetirementSum: 5000,
  brsGrowthRateAfterLastKnownYear: 0.035,
  knownBrsByYearTurning55: {
    2025: 106500,
    2026: 110200,
    2027: 114100,
  },
  ersMultiplierFrom2025: 4,
  frsMultiplier: 2,
  defaultRetirementSumType: 'FRS',
};
