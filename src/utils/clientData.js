import {
  defaultCash,
  defaultCpf,
  defaultProfile,
  defaultSrs,
  starterInvestments,
  starterPolicies,
} from '../data/defaults.js';

export const CLIENT_DATA_APP_NAME = 'Retirement Sum Calculator';
export const CLIENT_DATA_SCHEMA_VERSION = 2;
export const CLIENT_DATA_STORAGE_KEY = 'retirement-sum-calculator-client-data';

export const defaultAdvisorInsight = 'Client has strong income but most wealth is held in cash. Main opportunity is to improve long-term compounding and reduce inflation drag.';

export function buildExportPayload(data) {
  return {
    appName: CLIENT_DATA_APP_NAME,
    schemaVersion: CLIENT_DATA_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function buildClientDataState({
  profile,
  cpf,
  srs,
  policies,
  investments,
  cash,
  scenario,
  selectedAge,
  advisorInsight,
  followUpTasks = [],
  previousReviewData = null,
  includeFollowUpTasksInPdf = false,
}) {
  return {
    profile,
    cpf,
    srs,
    policies,
    investments,
    cash,
    scenario,
    selectedAge,
    advisorInsight,
    followUpTasks,
    previousReviewData,
    includeFollowUpTasksInPdf,
  };
}

export function validateImportPayload(payload) {
  if (
    !payload ||
    payload.appName !== CLIENT_DATA_APP_NAME ||
    typeof payload.schemaVersion === 'undefined' ||
    !payload.data
  ) {
    return {
      valid: false,
      error: 'Invalid client data file. Please upload a valid Retirement Sum Calculator JSON file.',
    };
  }

  return { valid: true };
}

export function restoreCalculatorState(data = {}) {
  return {
    profile: { ...defaultProfile, ...(data.profile || {}) },
    cpf: normalizeCpfFields(data.cpf, data.cpfEnabled),
    srs: { ...defaultSrs, ...(data.srs || {}) },
    policies: normalizeList(data.policies, starterPolicies),
    investments: normalizeList(data.investments, starterInvestments),
    cash: { ...defaultCash, ...(data.cash || {}) },
    scenario: data.scenario || 'balanced',
    selectedAge: Number.isFinite(Number(data.selectedAge))
      ? Number(data.selectedAge)
      : Number(data.profile?.retirementAge || defaultProfile.retirementAge),
    advisorInsight: typeof data.advisorInsight === 'string' ? data.advisorInsight : defaultAdvisorInsight,
    followUpTasks: normalizeTasks(data.followUpTasks),
    previousReviewData: data.previousReviewData || null,
    includeFollowUpTasksInPdf: Boolean(data.includeFollowUpTasksInPdf),
  };
}

export function downloadClientData(payload, clientName, exportDate) {
  const filename = buildDataFilename(clientName, exportDate);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function importClientData(file) {
  if (!file) return null;
  const isJson = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
  if (!isJson) {
    throw new Error('Invalid client data file. Please upload a valid Retirement Sum Calculator JSON file.');
  }

  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    throw new Error('Invalid client data file. Please upload a valid Retirement Sum Calculator JSON file.');
  }

  const validation = validateImportPayload(payload);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return restoreCalculatorState(payload.data);
}

export async function importPreviousReviewData(file) {
  if (!file) return null;
  const isJson = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
  if (!isJson) {
    throw new Error('Invalid client data file. Please upload a valid Retirement Sum Calculator JSON file.');
  }

  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    throw new Error('Invalid client data file. Please upload a valid Retirement Sum Calculator JSON file.');
  }

  const validation = validateImportPayload(payload);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return {
    exportedAt: payload.exportedAt || '',
    schemaVersion: payload.schemaVersion,
    data: restoreCalculatorState(payload.data),
  };
}

export function saveClientDataToStorage(data) {
  if (typeof window === 'undefined') return;
  const payload = buildExportPayload(data);
  localStorage.setItem(CLIENT_DATA_STORAGE_KEY, JSON.stringify(payload));
}

export function loadClientDataFromStorage() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(CLIENT_DATA_STORAGE_KEY);
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw);
    const validation = validateImportPayload(payload);
    return validation.valid ? restoreCalculatorState(payload.data) : null;
  } catch {
    return null;
  }
}

export function clearSavedClientData() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CLIENT_DATA_STORAGE_KEY);
}

function normalizeCpfFields(cpfData, legacyCpfEnabled) {
  if (!cpfData) {
    return {
      ...defaultCpf,
      enabled: false,
      oaBalance: 0,
      saBalance: 0,
      maBalance: 0,
      monthlyContribution: 0,
    };
  }
  const merged = {
    ...defaultCpf,
    ...cpfData,
    cpfRulesVersion: cpfData.cpfRulesVersion || defaultCpf.cpfRulesVersion,
    brsGrowthRateAfterLastKnownYear: cpfData.brsGrowthRateAfterLastKnownYear ?? defaultCpf.brsGrowthRateAfterLastKnownYear,
    retirementSumType: cpfData.retirementSumType || (cpfData.useManualRetirementSumAmount ? 'Manual' : defaultCpf.retirementSumType),
    useManualRetirementSumAmount: Boolean(cpfData.useManualRetirementSumAmount),
    manualRetirementSumAmount: cpfData.manualRetirementSumAmount ?? cpfData.frsAmountAt55 ?? defaultCpf.manualRetirementSumAmount,
    minimumWithdrawalIfBelowFRS: cpfData.minimumWithdrawalIfBelowFRS ?? defaultCpf.minimumWithdrawalIfBelowFRS,
    includeCpf55WithdrawableInTimeline: cpfData.includeCpf55WithdrawableInTimeline ?? defaultCpf.includeCpf55WithdrawableInTimeline,
  };
  if (typeof cpfData.enabled !== 'undefined') return merged;
  if (typeof legacyCpfEnabled !== 'undefined') {
    return { ...merged, enabled: Boolean(legacyCpfEnabled) };
  }

  return {
    ...merged,
    enabled: (
      Number(merged.oaBalance) > 0 ||
      Number(merged.saBalance) > 0 ||
      Number(merged.maBalance) > 0 ||
      Number(merged.monthlyContribution) > 0
    ),
  };
}

function buildDataFilename(clientName, exportDate) {
  const cleanName = (clientName || '')
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return `${cleanName ? `${cleanName}-` : ''}Retirement-Data-${exportDate}.json`;
}

function normalizeList(value, defaults) {
  if (!Array.isArray(value)) return defaults;
  const fallback = defaults[0] || {};
  return value.map((item, index) => ({
    ...fallback,
    ...item,
    ...(fallback.premiumCommitmentTerm !== undefined ? normalizePolicyFields(item, fallback) : {}),
    id: item?.id || `imported-${index + 1}`,
  }));
}

function normalizePolicyFields(item = {}, fallback = {}) {
  const startAge = item.startAge ?? fallback.startAge;
  const commitmentTerm = item.premiumCommitmentTerm ?? item.premiumTermYears ?? fallback.premiumCommitmentTerm;
  const withdrawalAge = item.withdrawalStartAge ?? item.withdrawalAge ?? fallback.withdrawalStartAge;
  return {
    policyStructure: item.policyStructure || fallback.policyStructure || 'Custom',
    premiumCommitmentTerm: commitmentTerm,
    premiumTermYears: item.premiumTermYears ?? commitmentTerm,
    continuePremiumsAfterCommitment: Boolean(item.continuePremiumsAfterCommitment),
    continuedPremiumEndAge: item.continuedPremiumEndAge ?? item.holdingUntilAge ?? withdrawalAge,
    holdingUntilAge: item.holdingUntilAge ?? withdrawalAge,
    withdrawalStartAge: withdrawalAge,
    withdrawalAge,
    withdrawalEndAge: item.withdrawalEndAge ?? (Number(withdrawalAge) || Number(startAge) || 0) + 10,
    withdrawalType: item.withdrawalType || fallback.withdrawalType || 'Lump sum',
    showClientExplanation: Boolean(item.showClientExplanation),
  };
}

function normalizeTasks(value) {
  if (!Array.isArray(value)) return [];
  return value.map((task, index) => ({
    id: task?.id || `task-${index + 1}`,
    name: task?.name || '',
    category: task?.category || 'Other',
    dueDate: task?.dueDate || '',
    status: task?.status || 'Not started',
    notes: task?.notes || '',
  }));
}
