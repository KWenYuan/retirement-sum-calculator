import { cpfRules } from '../config/cpfRules.js';

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const rate = (percent) => asNumber(percent) / 100;

const decimalRate = (value, fallback = 0) => {
  const parsed = asNumber(value);
  if (parsed === 0) return fallback;
  return Math.abs(parsed) > 1 ? parsed / 100 : parsed;
};

const compoundAnnual = (principal, annualRate, years) => {
  if (years <= 0) return asNumber(principal);
  return asNumber(principal) * (1 + rate(annualRate)) ** years;
};

const annualContributionFutureValue = (annualContribution, annualRate, years) => {
  const amount = asNumber(annualContribution);
  const r = rate(annualRate);
  if (years <= 0 || amount <= 0) return 0;
  if (r === 0) return amount * years;
  return amount * (((1 + r) ** years - 1) / r);
};

const monthlyContributionFutureValue = (monthlyContribution, annualRate, years) => {
  const amount = asNumber(monthlyContribution);
  const months = Math.max(0, Math.round(years * 12));
  const monthlyRate = rate(annualRate) / 12;
  if (months <= 0 || amount <= 0) return 0;
  if (monthlyRate === 0) return amount * months;
  return amount * (((1 + monthlyRate) ** months - 1) / monthlyRate);
};

const frequencyMultiplier = {
  monthly: 12,
  quarterly: 4,
  'semi-annually': 2,
  annually: 1,
};

const futureValueWithMonthlyContributions = (currentValue, monthlyContribution, annualRate, years) => (
  compoundAnnual(currentValue, annualRate, years) +
  monthlyContributionFutureValue(monthlyContribution, annualRate, years)
);

const getPolicyCashValueAtAge = (asset = {}, currentAge, targetAge) => {
  const isSgd = String(asset.currency || 'SGD').toUpperCase() === 'SGD';
  if (!isSgd) return 0;
  const cashValue = asNumber(asset.cashValue);
  if (cashValue <= 0) return 0;
  const current = asNumber(currentAge);
  const age = asNumber(targetAge);
  const startAge = asNumber(asset.startAge) || current;
  if (age < startAge) return 0;
  if (age >= current) return cashValue;
  if (startAge >= current) return age === current ? cashValue : 0;
  const progress = (age - startAge) / (current - startAge);
  return Math.max(0, cashValue * progress);
};

const sumIncludedPolicyCashValuesAtAge = (policyCashValueAssets = [], currentAge, targetAge) => (
  policyCashValueAssets.reduce((total, asset) => {
    return total + getPolicyCashValueAtAge(asset, currentAge, targetAge);
  }, 0)
);

export const hasCpfProjectionData = (cpf = {}) => (
  Boolean(cpf.enabled) &&
  (
    asNumber(cpf.oaBalance) > 0 ||
    asNumber(cpf.saBalance) > 0 ||
    asNumber(cpf.maBalance) > 0 ||
    asNumber(cpf.monthlyContribution) > 0
  )
);

export const hasCpfFrsMilestoneData = (cpf = {}) => (
  Boolean(cpf.enabled) &&
  (
    asNumber(cpf.oaBalance) > 0 ||
    asNumber(cpf.saBalance) > 0 ||
    asNumber(cpf.monthlyContribution) > 0
  )
);

export const getCpfAge55ExcessTreatment = (cpf = {}) => (
  cpf.age55ExcessTreatment === 'withdrawToCash' ? 'withdrawToCash' : 'keepInOA'
);

export const shouldWithdrawCpfExcessAt55 = (cpf = {}) => getCpfAge55ExcessTreatment(cpf) === 'withdrawToCash';

export const getCpfYearTurning55 = (profile = {}, currentYear = new Date().getFullYear()) => (
  asNumber(currentYear) + Math.max(0, 55 - asNumber(profile.currentAge))
);

export const getCpfRetirementSums = (cpf = {}, profile = {}, currentYear = new Date().getFullYear()) => {
  const yearTurning55 = getCpfYearTurning55(profile, currentYear);
  const knownEntries = Object.entries(cpfRules.knownBrsByYearTurning55)
    .map(([year, brs]) => [Number(year), asNumber(brs)])
    .sort(([a], [b]) => a - b);
  const exactKnown = cpfRules.knownBrsByYearTurning55[yearTurning55];
  const latestKnown = knownEntries[knownEntries.length - 1] || [yearTurning55, 0];
  const growthRate = decimalRate(cpfRules.brsGrowthRateAfterLastKnownYear, cpfRules.brsGrowthRateAfterLastKnownYear);
  const brs = typeof exactKnown !== 'undefined'
    ? asNumber(exactKnown)
    : latestKnown[1] * ((1 + growthRate) ** Math.max(0, yearTurning55 - latestKnown[0]));
  const frs = brs * cpfRules.frsMultiplier;
  const ers = brs * cpfRules.ersMultiplierFrom2025;

  return {
    yearTurning55,
    brs,
    frs,
    ers,
    growthRate,
    source: typeof exactKnown !== 'undefined' ? 'official' : 'projected',
    latestKnownYear: latestKnown[0],
    latestKnownBrs: latestKnown[1],
  };
};

export const getSelectedCpfRetirementSum = (cpf = {}, profile = {}) => {
  const sums = getCpfRetirementSums(cpf, profile);
  const manualAmount = asNumber(cpf.manualRetirementSumAmount ?? cpf.frsAmountAt55);
  const type = cpf.useManualRetirementSumAmount || cpf.retirementSumType === 'Manual'
    ? 'Manual'
    : (cpf.retirementSumType || cpfRules.defaultRetirementSumType);
  const amountByType = {
    BRS: sums.brs,
    FRS: sums.frs,
    ERS: sums.ers,
    Manual: manualAmount,
  };

  return {
    ...sums,
    retirementSumType: type,
    selectedRetirementSumAmount: amountByType[type] ?? sums.frs,
    manualRetirementSumAmount: manualAmount,
  };
};

export const calculateCpfAge55Transfer = (cpf = {}, profile = {}) => {
  if (!hasCpfFrsMilestoneData(cpf)) return null;
  const projectedOa = projectCpfAccount(cpf.oaBalance, cpf.monthlyContribution, cpfRules.monthlyContributionAllocation.oa, cpfRules.cpfOaInterestRate, profile.currentAge, 55);
  const projectedSa = projectCpfAccount(cpf.saBalance, cpf.monthlyContribution, cpfRules.monthlyContributionAllocation.sa, cpfRules.cpfSaInterestRate, profile.currentAge, 55);
  const oaSa = projectedOa + projectedSa;
  const selected = getSelectedCpfRetirementSum(cpf, profile);
  const retirementSumAmount = selected.selectedRetirementSumAmount;
  const minimumWithdrawal = cpfRules.defaultWithdrawalAt55IfBelowRetirementSum;
  const hasMetRetirementSum = oaSa >= retirementSumAmount;
  const withdrawableAmount = hasMetRetirementSum
    ? Math.max(0, oaSa - retirementSumAmount)
    : Math.min(minimumWithdrawal, Math.max(0, oaSa));
  const raSetAside = hasMetRetirementSum
    ? retirementSumAmount
    : Math.max(0, oaSa - withdrawableAmount);
  const shortfall = Math.max(0, retirementSumAmount - oaSa);
  const excess = Math.max(0, oaSa - retirementSumAmount);

  return {
    ...selected,
    projectedOa,
    projectedSa,
    projectedOaSa: oaSa,
    retirementSumAmount,
    raSetAside,
    withdrawableAmount,
    shortfall,
    excess,
    minimumWithdrawal,
    hasMetRetirementSum,
  };
};

const projectCpfAccount = (balance, monthlyContribution, allocation, annualRateDecimal, currentAge, targetAge) => {
  const years = Math.max(0, asNumber(targetAge) - asNumber(currentAge));
  return futureValueWithMonthlyContributions(
    balance,
    asNumber(monthlyContribution) * asNumber(allocation),
    annualRateDecimal * 100,
    years,
  );
};

export const getEffectiveRate = (itemRate, useScenarioReturn, scenarioRate) => (
  useScenarioReturn ? scenarioRate : asNumber(itemRate)
);

export const projectCpf = (cpf, years) => {
  if (!hasCpfProjectionData(cpf)) return 0;
  const currentAge = 0;
  const targetAge = years;
  return (
    projectCpfAccount(cpf.oaBalance, cpf.monthlyContribution, cpfRules.monthlyContributionAllocation.oa, cpfRules.cpfOaInterestRate, currentAge, targetAge) +
    projectCpfAccount(cpf.saBalance, cpf.monthlyContribution, cpfRules.monthlyContributionAllocation.sa, cpfRules.cpfSaInterestRate, currentAge, targetAge) +
    projectCpfAccount(cpf.maBalance, cpf.monthlyContribution, cpfRules.monthlyContributionAllocation.ma, cpfRules.cpfMaInterestRate, currentAge, targetAge)
  );
};

export const projectCpfAtAge = (cpf, currentAge, targetAge) => {
  if (!hasCpfProjectionData(cpf)) return 0;
  const startAge = asNumber(currentAge);
  const endAge = asNumber(targetAge);
  if (startAge > 55) {
    return projectCpfAccount(cpf.oaBalance, cpf.monthlyContribution, cpfRules.monthlyContributionAllocation.oa, cpfRules.cpfOaInterestRate, startAge, endAge) +
      projectCpfAccount(cpf.saBalance, cpf.monthlyContribution, cpfRules.monthlyContributionAllocation.sa, cpfRules.cpfSaInterestRate, startAge, endAge) +
      projectCpfAccount(cpf.maBalance, cpf.monthlyContribution, cpfRules.monthlyContributionAllocation.ma, cpfRules.cpfMaInterestRate, startAge, endAge);
  }
  if (endAge < 55) {
    return projectCpfAccount(cpf.oaBalance, cpf.monthlyContribution, cpfRules.monthlyContributionAllocation.oa, cpfRules.cpfOaInterestRate, startAge, endAge) +
      projectCpfAccount(cpf.saBalance, cpf.monthlyContribution, cpfRules.monthlyContributionAllocation.sa, cpfRules.cpfSaInterestRate, startAge, endAge) +
      projectCpfAccount(cpf.maBalance, cpf.monthlyContribution, cpfRules.monthlyContributionAllocation.ma, cpfRules.cpfMaInterestRate, startAge, endAge);
  }

  const transfer = calculateCpfAge55Transfer(cpf, { currentAge: startAge });
  if (!transfer) return 0;
  const yearsAfter55 = Math.max(0, endAge - 55);
  const projectedMaAt55 = projectCpfAccount(
    cpf.maBalance,
    cpf.monthlyContribution,
    cpfRules.monthlyContributionAllocation.ma,
    cpfRules.cpfMaInterestRate,
    startAge,
    55,
  );
  const keptOaExcess = shouldWithdrawCpfExcessAt55(cpf)
    ? 0
    : compoundAnnual(transfer.withdrawableAmount, cpfRules.cpfOaInterestRate * 100, yearsAfter55);
  return compoundAnnual(transfer.raSetAside, cpfRules.cpfRaInterestRate * 100, yearsAfter55) +
    compoundAnnual(projectedMaAt55, cpfRules.cpfMaInterestRate * 100, yearsAfter55) +
    keptOaExcess;
};

export const projectCpfOaSa = (cpf, currentAge, targetAge) => {
  if (!hasCpfFrsMilestoneData(cpf)) return 0;
  return projectCpfAccount(cpf.oaBalance, cpf.monthlyContribution, cpfRules.monthlyContributionAllocation.oa, cpfRules.cpfOaInterestRate, currentAge, targetAge) +
    projectCpfAccount(cpf.saBalance, cpf.monthlyContribution, cpfRules.monthlyContributionAllocation.sa, cpfRules.cpfSaInterestRate, currentAge, targetAge);
};

export const projectSrs = (srs, currentAge, targetAge) => {
  if (!srs.enabled) return 0;
  const startAge = asNumber(currentAge);
  const selectedAge = asNumber(targetAge);
  const withdrawalStartAge = asNumber(srs.withdrawalStartAge) || asNumber(srs.withdrawalAge);
  const withdrawalDuration = Math.max(1, asNumber(srs.withdrawalDurationYears) || 1);
  const accumulationYears = Math.max(0, Math.min(selectedAge, withdrawalStartAge) - startAge);
  const accumulatedValue = compoundAnnual(srs.currentBalance, srs.annualReturn, accumulationYears) +
    annualContributionFutureValue(srs.annualContribution, srs.annualReturn, accumulationYears);

  if (selectedAge <= withdrawalStartAge) return accumulatedValue;

  const annualWithdrawal = accumulatedValue / withdrawalDuration;
  const drawdownYears = Math.min(
    Math.max(0, Math.floor(selectedAge - withdrawalStartAge)),
    withdrawalDuration,
  );
  let remainingValue = accumulatedValue;
  const annualRate = rate(srs.annualReturn);

  for (let year = 0; year < drawdownYears; year += 1) {
    remainingValue = Math.max(0, remainingValue * (1 + annualRate) - annualWithdrawal);
  }

  return remainingValue;
};

export const projectPolicy = (policy, currentAge, targetAge, scenarioRate) => {
  const years = Math.max(0, targetAge - currentAge);
  return projectPolicyWithContributionDelay(policy, currentAge, targetAge, scenarioRate, 0, years);
};

const projectPolicyWithContributionDelay = (policy, currentAge, targetAge, scenarioRate, delayYears = 0, totalYears = null) => {
  const years = totalYears ?? Math.max(0, targetAge - currentAge);
  const selectedAge = asNumber(currentAge) + years;
  const structure = getPolicyStructure(policy, targetAge);
  const annualPremium = asNumber(policy.premiumAmount) * (frequencyMultiplier[policy.premiumFrequency] || 12);
  const effectiveRate = asNumber(policy.annualReturn);
  const accumulatedValue = projectPolicyAccumulatedValue({
    policy,
    structure,
    currentAge: asNumber(currentAge),
    targetAge: selectedAge,
    annualPremium,
    effectiveRate,
    delayYears,
  });

  if (structure.withdrawalType === 'Keep invested / no withdrawal yet') return accumulatedValue;
  if (structure.withdrawalType === 'Lump sum') {
    return selectedAge >= structure.withdrawalStartAge ? 0 : accumulatedValue;
  }
  if (selectedAge <= structure.withdrawalStartAge) return accumulatedValue;

  const valueAtWithdrawalStart = projectPolicyAccumulatedValue({
    policy,
    structure,
    currentAge: asNumber(currentAge),
    targetAge: structure.withdrawalStartAge,
    annualPremium,
    effectiveRate,
    delayYears,
  });
  const annualPayout = valueAtWithdrawalStart / structure.withdrawalDuration;
  const drawdownYears = Math.min(
    Math.max(0, Math.floor(selectedAge - structure.withdrawalStartAge)),
    structure.withdrawalDuration,
  );

  let remainingValue = valueAtWithdrawalStart;
  const annualRate = rate(effectiveRate);
  for (let year = 0; year < drawdownYears; year += 1) {
    remainingValue = Math.max(0, remainingValue * (1 + annualRate) - annualPayout);
  }

  return remainingValue;
};

export const projectPolicyAccumulatedAtAge = (policy, currentAge, targetAge, scenarioRate) => {
  const structure = getPolicyStructure(policy, targetAge);
  const annualPremium = asNumber(policy.premiumAmount) * (frequencyMultiplier[policy.premiumFrequency] || 12);
  const effectiveRate = asNumber(policy.annualReturn);
  return projectPolicyAccumulatedValue({
    policy,
    structure,
    currentAge: asNumber(currentAge),
    targetAge: asNumber(targetAge),
    annualPremium,
    effectiveRate,
  });
};

const projectPolicyAccumulatedValue = ({
  policy,
  structure,
  currentAge,
  targetAge,
  annualPremium,
  effectiveRate,
  delayYears = 0,
}) => {
  const years = Math.max(0, asNumber(targetAge) - asNumber(currentAge));
  const contributionStartAge = Math.max(
    asNumber(currentAge) + asNumber(delayYears),
    structure.startAge,
  );
  const contributionEndAge = Math.min(asNumber(targetAge), structure.premiumEndAge);
  const contributionYears = Math.max(0, contributionEndAge - contributionStartAge);
  const yearsAfterContributionEnd = Math.max(0, asNumber(targetAge) - contributionStartAge - contributionYears);
  const currentGrowth = compoundAnnual(policy.currentValue, effectiveRate, years);
  const premiumGrowthToPaymentEnd = annualContributionFutureValue(annualPremium, effectiveRate, contributionYears);
  const premiumGrowthToTarget = compoundAnnual(premiumGrowthToPaymentEnd, effectiveRate, yearsAfterContributionEnd);
  return currentGrowth + premiumGrowthToTarget;
};

export const getPolicyStructure = (policy, fallbackAge = 65) => {
  const valueOrFallback = (value, fallback) => (
    value === '' || value === null || typeof value === 'undefined'
      ? fallback
      : asNumber(value)
  );
  const startAge = valueOrFallback(policy.startAge, fallbackAge);
  const premiumCommitmentTerm = Math.max(0, valueOrFallback(policy.premiumCommitmentTerm ?? policy.premiumTermYears, 0));
  const commitmentEndAge = startAge + premiumCommitmentTerm;
  const withdrawalStartAge = valueOrFallback(policy.withdrawalStartAge ?? policy.withdrawalAge, fallbackAge);
  const withdrawalType = policy.withdrawalType || 'Lump sum';
  const continuedPremiumEndAge = policy.continuePremiumsAfterCommitment
    ? valueOrFallback(policy.continuedPremiumEndAge, withdrawalStartAge)
    : commitmentEndAge;
  const premiumEndAge = Math.max(commitmentEndAge, continuedPremiumEndAge);
  const withdrawalEndAge = valueOrFallback(policy.withdrawalEndAge, withdrawalStartAge + 10);
  const withdrawalDuration = Math.max(1, withdrawalEndAge - withdrawalStartAge);

  return {
    startAge,
    premiumCommitmentTerm,
    commitmentEndAge,
    continuedPremiumEndAge,
    premiumEndAge,
    withdrawalStartAge,
    withdrawalEndAge,
    withdrawalDuration,
    withdrawalType,
    postCommitmentGrowthYears: Math.max(0, withdrawalStartAge - premiumEndAge),
  };
};

export const projectInvestment = (investment, years, scenarioRate) => {
  const effectiveRate = asNumber(investment.annualReturn);
  return futureValueWithMonthlyContributions(
    investment.currentValue,
    investment.monthlyContribution,
    effectiveRate,
    years,
  );
};

export const getInvestmentStructure = (investment = {}, fallbackAge = 65, fallbackDuration = 10) => {
  const withdrawalType = investment.withdrawalType === 'Not shown on timeline'
    ? 'Keep invested / no withdrawal'
    : (investment.withdrawalType || 'Lump sum');
  const withdrawalStartAge = asNumber(
    investment.withdrawalStartAge ??
    investment.plannedWithdrawalAge ??
    fallbackAge,
  ) || fallbackAge;
  const withdrawalEndAge = asNumber(investment.withdrawalEndAge) || withdrawalStartAge + fallbackDuration;
  const withdrawalDuration = Math.max(1, withdrawalEndAge - withdrawalStartAge);

  return {
    withdrawalType,
    withdrawalStartAge,
    withdrawalEndAge,
    withdrawalDuration,
  };
};

export const projectInvestmentAccumulatedAtAge = (investment, currentAge, targetAge, scenarioRate) => (
  projectInvestment(investment, Math.max(0, asNumber(targetAge) - asNumber(currentAge)), scenarioRate)
);

export const projectInvestmentAtAge = (investment, currentAge, targetAge, scenarioRate, fallbackDuration = 10) => {
  const selectedAge = asNumber(targetAge);
  const structure = getInvestmentStructure(investment, selectedAge, fallbackDuration);
  const accumulatedValue = projectInvestmentAccumulatedAtAge(investment, currentAge, selectedAge, scenarioRate);

  if (structure.withdrawalType === 'Keep invested / no withdrawal') return accumulatedValue;
  if (structure.withdrawalType === 'Lump sum') {
    return selectedAge >= structure.withdrawalStartAge ? 0 : accumulatedValue;
  }
  if (selectedAge <= structure.withdrawalStartAge) return accumulatedValue;

  const valueAtWithdrawalStart = projectInvestmentAccumulatedAtAge(
    investment,
    currentAge,
    structure.withdrawalStartAge,
    scenarioRate,
  );
  const annualPayout = valueAtWithdrawalStart / structure.withdrawalDuration;
  const drawdownYears = Math.min(
    Math.max(0, Math.floor(selectedAge - structure.withdrawalStartAge)),
    structure.withdrawalDuration,
  );
  let remainingValue = valueAtWithdrawalStart;
  const effectiveRate = asNumber(investment.annualReturn);
  const annualRate = rate(effectiveRate);

  for (let year = 0; year < drawdownYears; year += 1) {
    remainingValue = Math.max(0, remainingValue * (1 + annualRate) - annualPayout);
  }

  return remainingValue;
};

export const projectCash = (cash, years) => {
  const accessibleBase = asNumber(cash.currentSavings) - (cash.includeEmergencyFund ? 0 : asNumber(cash.emergencyFund));
  const base = Math.max(0, accessibleBase);
  return futureValueWithMonthlyContributions(base, cash.monthlySavings, cash.annualInterest, years);
};

export const isCashIncludedInProjection = (cash = {}) => cash.includeCashInProjection !== false;

export const calculateTransferredLumpSumsAtAge = ({ profile, cpf = {}, policies = [], investments = [], cash = {}, scenarioRate, age }) => {
  const selectedAge = asNumber(age);
  const currentAge = asNumber(profile.currentAge);
  const growTransferredCash = (value, withdrawalAge) => compoundAnnual(
    value,
    cash.annualInterest,
    Math.max(0, selectedAge - asNumber(withdrawalAge)),
  );

  const policyTransfers = policies.reduce((total, policy) => {
    const structure = getPolicyStructure(policy, profile.retirementAge);
    if (structure.withdrawalType !== 'Lump sum' || selectedAge < structure.withdrawalStartAge) return total;
    const lumpSumValue = projectPolicyAccumulatedAtAge(policy, currentAge, structure.withdrawalStartAge, scenarioRate);
    return total + growTransferredCash(lumpSumValue, structure.withdrawalStartAge);
  }, 0);

  const investmentTransfers = investments.reduce((total, investment) => {
    if (!investment.includeInTotal) return total;
    const structure = getInvestmentStructure(investment, profile.retirementAge, profile.retirementDuration);
    if (structure.withdrawalType !== 'Lump sum' || selectedAge < structure.withdrawalStartAge) return total;
    const lumpSumValue = projectInvestmentAccumulatedAtAge(investment, currentAge, structure.withdrawalStartAge, scenarioRate);
    return total + growTransferredCash(lumpSumValue, structure.withdrawalStartAge);
  }, 0);

  const cpfTransfer = selectedAge >= 55 && currentAge <= 55 && hasCpfFrsMilestoneData(cpf) && shouldWithdrawCpfExcessAt55(cpf)
    ? growTransferredCash(calculateCpfAge55Transfer(cpf, profile)?.withdrawableAmount || 0, 55)
    : 0;

  return cpfTransfer + policyTransfers + investmentTransfers;
};

export const calculateAtAge = ({ profile, cpf, srs, policies = [], policyCashValueAssets = [], investments, cash, scenarioRate, age }) => {
  const years = Math.max(0, asNumber(age) - asNumber(profile.currentAge));
  const cpfAtAge = projectCpfAtAge(cpf, profile.currentAge, age);
  const cpfValue = hasCpfProjectionData(cpf) ? cpfAtAge : 0;
  const visibleCpfValue = cpfAtAge;
  const srsValue = projectSrs(srs, asNumber(profile.currentAge), asNumber(age));
  const policyValue = policies.reduce(
    (total, policy) => total + projectPolicy(policy, asNumber(profile.currentAge), asNumber(age), scenarioRate),
    0,
  ) + sumIncludedPolicyCashValuesAtAge(policyCashValueAssets, profile.currentAge, age);
  const investmentValue = investments.reduce((total, investment) => (
    total + (investment.includeInTotal ? projectInvestmentAtAge(investment, profile.currentAge, age, scenarioRate, profile.retirementDuration) : 0)
  ), 0);
  const visibleInvestmentValue = investments.reduce(
    (total, investment) => total + projectInvestmentAtAge(investment, profile.currentAge, age, scenarioRate, profile.retirementDuration),
    0,
  );
  const transferredLumpSums = calculateTransferredLumpSumsAtAge({ profile, cpf, policies, investments, cash, scenarioRate, age });
  const cashValue = (isCashIncludedInProjection(cash) ? projectCash(cash, years) : 0) + transferredLumpSums;
  const total = cpfValue + srsValue + policyValue + investmentValue + cashValue;

  return {
    age: asNumber(age),
    cpf: visibleCpfValue,
    srs: srsValue,
    policies: policyValue,
    investments: visibleInvestmentValue,
    cash: cashValue,
    total,
  };
};

export const getRetirementTimelineEndAge = (profile) => Math.max(
  85,
  asNumber(profile.retirementAge) + 20,
  asNumber(profile.currentAge),
);

export const buildTimeline = (state) => {
  const start = asNumber(state.profile.currentAge);
  const end = Math.max(start, asNumber(state.timelineEndAge) || asNumber(state.profile.retirementAge));
  return Array.from({ length: end - start + 1 }, (_, index) => (
    calculateAtAge({ ...state, age: start + index })
  ));
};

export const buildRetirementTimeline = (state) => {
  const startAge = asNumber(state.profile.currentAge);
  const endAge = getRetirementTimelineEndAge(state.profile);
  const years = Math.max(1, endAge - startAge);
  const toPercent = (age) => `${Math.min(100, Math.max(0, ((asNumber(age) - startAge) / years) * 100))}%`;
  const lumpSums = [];
  const incomeStreams = [];
  const addLumpSum = ({ age, title, amount, category, description, exportType = 'Lump Sum', exportAmount, countsAsLumpSum = true }) => {
    const eventAge = asNumber(age);
    if (!eventAge || eventAge < startAge || eventAge > endAge) return;
    lumpSums.push({
      id: `${category}-${title}-${eventAge}-${lumpSums.length}`,
      age: eventAge,
      title,
      amount,
      category,
      countsAsLumpSum,
      description: description || `${title}: ${formatCurrency(amount)}`,
      left: toPercent(eventAge),
      exportType,
      exportAmount: exportAmount || formatCurrency(amount),
      exportDuration: exportType === 'Milestone' ? 'Assumption' : 'One-time',
    });
  };
  const addIncomeStream = ({ start, end, title, category, amountPerPeriod, frequency, description, durationLabel }) => {
    const streamStart = Math.max(startAge, asNumber(start));
    const streamEnd = Math.min(endAge, asNumber(end));
    if (!streamStart || !streamEnd || streamEnd <= streamStart) return;
    const durationYears = Math.max(1, streamEnd - streamStart);
    const periodLabel = frequency === 'monthly' ? '/month' : '/year';
    incomeStreams.push({
      id: `${category}-${title}-${streamStart}-${incomeStreams.length}`,
      startAge: streamStart,
      endAge: streamEnd,
      title,
      category,
      amountPerPeriod,
      frequency,
      description: description || `${formatCurrency(amountPerPeriod)}${periodLabel}`,
      duration: durationLabel || `${durationYears} years`,
      left: toPercent(streamStart),
      width: `calc(${toPercent(streamEnd)} - ${toPercent(streamStart)})`,
      exportType: 'Income',
      exportAmount: `${formatCurrency(amountPerPeriod)}${periodLabel}`,
      exportDuration: durationLabel || `${durationYears} years`,
    });
  };

  (state.policies || []).forEach((policy) => {
    const structure = getPolicyStructure(policy, state.profile.retirementAge);
    const withdrawalAge = structure.withdrawalStartAge;
    const projectedValue = projectPolicyAccumulatedAtAge(policy, startAge, withdrawalAge, state.scenarioRate);
    const type = structure.withdrawalType;
    if (type === 'Keep invested / no withdrawal yet') return;
    if (type === 'Lump sum') {
      addLumpSum({
        age: withdrawalAge,
        title: policy.name || 'Policy',
        amount: projectedValue,
        category: 'Policy',
        description: `Lump sum: ${formatCurrency(projectedValue)}`,
      });
      return;
    }
    const end = Math.max(withdrawalAge + 1, structure.withdrawalEndAge);
    const duration = Math.max(1, end - withdrawalAge);
    const frequency = type === 'Monthly income' ? 'monthly' : 'yearly';
    const amount = frequency === 'monthly' ? projectedValue / (duration * 12) : projectedValue / duration;
    addIncomeStream({
      start: withdrawalAge,
      end,
      title: policy.name || 'Policy income',
      category: 'Policy',
      amountPerPeriod: amount,
      frequency,
      description: `${type}: ${formatCurrency(amount)}${frequency === 'monthly' ? '/month' : '/year'}`,
    });
  });

  if (hasCpfFrsMilestoneData(state.cpf)) {
    const cpf55Age = 55;
    const transfer = calculateCpfAge55Transfer(state.cpf, state.profile);
    if (
      transfer &&
      cpf55Age >= startAge &&
      cpf55Age <= endAge
    ) {
      const withdrawsExcess = shouldWithdrawCpfExcessAt55(state.cpf);
      addLumpSum({
        age: cpf55Age,
        title: withdrawsExcess ? 'CPF excess withdrawn to Cash / Savings' : 'CPF excess kept in OA',
        amount: withdrawsExcess ? transfer.withdrawableAmount : 0,
        category: 'CPF',
        description: `Client turns 55 in ${transfer.yearTurning55}. Retirement sum type: ${transfer.retirementSumType}. Estimated BRS: ${formatCurrency(transfer.brs)}. Estimated FRS: ${formatCurrency(transfer.frs)}. Estimated ERS: ${formatCurrency(transfer.ers)}. Projected OA at 55: ${formatCurrency(transfer.projectedOa)}. Projected SA at 55: ${formatCurrency(transfer.projectedSa)}. Projected OA + SA: ${formatCurrency(transfer.projectedOaSa)}. Estimated RA set aside: ${formatCurrency(transfer.raSetAside)}. ${withdrawsExcess ? 'Excess withdrawn to Cash / Savings' : 'Excess kept in CPF OA'}: ${formatCurrency(transfer.withdrawableAmount)}. Estimated ${transfer.shortfall > 0 ? 'shortfall' : 'excess'}: ${formatCurrency(transfer.shortfall || transfer.excess)}.`,
        exportType: withdrawsExcess ? 'Lump Sum' : 'Milestone',
        exportAmount: withdrawsExcess ? formatCurrency(transfer.withdrawableAmount) : `Kept in CPF OA: ${formatCurrency(transfer.withdrawableAmount)}`,
        countsAsLumpSum: withdrawsExcess,
      });
    }
  }

  if (state.srs.enabled) {
    const withdrawalStart = asNumber(state.srs.withdrawalStartAge) || asNumber(state.srs.withdrawalAge);
    const duration = Math.max(1, asNumber(state.srs.withdrawalDurationYears) || 1);
    const withdrawalEnd = withdrawalStart + duration;
    const projectedSrs = projectSrs(state.srs, startAge, withdrawalStart);
    const annualWithdrawal = projectedSrs / duration;
    const frequency = state.srs.withdrawalFrequency || 'yearly';
    const amount = frequency === 'monthly' ? annualWithdrawal / 12 : annualWithdrawal;
    addIncomeStream({
      start: withdrawalStart,
      end: withdrawalEnd,
      title: 'SRS withdrawal',
      category: 'SRS',
      amountPerPeriod: amount,
      frequency,
      description: `Age ${withdrawalStart}-${withdrawalEnd}. ${duration} years. ${formatCurrency(annualWithdrawal)}/year or ${formatCurrency(annualWithdrawal / 12)}/month.`,
    });
  }

  state.investments.forEach((investment) => {
    if (!investment.includeInTotal) return;
    const structure = getInvestmentStructure(investment, state.profile.retirementAge, state.profile.retirementDuration);
    const type = structure.withdrawalType;
    if (type === 'Keep invested / no withdrawal') return;
    const withdrawalAge = structure.withdrawalStartAge;
    if (!withdrawalAge) return;
    const projectedValue = projectInvestmentAccumulatedAtAge(investment, startAge, withdrawalAge, state.scenarioRate);
    if (type === 'Lump sum') {
      addLumpSum({
        age: withdrawalAge,
        title: investment.name || 'Investment',
        amount: projectedValue,
        category: 'Investment',
        description: `Lump sum: ${formatCurrency(projectedValue)}`,
      });
      return;
    }
    const end = Math.max(withdrawalAge + 1, structure.withdrawalEndAge);
    const duration = Math.max(1, end - withdrawalAge);
    const frequency = type === 'Monthly income' ? 'monthly' : 'yearly';
    const amount = frequency === 'monthly' ? projectedValue / (duration * 12) : projectedValue / duration;
    addIncomeStream({
      start: withdrawalAge,
      end,
      title: investment.name || 'Investment income',
      category: 'Investment',
      amountPerPeriod: amount,
      frequency,
      description: `${type}: ${formatCurrency(amount)}${frequency === 'monthly' ? '/month' : '/year'}`,
    });
  });

  const lumpSumsByAge = lumpSums.reduce((groups, event) => {
    const age = Math.round(event.age);
    groups[age] = groups[age] ? [...groups[age], event] : [event];
    return groups;
  }, {});

  return {
    startAge,
    endAge,
    ticks: buildAgeTicks(startAge, endAge),
    lumpSums,
    lumpSumsByAge,
    milestones: lumpSums,
    incomeStreams,
    exportRows: buildTimelineExportRows(lumpSums, incomeStreams),
  };
};

const buildAgeTicks = (startAge, endAge) => {
  const ticks = [];
  for (let age = startAge; age <= endAge; age += 5) ticks.push(age);
  if (!ticks.includes(endAge)) ticks.push(endAge);
  return ticks;
};

const buildTimelineExportRows = (lumpSums, incomeStreams) => {
  const lumpRows = lumpSums.map((event) => ({
    age: event.age,
    type: 'Lump Sum',
    event: event.title,
    amountIncome: event.exportAmount,
    duration: event.exportDuration,
    description: event.description,
  }));
  const incomeRows = incomeStreams.map((stream) => ({
    age: stream.startAge,
    type: 'Income',
    event: `${stream.title} starts`,
    amountIncome: stream.exportAmount,
    duration: stream.exportDuration,
    description: stream.description,
  }));
  return [...lumpRows, ...incomeRows].sort((a, b) => asNumber(a.age) - asNumber(b.age));
};

export const getAgeTimelineDetails = (retirementTimeline, age) => {
  const selectedAge = asNumber(age);
  return {
    milestones: retirementTimeline.milestones.filter((item) => Math.round(item.age) === Math.round(selectedAge)),
    incomeStreams: getActiveIncomeStreams(retirementTimeline.incomeStreams, selectedAge),
  };
};

export const getActiveIncomeStreams = (incomeStreams = [], age) => {
  const selectedAge = asNumber(age);
  return incomeStreams.filter((stream) => {
    const starts = selectedAge >= asNumber(stream.startAge);
    const ends = stream.duration === 'Lifetime' || stream.isLifetime
      ? true
      : selectedAge <= asNumber(stream.endAge);
    return starts && ends;
  });
};

export const getLumpSumEventsAtAge = (milestones = [], age) => {
  const selectedAge = Math.round(asNumber(age));
  return milestones.filter((item) => Math.round(asNumber(item.age)) === selectedAge);
};

export const calculatePayoutSummary = ({ milestones = [], incomeStreams = [], age }) => {
  const activeIncomeStreams = typeof age === 'undefined'
    ? incomeStreams
    : getActiveIncomeStreams(incomeStreams, age);
  const lumpSumEvents = typeof age === 'undefined'
    ? milestones
    : getLumpSumEventsAtAge(milestones, age);
  const lumpSum = lumpSumEvents.reduce((total, event) => (
    event.countsAsLumpSum === false ? total : total + asNumber(event.amount)
  ), 0);
  const monthlyIncome = activeIncomeStreams
    .filter((stream) => stream.frequency === 'monthly')
    .reduce((total, stream) => total + asNumber(stream.amountPerPeriod), 0);
  const yearlyIncome = activeIncomeStreams
    .filter((stream) => stream.frequency === 'yearly')
    .reduce((total, stream) => total + asNumber(stream.amountPerPeriod), 0);

  return {
    lumpSum,
    monthlyIncome,
    yearlyIncome,
    combinedMonthlyEquivalent: monthlyIncome + yearlyIncome / 12,
  };
};

export const buildIncomeSources = ({ profile, age, ageDetails }) => {
  const selectedAge = asNumber(age);
  const yearsFromToday = Math.max(0, selectedAge - asNumber(profile.currentAge));
  const requiredMonthlyIncome = asNumber(profile.desiredMonthlyIncome) *
    (1 + rate(profile.inflationRate)) ** yearsFromToday;
  const grouped = ageDetails.incomeStreams.reduce((items, stream) => {
    const source = getIncomeSourceName(stream.category);
    const monthlyAmount = stream.frequency === 'monthly'
      ? asNumber(stream.amountPerPeriod)
      : asNumber(stream.amountPerPeriod) / 12;
    const existing = items.find((item) => item.source === source);
    if (existing) {
      existing.monthlyIncome += monthlyAmount;
    } else {
      items.push({ source, monthlyIncome: monthlyAmount });
    }
    return items;
  }, []);
  const totalMonthlyIncome = grouped.reduce((total, item) => total + item.monthlyIncome, 0);
  const inflationFactor = (1 + rate(profile.inflationRate)) ** yearsFromToday;

  return {
    age: selectedAge,
    totalMonthlyIncome,
    requiredMonthlyIncome,
    surplusShortfall: totalMonthlyIncome - requiredMonthlyIncome,
    todayValueEquivalent: inflationFactor > 0 ? totalMonthlyIncome / inflationFactor : totalMonthlyIncome,
    sources: grouped
      .filter((item) => item.monthlyIncome > 0)
      .map((item) => ({
        ...item,
        percentage: totalMonthlyIncome > 0 ? (item.monthlyIncome / totalMonthlyIncome) * 100 : 0,
      })),
  };
};

const getIncomeSourceName = (category = '') => {
  const normalized = category.toLowerCase();
  if (normalized.includes('cpf')) return 'CPF';
  if (normalized.includes('srs')) return 'SRS withdrawal';
  if (normalized.includes('policy')) return 'Policy income';
  if (normalized.includes('investment')) return 'Investment withdrawal';
  if (normalized.includes('cash')) return 'Cash / savings';
  return 'Other income';
};

export const calculateNeeds = (profile, projectedAmount) => {
  const yearsToRetirement = Math.max(0, asNumber(profile.retirementAge) - asNumber(profile.currentAge));
  const inflatedMonthlyIncome = asNumber(profile.desiredMonthlyIncome) *
    (1 + rate(profile.inflationRate)) ** yearsToRetirement;
  const durationNeed = inflatedMonthlyIncome * 12 * asNumber(profile.retirementDuration);
  const withdrawalNeed = asNumber(profile.withdrawalRate) > 0
    ? (inflatedMonthlyIncome * 12) / rate(profile.withdrawalRate)
    : durationNeed;
  const requiredAmount = Math.max(durationNeed, withdrawalNeed);
  const surplusShortfall = asNumber(projectedAmount) - requiredAmount;
  const monthlyNeeded = surplusShortfall >= 0
    ? 0
    : monthlyPaymentForFutureValue(Math.abs(surplusShortfall), profile.generalReturnRate, yearsToRetirement);

  return {
    futureMonthlyIncome: inflatedMonthlyIncome,
    requiredAmount,
    surplusShortfall,
    monthlyNeeded,
  };
};

const monthlyPaymentForFutureValue = (futureValue, annualRate, years) => {
  const months = Math.max(0, Math.round(years * 12));
  const monthlyRate = rate(annualRate) / 12;
  if (months <= 0) return futureValue;
  if (monthlyRate === 0) return futureValue / months;
  return futureValue * monthlyRate / ((1 + monthlyRate) ** months - 1);
};

export const startLaterComparison = (state) => {
  const base = calculateAtAge({ ...state, age: state.profile.retirementAge }).total;
  const years = Math.max(0, asNumber(state.profile.retirementAge) - asNumber(state.profile.currentAge));
  const delays = [0, 5, 10];
  return delays.map((delay) => {
    const delayedInvestmentValue = state.investments.reduce((total, investment) => {
      if (!investment.includeInTotal) return total;
      const effectiveRate = getEffectiveRate(investment.annualReturn, investment.useScenarioReturn, state.scenarioRate);
      return total + compoundAnnual(investment.currentValue, effectiveRate, years) +
        monthlyContributionFutureValue(investment.monthlyContribution, effectiveRate, Math.max(0, years - delay));
    }, 0);
    const delayedPolicyValue = (state.policies || []).reduce((total, policy) => (
      total + projectPolicyWithContributionDelay(
        policy,
        asNumber(state.profile.currentAge),
        asNumber(state.profile.retirementAge),
        state.scenarioRate,
        delay,
        years,
      )
    ), 0);
    const stableValue = calculateAtAge({ ...state, investments: [], policies: [], policyCashValueAssets: [], age: state.profile.retirementAge }).total;
    const delayedValue = stableValue + delayedInvestmentValue + delayedPolicyValue;
    const contributionYearsLost = delay === 0 ? 0 : Math.min(delay, Math.max(0, state.profile.retirementAge - state.profile.currentAge));
    const catchUpLabel = delay === 0 ? 'Start now' : `Start ${delay} years later`;
    return {
      label: catchUpLabel,
      delay,
      value: delayedValue,
      difference: delayedValue - base,
      contributionYearsLost,
    };
  });
};

export const formatCurrency = (value, compact = false) => new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
  maximumFractionDigits: 0,
  notation: compact ? 'compact' : 'standard',
}).format(asNumber(value));
