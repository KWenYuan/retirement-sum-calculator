export const POLICY_SUMMARY_APP_NAME = 'Retirement Projection Studio';
export const POLICY_SUMMARY_MODULE = 'Policy Summary';
export const POLICY_SUMMARY_SCHEMA_VERSION = 1;
export const POLICY_SUMMARY_STORAGE_KEY = 'retirement-policy-summary-data';

export const defaultPolicySummaryClient = {
  clientName: 'Client Name',
  dateOfBirth: '',
  age: '',
  reviewDate: new Date().toLocaleDateString('en-CA'),
  advisorName: 'Koh Wen Yuan',
};

export const defaultPolicyBenchmark = {
  annualIncome: 120000,
  deathMultiplier: 10,
  ciMultiplier: 5,
};

export const defaultPolicySummaryNotes = 'This summary is prepared based on available policy information and should be checked against official insurer documents.';

const textFields = [
  'company',
  'policyNumber',
  'typeOfPlan',
  'planName',
  'policyStatus',
  'startDate',
  'currency',
  'owner',
  'lifeAssured',
  'premiumFrequency',
  'premiumPayableType',
  'paymentTerm',
  'payStatus',
  'hospitalisation',
  'otherBenefits',
  'coverageType',
  'coverageStatus',
  'remarks',
  'maturityDate',
  'waiverRider',
  'beneficiaryStatus',
  'assignmentStatus',
  'notes',
];

const numberFields = [
  'premiumAmount',
  'deathBenefit',
  'tpdBenefit',
  'eciBenefit',
  'ciBenefit',
  'personalAccident',
  'disabilityIncome',
  'cashValue',
  'surrenderValue',
  'investmentValue',
  'maturityValue',
];

const ageFields = [
  'ageInception',
  'premiumPayableStartAge',
  'premiumPayableEndAge',
  'premiumPayableDuration',
  'coverageStartAge',
  'coverageEndAge',
  'coverageDuration',
  'maturityAge',
];

const premiumFrequencyOptions = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Single Premium', 'Unknown'];
const premiumPayableTypeOptions = ['Fixed term', 'To age', 'Whole life / ongoing', 'Single premium', 'Fully paid', 'Unknown'];
const coverageTypeOptions = ['Fixed term', 'To age', 'Whole life / lifetime', 'Yearly renewable', 'To maturity', 'Unknown'];
const policyStatusOptions = ['In-force', 'Lapsed', 'Matured', 'Cancelled', 'Pending', 'Paid-up', 'Unknown'];
const coverageStatusOptions = ['Active', 'Ended', 'Pending', 'Unknown'];
const payStatusOptions = ['Paying', 'Fully paid', 'Waived', 'Lapsed', 'In-force', 'Unknown'];

const createBasePolicySummaryPolicy = (overrides = {}) => ({
  id: crypto.randomUUID(),
  company: '',
  policyNumber: '',
  typeOfPlan: '',
  planName: 'New Policy',
  policyStatus: 'In-force',
  startDate: '',
  ageInception: '',
  currency: 'SGD',
  owner: 'Client',
  lifeAssured: 'Client',
  premiumAmount: 0,
  premiumFrequency: 'Monthly',
  premiumPayableStartAge: '',
  premiumPayableEndAge: '',
  premiumPayableDuration: '',
  premiumPayableType: 'Fixed term',
  paymentTerm: '',
  payStatus: 'Paying',
  deathBenefit: 0,
  tpdBenefit: 0,
  eciBenefit: 0,
  ciBenefit: 0,
  hospitalisation: '',
  personalAccident: 0,
  disabilityIncome: 0,
  otherBenefits: '',
  coverageStartAge: '',
  coverageEndAge: '',
  coverageDuration: '',
  coverageType: 'Fixed term',
  coverageStatus: 'Active',
  remarks: '',
  maturityDate: '',
  maturityAge: '',
  cashValue: 0,
  surrenderValue: 0,
  investmentValue: 0,
  maturityValue: 0,
  waiverRider: '',
  beneficiaryStatus: '',
  assignmentStatus: '',
  notes: '',
  ...overrides,
});

export const createPolicySummaryPolicy = (overrides = {}) => (
  normalizePolicySummaryPolicy(createBasePolicySummaryPolicy(overrides))
);

export function normalizePolicySummaryPolicy(policy = {}, index = 0) {
  return normalizePolicySummaryPolicyWithReport(policy, index).policy;
}

function normalizePolicySummaryPolicyWithReport(policy = {}, index = 0) {
  const source = isPlainObject(policy) ? policy : {};
  const defaults = createBasePolicySummaryPolicy({ id: `policy-summary-${index + 1}` });
  const normalized = { ...defaults };
  const cleanedFields = [];

  if (!isPlainObject(policy)) cleanedFields.push('policy');

  normalized.id = toSafeText(source.id) || defaults.id;
  if (!source.id) cleanedFields.push('id');

  [...textFields, ...numberFields, ...ageFields].forEach((field) => {
    if (!(field in source)) cleanedFields.push(field);
  });

  textFields.forEach((field) => {
    normalized[field] = toSafeText(source[field] ?? defaults[field]);
  });
  numberFields.forEach((field) => {
    normalized[field] = toNumber(source[field]);
  });
  ageFields.forEach((field) => {
    const normalizedAge = toOptionalNumber(source[field]);
    if (source[field] !== '' && source[field] !== null && typeof source[field] !== 'undefined' && normalizedAge === '') {
      cleanedFields.push(field);
    }
    normalized[field] = normalizedAge;
  });

  normalized.currency = normalized.currency || 'SGD';
  normalized.premiumFrequency = normalizeOption(
    normalized.premiumFrequency,
    premiumFrequencyOptions,
    'Unknown',
  );
  normalized.premiumPayableType = normalizeOption(
    normalized.premiumPayableType,
    premiumPayableTypeOptions,
    'Unknown',
  );
  normalized.coverageType = normalizeOption(
    normalized.coverageType,
    coverageTypeOptions,
    'Unknown',
  );
  normalized.policyStatus = normalizeOption(
    normalized.policyStatus,
    policyStatusOptions,
    'Unknown',
  );
  normalized.coverageStatus = normalizeOption(
    normalized.coverageStatus,
    coverageStatusOptions,
    'Unknown',
  );
  normalized.payStatus = normalizeOption(
    normalized.payStatus,
    payStatusOptions,
    'Unknown',
  );

  ['premiumFrequency', 'premiumPayableType', 'coverageType', 'policyStatus', 'coverageStatus', 'payStatus'].forEach((field) => {
    if (source[field] && normalized[field] === 'Unknown' && source[field] !== 'Unknown') cleanedFields.push(field);
  });

  return { policy: normalized, cleanedFields };
}

export function calculatePolicyPremium(policy) {
  const amount = toNumber(policy?.premiumAmount);
  const frequency = policy?.premiumFrequency || 'Unknown';
  if (frequency === 'Single Premium') {
    return { monthly: 0, annual: 0, single: amount };
  }
  const annualMultipliers = {
    Monthly: 12,
    Quarterly: 4,
    'Semi-Annual': 2,
    Annual: 1,
  };
  const annual = amount * (annualMultipliers[frequency] || 0);
  return {
    monthly: annual / 12,
    annual,
    single: 0,
  };
}

export function calculatePolicySummary(policies = [], benchmark = defaultPolicyBenchmark) {
  const totals = policies.reduce((items, policy) => {
    const premium = calculatePolicyPremium(policy);
    return {
      monthlyPremium: items.monthlyPremium + premium.monthly,
      annualPremium: items.annualPremium + premium.annual,
      singlePremium: items.singlePremium + premium.single,
      death: items.death + toNumber(policy?.deathBenefit),
      tpd: items.tpd + toNumber(policy?.tpdBenefit),
      eci: items.eci + toNumber(policy?.eciBenefit),
      ci: items.ci + toNumber(policy?.ciBenefit),
      accident: items.accident + toNumber(policy?.personalAccident),
      disabilityIncome: items.disabilityIncome + toNumber(policy?.disabilityIncome),
    };
  }, {
    monthlyPremium: 0,
    annualPremium: 0,
    singlePremium: 0,
    death: 0,
    tpd: 0,
    eci: 0,
    ci: 0,
    accident: 0,
    disabilityIncome: 0,
  });

  const hospitalPlans = policies
    .map((policy) => toSafeText(policy?.hospitalisation))
    .filter(Boolean);
  const hospitalisationSummary = hospitalPlans.length > 0
    ? hospitalPlans.join(', ')
    : 'No hospitalisation plan entered';
  const recommendedDeath = toNumber(benchmark.annualIncome) * toNumber(benchmark.deathMultiplier);
  const recommendedCi = toNumber(benchmark.annualIncome) * toNumber(benchmark.ciMultiplier);

  return {
    totals,
    hospitalisationSummary,
    hasHospitalisation: hospitalPlans.length > 0,
    recommendedDeath,
    recommendedCi,
    deathGap: totals.death - recommendedDeath,
    ciGap: totals.ci - recommendedCi,
  };
}

export function getPremiumPeriod(policy) {
  const type = policy?.premiumPayableType || 'Unknown';
  const start = toOptionalNumber(policy?.premiumPayableStartAge || policy?.ageInception);
  const end = toOptionalNumber(policy?.premiumPayableEndAge);
  if (type === 'Single premium') return hasValidAge(start) ? { label: `Single premium at age ${start}`, startAge: start, endAge: start, hasBar: true } : unknownPremiumPeriod();
  if (type === 'Fully paid') return hasValidAge(start) && hasValidAge(end) ? { label: `Fully paid after age ${end}`, startAge: start, endAge: end, hasBar: true } : unknownPremiumPeriod();
  if (type === 'Whole life / ongoing') return hasValidAge(start) ? { label: `Age ${start}-Lifetime`, startAge: start, endAge: 99, hasBar: true, isLifetime: true } : unknownPremiumPeriod();
  if (type === 'Unknown') return unknownPremiumPeriod();
  if (hasValidAge(start) && hasValidAge(end)) return { label: `Age ${start}-${end}`, startAge: start, endAge: end, hasBar: true };
  if (hasValidAge(start) && toOptionalNumber(policy.premiumPayableDuration) !== '') {
    const durationEnd = start + toNumber(policy.premiumPayableDuration);
    return { label: `Age ${start}-${durationEnd}`, startAge: start, endAge: durationEnd, hasBar: true };
  }
  return unknownPremiumPeriod();
}

export function getCoveragePeriod(policy) {
  const type = policy?.coverageType || 'Unknown';
  const start = toOptionalNumber(policy?.coverageStartAge || policy?.ageInception);
  const end = toOptionalNumber(policy?.coverageEndAge);
  if (type === 'Whole life / lifetime') return hasValidAge(start) ? { label: `Age ${start}-Lifetime`, startAge: start, endAge: 99, hasBar: true, isLifetime: true } : unknownCoveragePeriod();
  if (type === 'Yearly renewable') return hasValidAge(start) ? { label: `Age ${start}-Review yearly`, startAge: start, endAge: 99, hasBar: true, isLifetime: true } : unknownCoveragePeriod();
  if (type === 'To maturity') return hasValidAge(start) && hasValidAge(end) ? { label: `Age ${start}-${end}`, startAge: start, endAge: end, hasBar: true } : unknownCoveragePeriod();
  if (type === 'Unknown') return unknownCoveragePeriod();
  if (hasValidAge(start) && hasValidAge(end)) return { label: `Age ${start}-${end}`, startAge: start, endAge: end, hasBar: true };
  if (hasValidAge(start) && toOptionalNumber(policy.coverageDuration) !== '') {
    const durationEnd = start + toNumber(policy.coverageDuration);
    return { label: `Age ${start}-${durationEnd}`, startAge: start, endAge: durationEnd, hasBar: true };
  }
  return unknownCoveragePeriod();
}

export function buildPolicySummaryPayload(data) {
  return {
    appName: POLICY_SUMMARY_APP_NAME,
    module: POLICY_SUMMARY_MODULE,
    schemaVersion: POLICY_SUMMARY_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      clientDetails: data.client,
      policySummaryPolicies: (data.policies || []).map((policy, index) => normalizePolicySummaryPolicy(policy, index)),
      benchmarkAssumptions: data.benchmark,
      notes: data.notes,
      reviewDate: data.client?.reviewDate,
      policyTimelineSettings: {
        premiumBar: 'Premium Payable',
        coverageBar: 'Coverage Period',
      },
    },
  };
}

export function validatePolicySummaryPayload(payload) {
  const validAppNames = [POLICY_SUMMARY_APP_NAME, `${POLICY_SUMMARY_APP_NAME} ${POLICY_SUMMARY_MODULE}`];
  return Boolean(
    payload &&
    validAppNames.includes(payload.appName) &&
    (!payload.module || payload.module === POLICY_SUMMARY_MODULE) &&
    payload.schemaVersion &&
    payload.data
  );
}

export function restorePolicySummaryData(data = {}) {
  const clientData = data.clientDetails || data.client || {};
  const policyData = data.policySummaryPolicies || data.policies;
  const benchmarkData = data.benchmarkAssumptions || data.benchmark || {};
  const importReport = { policyCount: 0, cleanedPolicies: 0 };
  const policies = Array.isArray(policyData)
    ? policyData.map((policy, index) => {
      const normalized = normalizePolicySummaryPolicyWithReport(policy, index);
      if (normalized.cleanedFields.length > 0) importReport.cleanedPolicies += 1;
      return normalized.policy;
    })
    : [createPolicySummaryPolicy({
      company: 'AIA',
      typeOfPlan: 'Investment-linked',
      planName: 'AIA Pro Achiever III',
      premiumAmount: 400,
      premiumFrequency: 'Monthly',
      premiumPayableStartAge: 30,
      premiumPayableEndAge: 40,
      coverageStartAge: 30,
      coverageEndAge: 99,
      coverageType: 'Whole life / lifetime',
      deathBenefit: 100000,
      ciBenefit: 50000,
    })];
  importReport.policyCount = policies.length;
  return {
    client: { ...defaultPolicySummaryClient, ...clientData },
    policies,
    benchmark: { ...defaultPolicyBenchmark, ...benchmarkData },
    notes: typeof data.notes === 'string' ? data.notes : defaultPolicySummaryNotes,
    importReport,
  };
}

export function downloadPolicySummaryData(data, clientName, date) {
  const payload = buildPolicySummaryPayload(data);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = buildPolicySummaryDataFilename(clientName, date);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function importPolicySummaryData(file) {
  if (!file) return null;
  const isJson = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
  if (!isJson) throw new Error('Invalid policy summary data file. Please upload a valid JSON file.');
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    throw new Error('Invalid policy summary data file. Please upload a valid JSON file.');
  }
  const data = getPolicySummaryDataFromPayload(payload);
  if (!data) {
    throw new Error('Invalid policy summary data file. Please upload a valid Policy Summary JSON file.');
  }
  try {
    return restorePolicySummaryData(data);
  } catch (error) {
    console.error('Policy summary data normalization failed:', error);
    throw new Error('Policy Summary import failed. Some fields may be in an unsupported format.');
  }
}

export function savePolicySummaryToStorage(data) {
  try {
    localStorage.setItem(POLICY_SUMMARY_STORAGE_KEY, JSON.stringify(buildPolicySummaryPayload(data)));
  } catch {
    // Storage is optional.
  }
}

export function loadPolicySummaryFromStorage() {
  try {
    const raw = localStorage.getItem(POLICY_SUMMARY_STORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    return validatePolicySummaryPayload(payload) ? restorePolicySummaryData(payload.data) : null;
  } catch {
    return null;
  }
}

export function formatPolicyCurrency(value, currency = 'SGD') {
  const originalCurrency = toSafeText(currency).trim() || 'SGD';
  const safeCurrency = normalizeCurrency(originalCurrency);
  const amount = toNumber(value);
  if (!safeCurrency) {
    return `${originalCurrency} ${new Intl.NumberFormat('en-SG', { maximumFractionDigits: 0 }).format(amount)}`;
  }
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: safeCurrency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function asNumber(value) {
  return toNumber(value);
}

export function toNumber(value) {
  const parsed = parseFiniteNumber(value);
  return typeof parsed === 'number' ? parsed : 0;
}

function toOptionalNumber(value) {
  if (value === '' || value === null || typeof value === 'undefined') return '';
  const parsed = parseFiniteNumber(value);
  return typeof parsed === 'number' ? parsed : '';
}

function toSafeText(value) {
  if (value === null || typeof value === 'undefined') return '';
  return String(value);
}

function normalizeOption(value, options, fallback) {
  const text = toSafeText(value);
  return options.includes(text) ? text : fallback;
}

function normalizeCurrency(currency) {
  const text = toSafeText(currency).trim().toUpperCase();
  const aliases = {
    RM: 'MYR',
    RMB: 'CNY',
    S$: 'SGD',
  };
  const normalized = aliases[text] || text || 'SGD';
  try {
    new Intl.NumberFormat('en-SG', { style: 'currency', currency: normalized }).format(0);
    return normalized;
  } catch {
    return '';
  }
}

function hasValidAge(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function unknownPremiumPeriod() {
  return { label: 'Premium period unknown', startAge: '', endAge: '', hasBar: false };
}

function unknownCoveragePeriod() {
  return { label: 'Coverage period unknown', startAge: '', endAge: '', hasBar: false };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getPolicySummaryDataFromPayload(payload) {
  if (validatePolicySummaryPayload(payload)) return payload.data;
  if (Array.isArray(payload)) return { policySummaryPolicies: payload };
  if (!isPlainObject(payload)) return null;
  if (isPlainObject(payload.data) && (Array.isArray(payload.data.policySummaryPolicies) || Array.isArray(payload.data.policies))) return payload.data;
  if (Array.isArray(payload.policySummaryPolicies) || Array.isArray(payload.policies)) return payload;
  return null;
}

function parseFiniteNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').replace(/[^\d.-]/g, '');
    if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') return null;
    const parsedText = Number(cleaned);
    return Number.isFinite(parsedText) ? parsedText : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildPolicySummaryDataFilename(clientName, date) {
  const cleanName = (clientName || '')
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return `${cleanName ? `${cleanName}-` : ''}Policy-Summary-Data-${date}.json`;
}
