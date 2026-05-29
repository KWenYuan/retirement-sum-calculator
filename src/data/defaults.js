export const SCENARIOS = {
  conservative: { label: 'Conservative', returnRate: 3 },
  balanced: { label: 'Balanced', returnRate: 5 },
  growth: { label: 'Growth', returnRate: 7 },
};

export const defaultProfile = {
  clientName: 'Client Name',
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
  frsAmountAt55: 230000,
  cpfLifePayoutStartAge: 65,
  cpfLifeMonthlyPayout: 1800,
};

export const defaultSrs = {
  enabled: true,
  currentBalance: 60000,
  annualContribution: 15300,
  annualReturn: 5,
  withdrawalAge: 62,
  withdrawalStartAge: 62,
  withdrawalDurationYears: 10,
};

export const defaultCash = {
  currentSavings: 90000,
  monthlySavings: 1200,
  annualInterest: 1.5,
  emergencyFund: 45000,
  includeEmergencyFund: false,
  plannedWithdrawalAge: 65,
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
    annualReturn: 4.5,
    useScenarioReturn: true,
    withdrawalAge: 65,
  },
];

export const starterInvestments = [
  {
    id: 'investment-1',
    name: 'Global Equity Portfolio',
    currentValue: 150000,
    monthlyContribution: 1800,
    annualReturn: 5,
    useScenarioReturn: true,
    riskLevel: 'Balanced',
    includeInTotal: true,
    plannedWithdrawalAge: 65,
  },
];
