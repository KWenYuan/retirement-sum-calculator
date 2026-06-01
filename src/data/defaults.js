import { cpfRules } from '../config/cpfRules.js';

export const SCENARIOS = {
  conservative: { label: 'Conservative', returnRate: 3 },
  balanced: { label: 'Balanced', returnRate: 5 },
  growth: { label: 'Growth', returnRate: 7 },
};

export const defaultProfile = {
  clientName: 'Client Name',
  dateOfBirth: '',
  reviewDate: new Date().toLocaleDateString('en-CA'),
  advisorName: 'Koh Wen Yuan',
  currentAge: 40,
  retirementAge: 65,
  monthlyIncome: 12000,
  monthlyExpenses: 6500,
  monthlySavings: 3500,
  desiredMonthlyIncome: 7000,
  inflationRate: 3,
  generalReturnRate: 5,
  retirementDuration: 25,
  withdrawalRate: 4,
};

export const defaultCpf = {
  enabled: true,
  oaBalance: 120000,
  saBalance: 90000,
  maBalance: 70000,
  monthlyContribution: 1800,
  annualInterest: 4,
  includeInTotal: true,
  cpfRulesVersion: cpfRules.version,
  frsAmountAt55: 230000,
  brsGrowthRateAfterLastKnownYear: cpfRules.brsGrowthRateAfterLastKnownYear,
  retirementSumType: cpfRules.defaultRetirementSumType,
  useManualRetirementSumAmount: false,
  manualRetirementSumAmount: 230000,
  minimumWithdrawalIfBelowFRS: cpfRules.defaultWithdrawalAt55IfBelowRetirementSum,
  includeCpf55WithdrawableInTimeline: true,
  age55ExcessTreatment: 'keepInOA',
  cpfLifePayoutStartAge: 65,
  cpfLifeMonthlyPayout: 0,
};

export const defaultSrs = {
  enabled: true,
  currentBalance: 60000,
  annualContribution: 15300,
  annualReturn: 5,
  withdrawalAge: 62,
  withdrawalStartAge: 62,
  withdrawalDurationYears: 10,
  withdrawalFrequency: 'yearly',
};

export const defaultCash = {
  includeCashInProjection: true,
  currentSavings: 90000,
  monthlySavings: 1200,
  annualInterest: 1.5,
  emergencyFund: 45000,
  includeEmergencyFund: false,
};

export const starterPolicies = [
  {
    id: 'policy-1',
    name: 'Retirement Income Policy',
    type: 'Endowment',
    startAge: 36,
    startYear: '',
    currentValue: 85000,
    premiumAmount: 800,
    premiumFrequency: 'monthly',
    premiumTermYears: 15,
    policyStructure: 'Investment policy with fixed premium commitment',
    premiumCommitmentTerm: 15,
    continuePremiumsAfterCommitment: false,
    continuedPremiumEndAge: 51,
    annualReturn: 4.5,
    useScenarioReturn: false,
    withdrawalAge: 65,
    withdrawalStartAge: 65,
    withdrawalType: 'Lump sum',
    withdrawalEndAge: 75,
    showClientExplanation: false,
  },
];

export const starterInvestments = [
  {
    id: 'investment-1',
    name: 'Global Equity Portfolio',
    currentValue: 150000,
    monthlyContribution: 1800,
    annualReturn: 5,
    useScenarioReturn: false,
    includeInTotal: true,
    withdrawalStartAge: 65,
    plannedWithdrawalAge: 65,
    withdrawalType: 'Lump sum',
    withdrawalEndAge: 75,
  },
];
