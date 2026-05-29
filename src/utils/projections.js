const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const rate = (percent) => asNumber(percent) / 100;

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

export const getEffectiveRate = (itemRate, useScenarioReturn, scenarioRate) => (
  useScenarioReturn ? scenarioRate : asNumber(itemRate)
);

export const projectCpf = (cpf, years) => {
  if (!cpf.enabled) return 0;
  const currentBalance = asNumber(cpf.oaBalance) + asNumber(cpf.saBalance) + asNumber(cpf.maBalance);
  return futureValueWithMonthlyContributions(
    currentBalance,
    cpf.monthlyContribution,
    cpf.annualInterest,
    years,
  );
};

export const projectCpfOaSa = (cpf, currentAge, targetAge) => {
  if (!cpf.enabled) return 0;
  const years = Math.max(0, asNumber(targetAge) - asNumber(currentAge));
  const currentBalance = asNumber(cpf.oaBalance) + asNumber(cpf.saBalance);
  return futureValueWithMonthlyContributions(
    currentBalance,
    cpf.monthlyContribution,
    cpf.annualInterest,
    years,
  );
};

export const projectSrs = (srs, currentAge, targetAge) => {
  if (!srs.enabled || currentAge >= srs.withdrawalAge) return srs.enabled ? asNumber(srs.currentBalance) : 0;
  const years = Math.max(0, Math.min(targetAge, asNumber(srs.withdrawalAge)) - currentAge);
  return compoundAnnual(srs.currentBalance, srs.annualReturn, years) +
    annualContributionFutureValue(srs.annualContribution, srs.annualReturn, years);
};

export const projectPolicy = (policy, currentAge, targetAge, scenarioRate) => {
  const years = Math.max(0, targetAge - currentAge);
  return projectPolicyWithContributionDelay(policy, currentAge, targetAge, scenarioRate, 0, years);
};

const projectPolicyWithContributionDelay = (policy, currentAge, targetAge, scenarioRate, delayYears = 0, totalYears = null) => {
  const years = totalYears ?? Math.max(0, targetAge - currentAge);
  const withdrawalAge = asNumber(policy.withdrawalAge) || targetAge;
  if (targetAge > withdrawalAge) return 0;

  const annualPremium = asNumber(policy.premiumAmount) * (frequencyMultiplier[policy.premiumFrequency] || 12);
  const elapsedYears = Math.max(0, currentAge - asNumber(policy.startAge));
  const remainingPremiumYears = Math.max(0, asNumber(policy.premiumTermYears) - elapsedYears);
  const contributionYears = Math.max(0, Math.min(years - delayYears, remainingPremiumYears));
  const effectiveRate = getEffectiveRate(policy.annualReturn, policy.useScenarioReturn, scenarioRate);

  const currentGrowth = compoundAnnual(policy.currentValue, effectiveRate, years);
  const premiumGrowthToPaymentEnd = annualContributionFutureValue(annualPremium, effectiveRate, contributionYears);
  const premiumGrowthToTarget = compoundAnnual(premiumGrowthToPaymentEnd, effectiveRate, years - delayYears - contributionYears);
  return currentGrowth + premiumGrowthToTarget;
};

export const projectInvestment = (investment, years, scenarioRate) => {
  const effectiveRate = getEffectiveRate(investment.annualReturn, investment.useScenarioReturn, scenarioRate);
  return futureValueWithMonthlyContributions(
    investment.currentValue,
    investment.monthlyContribution,
    effectiveRate,
    years,
  );
};

export const projectCash = (cash, years) => {
  const accessibleBase = asNumber(cash.currentSavings) - (cash.includeEmergencyFund ? 0 : asNumber(cash.emergencyFund));
  const base = Math.max(0, accessibleBase);
  return futureValueWithMonthlyContributions(base, cash.monthlySavings, cash.annualInterest, years);
};

export const calculateAtAge = ({ profile, cpf, srs, policies, investments, cash, scenarioRate, age }) => {
  const years = Math.max(0, asNumber(age) - asNumber(profile.currentAge));
  const cpfValue = cpf.includeInTotal ? projectCpf(cpf, years) : 0;
  const visibleCpfValue = projectCpf(cpf, years);
  const srsValue = projectSrs(srs, asNumber(profile.currentAge), asNumber(age));
  const policyValue = policies.reduce(
    (total, policy) => total + projectPolicy(policy, asNumber(profile.currentAge), asNumber(age), scenarioRate),
    0,
  );
  const investmentValue = investments.reduce((total, investment) => (
    total + (investment.includeInTotal ? projectInvestment(investment, years, scenarioRate) : 0)
  ), 0);
  const visibleInvestmentValue = investments.reduce(
    (total, investment) => total + projectInvestment(investment, years, scenarioRate),
    0,
  );
  const cashValue = projectCash(cash, years);
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
  const rows = [];
  const milestones = [];
  const incomeStreams = [];

  state.policies.forEach((policy) => {
    const start = asNumber(policy.startAge) || startAge;
    const premiumEndAge = start + asNumber(policy.premiumTermYears);
    const withdrawalAge = asNumber(policy.withdrawalAge) || premiumEndAge;
    const projectedValue = projectPolicy(policy, startAge, withdrawalAge, state.scenarioRate);
    rows.push({
      id: `policy-${policy.id}`,
      type: 'policy',
      title: policy.name || 'Policy',
      subtitle: `Start ${start} | Premium paying ${start}-${premiumEndAge} | Available ${withdrawalAge}`,
      startAge: start,
      endAge: withdrawalAge,
      premiumEndAge,
      projectedValue,
      left: toPercent(start),
      width: `calc(${toPercent(withdrawalAge)} - ${toPercent(start)})`,
      premiumWidth: `${Math.min(100, Math.max(0, ((premiumEndAge - start) / Math.max(1, withdrawalAge - start)) * 100))}%`,
      milestoneLabel: `${withdrawalAge === premiumEndAge ? 'Matures' : `Projected value at ${withdrawalAge}`}: ${formatCurrency(projectedValue)}`,
    });
    milestones.push({
      age: withdrawalAge,
      title: policy.name || 'Policy',
      description: `${withdrawalAge === premiumEndAge ? 'Matures' : 'Available'}: ${formatCurrency(projectedValue)}`,
      category: 'Policy',
    });
  });

  if (state.cpf.enabled) {
    const cpf55Age = 55;
    const cpfOaSaAt55 = projectCpfOaSa(state.cpf, startAge, cpf55Age);
    const frs = asNumber(state.cpf.frsAmountAt55);
    const excess = cpfOaSaAt55 - frs;
    if (cpf55Age >= startAge && cpf55Age <= endAge) {
      rows.push({
        id: 'cpf-55',
        type: 'cpf-milestone',
        title: 'CPF 55 milestone',
        startAge: cpf55Age,
        endAge: cpf55Age,
        left: toPercent(cpf55Age),
        milestoneLabel: excess >= 0
          ? `Estimated excess withdrawable: ${formatCurrency(excess)}`
          : `Estimated FRS shortfall: ${formatCurrency(Math.abs(excess))}`,
      });
      milestones.push({
        age: cpf55Age,
        title: 'CPF 55 milestone',
        category: 'CPF',
        description: `Projected OA + SA: ${formatCurrency(cpfOaSaAt55)}. FRS set aside: ${formatCurrency(frs)}. ${excess >= 0 ? 'Estimated excess withdrawable' : 'Estimated FRS shortfall'}: ${formatCurrency(Math.abs(excess))}.`,
      });
    }

    const payoutStart = asNumber(state.cpf.cpfLifePayoutStartAge) || 65;
    rows.push({
      id: 'cpf-life',
      type: 'income',
      title: `CPF LIFE: ${formatCurrency(state.cpf.cpfLifeMonthlyPayout)}/month`,
      subtitle: `Recurring income from age ${payoutStart}`,
      startAge: payoutStart,
      endAge,
      left: toPercent(payoutStart),
      width: `calc(${toPercent(endAge)} - ${toPercent(payoutStart)})`,
    });
    incomeStreams.push({
      startAge: payoutStart,
      endAge,
      title: 'CPF LIFE',
      description: `${formatCurrency(state.cpf.cpfLifeMonthlyPayout)}/month from age ${payoutStart}`,
    });
  }

  if (state.srs.enabled) {
    const withdrawalStart = asNumber(state.srs.withdrawalStartAge) || asNumber(state.srs.withdrawalAge);
    const duration = Math.max(1, asNumber(state.srs.withdrawalDurationYears) || 1);
    const withdrawalEnd = withdrawalStart + duration;
    const projectedSrs = projectSrs(state.srs, startAge, withdrawalStart);
    const annualWithdrawal = projectedSrs / duration;
    rows.push({
      id: 'srs-withdrawal',
      type: 'srs',
      title: `SRS withdrawal: ${formatCurrency(annualWithdrawal)}/year`,
      subtitle: `${formatCurrency(annualWithdrawal / 12)}/month from age ${withdrawalStart}-${withdrawalEnd}`,
      startAge: withdrawalStart,
      endAge: withdrawalEnd,
      left: toPercent(withdrawalStart),
      width: `calc(${toPercent(withdrawalEnd)} - ${toPercent(withdrawalStart)})`,
    });
    incomeStreams.push({
      startAge: withdrawalStart,
      endAge: withdrawalEnd,
      title: 'SRS withdrawal',
      description: `${formatCurrency(annualWithdrawal)}/year or ${formatCurrency(annualWithdrawal / 12)}/month`,
    });
    milestones.push({
      age: withdrawalStart,
      title: 'SRS withdrawal starts',
      category: 'SRS',
      description: `Projected SRS value: ${formatCurrency(projectedSrs)}.`,
    });
  }

  state.investments.forEach((investment) => {
    const withdrawalAge = asNumber(investment.plannedWithdrawalAge);
    if (!withdrawalAge) return;
    const yearsToWithdrawal = Math.max(0, withdrawalAge - startAge);
    const projectedValue = projectInvestment(investment, yearsToWithdrawal, state.scenarioRate);
    rows.push({
      id: `investment-${investment.id}`,
      type: 'investment',
      title: investment.name || 'Investment available',
      startAge: withdrawalAge,
      endAge: withdrawalAge,
      left: toPercent(withdrawalAge),
      milestoneLabel: `Investment available: ${formatCurrency(projectedValue)}`,
    });
    milestones.push({
      age: withdrawalAge,
      title: investment.name || 'Investment',
      category: 'Investment',
      description: `Investment available: ${formatCurrency(projectedValue)}.`,
    });
  });

  const cashWithdrawalAge = asNumber(state.cash.plannedWithdrawalAge);
  if (cashWithdrawalAge) {
    const projectedCash = projectCash(state.cash, Math.max(0, cashWithdrawalAge - startAge));
    rows.push({
      id: 'cash-available',
      type: 'cash',
      title: 'Cash / savings available',
      startAge: cashWithdrawalAge,
      endAge: cashWithdrawalAge,
      left: toPercent(cashWithdrawalAge),
      milestoneLabel: `Cash available: ${formatCurrency(projectedCash)}`,
    });
    milestones.push({
      age: cashWithdrawalAge,
      title: 'Cash available',
      category: 'Cash',
      description: `Cash available: ${formatCurrency(projectedCash)}.`,
    });
  }

  return {
    startAge,
    endAge,
    ticks: buildAgeTicks(startAge, endAge),
    rows,
    milestones,
    incomeStreams,
  };
};

const buildAgeTicks = (startAge, endAge) => {
  const ticks = [];
  for (let age = startAge; age <= endAge; age += 5) ticks.push(age);
  if (!ticks.includes(endAge)) ticks.push(endAge);
  return ticks;
};

export const getAgeTimelineDetails = (retirementTimeline, age) => {
  const selectedAge = asNumber(age);
  return {
    milestones: retirementTimeline.milestones.filter((item) => Math.round(item.age) === Math.round(selectedAge)),
    incomeStreams: retirementTimeline.incomeStreams.filter((item) => selectedAge >= item.startAge && selectedAge <= item.endAge),
  };
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
    const delayedPolicyValue = state.policies.reduce((total, policy) => (
      total + projectPolicyWithContributionDelay(
        policy,
        asNumber(state.profile.currentAge),
        asNumber(state.profile.retirementAge),
        state.scenarioRate,
        delay,
        years,
      )
    ), 0);
    const stableValue = calculateAtAge({ ...state, investments: [], policies: [], age: state.profile.retirementAge }).total;
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
