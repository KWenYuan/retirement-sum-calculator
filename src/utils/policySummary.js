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

export const createPolicySummaryPolicy = (overrides = {}) => ({
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

export function calculatePolicyPremium(policy) {
  const amount = asNumber(policy.premiumAmount);
  const frequency = policy.premiumFrequency || 'Monthly';
  if (frequency === 'Single Premium') {
    return { monthly: 0, annual: 0, single: amount };
  }
  const annualMultipliers = {
    Monthly: 12,
    Quarterly: 4,
    'Semi-Annual': 2,
    Annual: 1,
  };
  const annual = amount * (annualMultipliers[frequency] || 12);
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
      death: items.death + asNumber(policy.deathBenefit),
      tpd: items.tpd + asNumber(policy.tpdBenefit),
      eci: items.eci + asNumber(policy.eciBenefit),
      ci: items.ci + asNumber(policy.ciBenefit),
      accident: items.accident + asNumber(policy.personalAccident),
      disabilityIncome: items.disabilityIncome + asNumber(policy.disabilityIncome),
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
    .map((policy) => policy.hospitalisation)
    .filter(Boolean);
  const hospitalisationSummary = hospitalPlans.length > 0
    ? hospitalPlans.join(', ')
    : 'No hospitalisation plan entered';
  const recommendedDeath = asNumber(benchmark.annualIncome) * asNumber(benchmark.deathMultiplier);
  const recommendedCi = asNumber(benchmark.annualIncome) * asNumber(benchmark.ciMultiplier);

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
  const type = policy.premiumPayableType || 'Fixed term';
  const start = asNumber(policy.premiumPayableStartAge || policy.ageInception);
  const end = asNumber(policy.premiumPayableEndAge);
  if (type === 'Single premium') return { label: start ? `Single premium at age ${start}` : 'Single premium', startAge: start, endAge: start, hasBar: Boolean(start) };
  if (type === 'Fully paid') return { label: end ? `Fully paid after age ${end}` : 'Fully paid', startAge: start, endAge: end || start, hasBar: Boolean(start && end) };
  if (type === 'Whole life / ongoing') return { label: start ? `Age ${start}-Lifetime` : 'Ongoing', startAge: start, endAge: 99, hasBar: Boolean(start), isLifetime: true };
  if (type === 'Unknown') return { label: 'Unknown', startAge: 0, endAge: 0, hasBar: false };
  if (start && end) return { label: `Age ${start}-${end}`, startAge: start, endAge: end, hasBar: true };
  if (start && policy.premiumPayableDuration) {
    const durationEnd = start + asNumber(policy.premiumPayableDuration);
    return { label: `Age ${start}-${durationEnd}`, startAge: start, endAge: durationEnd, hasBar: true };
  }
  return { label: '-', startAge: 0, endAge: 0, hasBar: false };
}

export function getCoveragePeriod(policy) {
  const type = policy.coverageType || 'Fixed term';
  const start = asNumber(policy.coverageStartAge || policy.ageInception);
  const end = asNumber(policy.coverageEndAge);
  if (type === 'Whole life / lifetime') return { label: start ? `Age ${start}-Lifetime` : 'Lifetime', startAge: start, endAge: 99, hasBar: Boolean(start), isLifetime: true };
  if (type === 'Yearly renewable') return { label: start ? `Age ${start}-Review yearly` : 'Review yearly', startAge: start, endAge: 99, hasBar: Boolean(start), isLifetime: true };
  if (type === 'Unknown') return { label: 'Unknown', startAge: 0, endAge: 0, hasBar: false };
  if (start && end) return { label: `Age ${start}-${end}`, startAge: start, endAge: end, hasBar: true };
  if (start && policy.coverageDuration) {
    const durationEnd = start + asNumber(policy.coverageDuration);
    return { label: `Age ${start}-${durationEnd}`, startAge: start, endAge: durationEnd, hasBar: true };
  }
  return { label: '-', startAge: 0, endAge: 0, hasBar: false };
}

export function buildPolicySummaryPayload(data) {
  return {
    appName: POLICY_SUMMARY_APP_NAME,
    module: POLICY_SUMMARY_MODULE,
    schemaVersion: POLICY_SUMMARY_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      clientDetails: data.client,
      policySummaryPolicies: data.policies,
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
  return Boolean(
    payload &&
    payload.appName === POLICY_SUMMARY_APP_NAME &&
    (!payload.module || payload.module === POLICY_SUMMARY_MODULE) &&
    payload.schemaVersion &&
    payload.data
  );
}

export function restorePolicySummaryData(data = {}) {
  const clientData = data.clientDetails || data.client || {};
  const policyData = data.policySummaryPolicies || data.policies;
  const benchmarkData = data.benchmarkAssumptions || data.benchmark || {};
  return {
    client: { ...defaultPolicySummaryClient, ...clientData },
    policies: Array.isArray(policyData)
      ? policyData.map((policy) => createPolicySummaryPolicy(policy))
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
      })],
    benchmark: { ...defaultPolicyBenchmark, ...benchmarkData },
    notes: typeof data.notes === 'string' ? data.notes : defaultPolicySummaryNotes,
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
  if (!validatePolicySummaryPayload(payload)) {
    throw new Error('Invalid policy summary data file. Please upload a valid Policy Summary JSON file.');
  }
  return restorePolicySummaryData(payload.data);
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
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: currency || 'SGD',
    maximumFractionDigits: 0,
  }).format(asNumber(value));
}

export function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildPolicySummaryDataFilename(clientName, date) {
  const cleanName = (clientName || '')
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return `${cleanName ? `${cleanName}-` : ''}Policy-Summary-Data-${date}.json`;
}
