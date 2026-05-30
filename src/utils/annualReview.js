import {
  buildIncomeSources,
  buildRetirementTimeline,
  calculateAtAge,
  calculateNeeds,
  getAgeTimelineDetails,
  getRetirementTimelineEndAge,
} from './projections.js';
import { SCENARIOS } from '../data/defaults.js';

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function buildReviewSnapshot(state) {
  const scenarioRate = SCENARIOS[state.scenario || 'balanced']?.returnRate || 5;
  const projectionState = {
    profile: state.profile,
    cpf: state.cpf,
    srs: state.srs,
    policies: state.policies || [],
    investments: state.investments || [],
    cash: state.cash,
    scenarioRate,
    timelineEndAge: getRetirementTimelineEndAge(state.profile),
  };
  const retirementPoint = calculateAtAge({ ...projectionState, age: state.profile.retirementAge });
  const needs = calculateNeeds(state.profile, retirementPoint.total);
  const retirementTimeline = buildRetirementTimeline(projectionState);
  const ageDetails = getAgeTimelineDetails(retirementTimeline, state.profile.retirementAge);
  const incomeSources = buildIncomeSources({
    profile: state.profile,
    age: state.profile.retirementAge,
    ageDetails,
  });

  return {
    retirementPoint,
    needs,
    incomeSources,
  };
}

export function buildAnnualReviewComparison(previousReviewData, currentState, currentSnapshot) {
  if (!previousReviewData?.data) return null;
  const previousSnapshot = buildReviewSnapshot(previousReviewData.data);
  const previousShortfall = previousSnapshot.needs.surplusShortfall;
  const currentShortfall = currentSnapshot.needs.surplusShortfall;
  const gapDifference = currentShortfall - previousShortfall;
  const amountDifference = currentSnapshot.retirementPoint.total - previousSnapshot.retirementPoint.total;
  const incomeDifference = currentSnapshot.incomeSources.totalMonthlyIncome - previousSnapshot.incomeSources.totalMonthlyIncome;

  return {
    previousDate: previousReviewData.exportedAt,
    currentDate: new Date().toISOString(),
    previousProjectedAmount: previousSnapshot.retirementPoint.total,
    currentProjectedAmount: currentSnapshot.retirementPoint.total,
    projectedAmountDifference: amountDifference,
    previousGap: previousShortfall,
    currentGap: currentShortfall,
    gapDifference,
    previousMonthlyIncome: previousSnapshot.incomeSources.totalMonthlyIncome,
    currentMonthlyIncome: currentSnapshot.incomeSources.totalMonthlyIncome,
    monthlyIncomeDifference: incomeDifference,
    statusItems: [
      amountDifference >= 0 ? 'Projected amount improved' : 'Projected amount reduced',
      gapDifference >= 0 ? 'Retirement gap reduced' : 'Retirement gap widened',
      incomeDifference >= 0 ? 'Income improved' : 'Income reduced',
    ],
    status: amountDifference >= 0 && gapDifference >= 0 && incomeDifference >= 0
      ? 'Ahead of track'
      : 'Needs adjustment',
    previousSnapshot,
    currentSnapshot,
    currentState,
  };
}

export function buildChangedSinceLastReview(previousReviewData, currentState, comparison) {
  if (!previousReviewData?.data) return [];
  const previous = previousReviewData.data;
  const changes = [];

  addNumberChange(changes, 'Client Profile', 'Current age', previous.profile.currentAge, currentState.profile.currentAge, 'number');
  addNumberChange(changes, 'Client Profile', 'Monthly income', previous.profile.monthlyIncome, currentState.profile.monthlyIncome, 'currency');
  addNumberChange(changes, 'Client Profile', 'Monthly expenses', previous.profile.monthlyExpenses, currentState.profile.monthlyExpenses, 'currency');
  addNumberChange(changes, 'Client Profile', 'Monthly savings', previous.profile.monthlySavings, currentState.profile.monthlySavings, 'currency');
  addNumberChange(changes, 'Client Profile', 'Desired retirement income', previous.profile.desiredMonthlyIncome, currentState.profile.desiredMonthlyIncome, 'currency');
  addNumberChange(changes, 'Client Profile', 'Retirement age', previous.profile.retirementAge, currentState.profile.retirementAge, 'number');
  addNumberChange(changes, 'Client Profile', 'Retirement duration', previous.profile.retirementDuration, currentState.profile.retirementDuration, 'years');
  addNumberChange(changes, 'Client Profile', 'Inflation assumption', previous.profile.inflationRate, currentState.profile.inflationRate, 'percent');

  addNumberChange(changes, 'CPF', 'CPF OA balance', previous.cpf.oaBalance, currentState.cpf.oaBalance, 'currency');
  addNumberChange(changes, 'CPF', 'CPF SA balance', previous.cpf.saBalance, currentState.cpf.saBalance, 'currency');
  addNumberChange(changes, 'CPF', 'CPF MA balance', previous.cpf.maBalance, currentState.cpf.maBalance, 'currency');
  addNumberChange(changes, 'CPF', 'CPF contribution', previous.cpf.monthlyContribution, currentState.cpf.monthlyContribution, 'currency');
  addNumberChange(changes, 'CPF', 'FRS assumption', previous.cpf.frsAmountAt55, currentState.cpf.frsAmountAt55, 'currency');
  addNumberChange(changes, 'CPF', 'CPF LIFE payout assumption', previous.cpf.cpfLifeMonthlyPayout, currentState.cpf.cpfLifeMonthlyPayout, 'currency');

  addNumberChange(changes, 'SRS', 'SRS balance', previous.srs.currentBalance, currentState.srs.currentBalance, 'currency');
  addNumberChange(changes, 'SRS', 'Annual SRS contribution', previous.srs.annualContribution, currentState.srs.annualContribution, 'currency');
  addNumberChange(changes, 'SRS', 'SRS withdrawal age', previous.srs.withdrawalStartAge, currentState.srs.withdrawalStartAge, 'number');
  addNumberChange(changes, 'SRS', 'SRS withdrawal duration', previous.srs.withdrawalDurationYears, currentState.srs.withdrawalDurationYears, 'years');

  compareNamedItems(changes, 'Policies', previous.policies || [], currentState.policies || [], 'policy', [
    ['premiumAmount', 'premium', 'currency'],
    ['currentValue', 'current value', 'currency'],
    ['withdrawalAge', 'withdrawal age', 'number'],
    ['withdrawalType', 'payout type', 'text'],
  ]);

  compareNamedItems(changes, 'Investments', previous.investments || [], currentState.investments || [], 'investment', [
    ['currentValue', 'value', 'currency'],
    ['monthlyContribution', 'contribution', 'currency'],
    ['plannedWithdrawalAge', 'withdrawal age', 'number'],
    ['withdrawalType', 'withdrawal type', 'text'],
  ]);

  addNumberChange(changes, 'Cash / Savings', 'Cash balance', previous.cash.currentSavings, currentState.cash.currentSavings, 'currency');
  addNumberChange(changes, 'Cash / Savings', 'Monthly cash savings', previous.cash.monthlySavings, currentState.cash.monthlySavings, 'currency');
  addNumberChange(changes, 'Cash / Savings', 'Emergency fund amount', previous.cash.emergencyFund, currentState.cash.emergencyFund, 'currency');
  addTextChange(changes, 'Cash / Savings', 'Cash withdrawal settings', previous.cash.withdrawalType, currentState.cash.withdrawalType);
  addTextChange(
    changes,
    'Cash / Savings',
    'Cash projection inclusion',
    previous.cash.includeCashInProjection === false ? 'Excluded' : 'Included',
    currentState.cash.includeCashInProjection === false ? 'Excluded' : 'Included',
  );

  if (comparison) {
    addNumberChange(changes, 'Retirement Progress', 'Projected retirement amount', comparison.previousProjectedAmount, comparison.currentProjectedAmount, 'currency');
    addNumberChange(changes, 'Retirement Progress', 'Projected monthly income', comparison.previousMonthlyIncome, comparison.currentMonthlyIncome, 'currency-month');
    addNumberChange(changes, 'Retirement Progress', 'Retirement gap', comparison.previousGap, comparison.currentGap, 'currency');
  }

  return changes;
}

function compareNamedItems(changes, group, previousItems, currentItems, itemLabel, fields) {
  const previousMap = new Map(previousItems.map((item) => [item.name || item.id, item]));
  const currentMap = new Map(currentItems.map((item) => [item.name || item.id, item]));

  currentMap.forEach((item, key) => {
    if (!previousMap.has(key)) {
      changes.push({ group, tone: 'positive', text: `New ${itemLabel} added: ${item.name || key}` });
      return;
    }
    const previous = previousMap.get(key);
    fields.forEach(([field, label, type]) => {
      if (type === 'text') addTextChange(changes, group, `${item.name || key} ${label}`, previous[field], item[field]);
      else addNumberChange(changes, group, `${item.name || key} ${label}`, previous[field], item[field], type);
    });
  });

  previousMap.forEach((item, key) => {
    if (!currentMap.has(key)) {
      changes.push({ group, tone: 'negative', text: `${capitalize(itemLabel)} removed: ${item.name || key}` });
    }
  });
}

function addNumberChange(changes, group, label, previousValue, currentValue, type) {
  const previous = asNumber(previousValue);
  const current = asNumber(currentValue);
  const difference = current - previous;
  if (Math.abs(difference) < 0.01) return;
  changes.push({
    group,
    tone: difference >= 0 ? 'positive' : 'negative',
    text: `${label} ${difference >= 0 ? 'increased' : 'decreased'} from ${formatValue(previous, type)} to ${formatValue(current, type)} (${difference >= 0 ? '+' : ''}${formatValue(difference, type)})`,
  });
}

function addTextChange(changes, group, label, previousValue, currentValue) {
  if ((previousValue || '') === (currentValue || '')) return;
  changes.push({
    group,
    tone: 'neutral',
    text: `${label} changed from ${previousValue || 'not set'} to ${currentValue || 'not set'}`,
  });
}

function formatValue(value, type) {
  if (type === 'currency') return currency(value);
  if (type === 'currency-month') return `${currency(value)}/month`;
  if (type === 'percent') return `${asNumber(value)}%`;
  if (type === 'years') return `${asNumber(value)} years`;
  return `${asNumber(value)}`;
}

function currency(value) {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    maximumFractionDigits: 0,
  }).format(asNumber(value));
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
