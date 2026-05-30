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
  const structure = getPolicyStructure(policy, targetAge);
  if (structure.withdrawalType !== 'Keep invested / no withdrawal yet' && targetAge > structure.withdrawalStartAge) return 0;

  const annualPremium = asNumber(policy.premiumAmount) * (frequencyMultiplier[policy.premiumFrequency] || 12);
  const remainingPremiumYears = Math.max(0, structure.premiumEndAge - currentAge - delayYears);
  const contributionYears = Math.max(0, Math.min(years - delayYears, remainingPremiumYears));
  const effectiveRate = getEffectiveRate(policy.annualReturn, policy.useScenarioReturn, scenarioRate);

  const currentGrowth = compoundAnnual(policy.currentValue, effectiveRate, years);
  const premiumGrowthToPaymentEnd = annualContributionFutureValue(annualPremium, effectiveRate, contributionYears);
  const premiumGrowthToTarget = compoundAnnual(premiumGrowthToPaymentEnd, effectiveRate, years - delayYears - contributionYears);
  return currentGrowth + premiumGrowthToTarget;
};

export const getPolicyStructure = (policy, fallbackAge = 65) => {
  const startAge = asNumber(policy.startAge);
  const premiumCommitmentTerm = asNumber(policy.premiumCommitmentTerm ?? policy.premiumTermYears);
  const commitmentEndAge = startAge + premiumCommitmentTerm;
  const holdingUntilAge = asNumber(policy.holdingUntilAge ?? policy.withdrawalStartAge ?? policy.withdrawalAge) || fallbackAge;
  const withdrawalStartAge = asNumber(policy.withdrawalStartAge ?? policy.withdrawalAge ?? holdingUntilAge) || holdingUntilAge;
  const withdrawalType = policy.withdrawalType || 'Lump sum';
  const continuedPremiumEndAge = policy.continuePremiumsAfterCommitment
    ? asNumber(policy.continuedPremiumEndAge ?? holdingUntilAge) || holdingUntilAge
    : commitmentEndAge;
  const premiumEndAge = Math.max(commitmentEndAge, continuedPremiumEndAge);
  const withdrawalEndAge = asNumber(policy.withdrawalEndAge) || withdrawalStartAge + 10;
  const withdrawalDuration = Math.max(1, withdrawalEndAge - withdrawalStartAge);

  return {
    startAge,
    premiumCommitmentTerm,
    commitmentEndAge,
    continuedPremiumEndAge,
    premiumEndAge,
    holdingUntilAge,
    withdrawalStartAge,
    withdrawalEndAge,
    withdrawalDuration,
    withdrawalType,
    postCommitmentGrowthYears: Math.max(0, holdingUntilAge - commitmentEndAge),
  };
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

export const isCashIncludedInProjection = (cash = {}) => cash.includeCashInProjection !== false;

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
  const cashValue = isCashIncludedInProjection(cash) ? projectCash(cash, years) : 0;
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
  const addLumpSum = ({ age, title, amount, category, description }) => {
    const eventAge = asNumber(age);
    if (!eventAge || eventAge < startAge || eventAge > endAge) return;
    lumpSums.push({
      id: `${category}-${title}-${eventAge}-${lumpSums.length}`,
      age: eventAge,
      title,
      amount,
      category,
      description: description || `${title}: ${formatCurrency(amount)}`,
      left: toPercent(eventAge),
      exportType: 'Lump Sum',
      exportAmount: formatCurrency(amount),
      exportDuration: 'One-time',
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

  state.policies.forEach((policy) => {
    const structure = getPolicyStructure(policy, state.profile.retirementAge);
    const withdrawalAge = structure.withdrawalStartAge || structure.holdingUntilAge;
    const projectedValue = projectPolicy(policy, startAge, withdrawalAge, state.scenarioRate);
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

  if (state.cpf.enabled) {
    const cpf55Age = 55;
    const cpfOaSaAt55 = projectCpfOaSa(state.cpf, startAge, cpf55Age);
    const frs = asNumber(state.cpf.frsAmountAt55);
    const excess = cpfOaSaAt55 - frs;
    if (cpf55Age >= startAge && cpf55Age <= endAge) {
      addLumpSum({
        age: cpf55Age,
        title: 'CPF 55 milestone',
        amount: Math.abs(excess),
        category: 'CPF',
        description: `Projected OA + SA: ${formatCurrency(cpfOaSaAt55)}. FRS set aside: ${formatCurrency(frs)}. ${excess >= 0 ? 'Estimated excess withdrawable' : 'Estimated FRS shortfall'}: ${formatCurrency(Math.abs(excess))}.`,
      });
    }

    const payoutStart = asNumber(state.cpf.cpfLifePayoutStartAge) || 65;
    addIncomeStream({
      start: payoutStart,
      end: endAge,
      title: `CPF LIFE: ${formatCurrency(state.cpf.cpfLifeMonthlyPayout)}/month`,
      category: 'CPF',
      amountPerPeriod: state.cpf.cpfLifeMonthlyPayout,
      frequency: 'monthly',
      description: `From age ${payoutStart}. ${formatCurrency(state.cpf.cpfLifeMonthlyPayout)}/month. Lifetime income.`,
      durationLabel: 'Lifetime',
    });
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
    const type = investment.withdrawalType || 'Lump sum';
    if (type === 'Not shown on timeline') return;
    const withdrawalAge = asNumber(investment.plannedWithdrawalAge);
    if (!withdrawalAge) return;
    const yearsToWithdrawal = Math.max(0, withdrawalAge - startAge);
    const projectedValue = projectInvestment(investment, yearsToWithdrawal, state.scenarioRate);
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
    const end = Math.max(withdrawalAge + 1, asNumber(investment.withdrawalEndAge) || withdrawalAge + 10);
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

  const cashType = state.cash.withdrawalType || 'Lump sum';
  const cashWithdrawalAge = asNumber(state.cash.plannedWithdrawalAge);
  if (isCashIncludedInProjection(state.cash) && cashWithdrawalAge && cashType !== 'Not shown on timeline') {
    const projectedCash = projectCash(state.cash, Math.max(0, cashWithdrawalAge - startAge));
    if (cashType === 'Lump sum') {
      addLumpSum({
        age: cashWithdrawalAge,
        title: 'Cash / savings',
        amount: projectedCash,
        category: 'Cash',
        description: `Lump sum: ${formatCurrency(projectedCash)}`,
      });
    } else {
      const end = Math.max(cashWithdrawalAge + 1, asNumber(state.cash.withdrawalEndAge) || cashWithdrawalAge + 10);
      const duration = Math.max(1, end - cashWithdrawalAge);
      const frequency = cashType === 'Monthly income' ? 'monthly' : 'yearly';
      const amount = frequency === 'monthly' ? projectedCash / (duration * 12) : projectedCash / duration;
      addIncomeStream({
        start: cashWithdrawalAge,
        end,
        title: 'Cash / savings income',
        category: 'Cash',
        amountPerPeriod: amount,
        frequency,
        description: `${cashType}: ${formatCurrency(amount)}${frequency === 'monthly' ? '/month' : '/year'}`,
      });
    }
  }

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
  const lumpSum = lumpSumEvents.reduce((total, event) => total + asNumber(event.amount), 0);
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
  if (normalized.includes('cpf')) return 'CPF LIFE';
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
