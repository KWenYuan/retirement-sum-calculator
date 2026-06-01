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
  currency: 'SGD',
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
  'disabilityIncome',
  'deathAccidentBenefit',
  'tpdAccidentBenefit',
  'medicalReimbursementAccident',
  'hospitalIncome',
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

export const benefitCoverageDefinitions = [
  { key: 'death', label: 'Death', amountField: 'deathBenefit', type: 'currency' },
  { key: 'tpd', label: 'TPD', amountField: 'tpdBenefit', type: 'currency' },
  { key: 'eci', label: 'ECI', amountField: 'eciBenefit', type: 'currency' },
  { key: 'ci', label: 'CI', amountField: 'ciBenefit', type: 'currency' },
  { key: 'hospitalisation', label: 'Hospitalisation', amountField: 'hospitalisation', type: 'text' },
  { key: 'disabilityIncome', label: 'Disability income', amountField: 'disabilityIncome', type: 'currency' },
  { key: 'deathAccident', label: 'Death (Accident)', amountField: 'deathAccidentBenefit', type: 'currency' },
  { key: 'tpdAccident', label: 'TPD (Accident)', amountField: 'tpdAccidentBenefit', type: 'currency' },
  { key: 'medicalReimbursementAccident', label: 'Medical Reimbursement (Accident)', amountField: 'medicalReimbursementAccident', type: 'currency' },
  { key: 'hospitalIncome', label: 'Hospital Income', amountField: 'hospitalIncome', type: 'currency' },
];

export const defaultBenefitCoveragePeriods = benefitCoverageDefinitions.reduce((items, definition) => ({
  ...items,
  [definition.key]: { amount: '', startAge: '', endAge: '' },
}), {});

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
  disabilityIncome: 0,
  deathAccidentBenefit: 0,
  tpdAccidentBenefit: 0,
  medicalReimbursementAccident: 0,
  hospitalIncome: 0,
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
  includeCashValueInRetirement: false,
  surrenderValue: 0,
  investmentValue: 0,
  maturityValue: 0,
  waiverRider: '',
  beneficiaryStatus: '',
  assignmentStatus: '',
  notes: '',
  benefits: defaultBenefitCoveragePeriods,
  benefitCoveragePeriods: defaultBenefitCoveragePeriods,
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
  normalized.includeCashValueInRetirement = Boolean(source.includeCashValueInRetirement);

  normalized.currency = normalized.currency || 'SGD';
  normalized.premiumFrequency = normalizeOption(
    Object.prototype.hasOwnProperty.call(source, 'premiumFrequency') ? normalized.premiumFrequency : 'Unknown',
    premiumFrequencyOptions,
    'Unknown',
  );
  normalized.premiumPayableType = normalizeOption(
    Object.prototype.hasOwnProperty.call(source, 'premiumPayableType') ? normalized.premiumPayableType : 'Unknown',
    premiumPayableTypeOptions,
    'Unknown',
  );
  normalized.coverageType = normalizeOption(
    Object.prototype.hasOwnProperty.call(source, 'coverageType') ? normalized.coverageType : 'Unknown',
    coverageTypeOptions,
    'Unknown',
  );
  normalized.policyStatus = normalizeOption(
    Object.prototype.hasOwnProperty.call(source, 'policyStatus') ? normalized.policyStatus : 'Unknown',
    policyStatusOptions,
    'Unknown',
  );
  normalized.coverageStatus = normalizeOption(
    Object.prototype.hasOwnProperty.call(source, 'coverageStatus') ? normalized.coverageStatus : 'Unknown',
    coverageStatusOptions,
    'Unknown',
  );
  normalized.payStatus = normalizeOption(
    Object.prototype.hasOwnProperty.call(source, 'payStatus') ? normalized.payStatus : 'Unknown',
    payStatusOptions,
    'Unknown',
  );
  normalized.benefits = normalizeBenefits(source.benefits, normalized, source.benefitCoveragePeriods);
  normalized.benefitCoveragePeriods = normalized.benefits;
  benefitCoverageDefinitions.forEach((definition) => {
    if (definition.type === 'text') {
      normalized[definition.amountField] = toSafeText(normalized.benefits[definition.key]?.amount);
    } else {
      normalized[definition.amountField] = toNumber(normalized.benefits[definition.key]?.amount);
    }
  });

  ['premiumFrequency', 'premiumPayableType', 'coverageType', 'policyStatus', 'coverageStatus', 'payStatus'].forEach((field) => {
    if (source[field] && normalized[field] === 'Unknown' && source[field] !== 'Unknown') cleanedFields.push(field);
  });

  return { policy: normalized, cleanedFields };
}

export function getPolicyCashValueRetirementAssets(policies = []) {
  return policies
    .filter((policy) => Boolean(policy?.includeCashValueInRetirement) && toNumber(policy?.cashValue) > 0)
    .map((policy) => ({
      id: policy.id,
      planName: policy.planName || 'Policy',
      company: policy.company || '',
      cashValue: toNumber(policy.cashValue),
      currency: getPolicyCurrency(policy),
      label: `Policy Cash Value - ${policy.planName || 'Policy'}`,
    }));
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

export function formatPolicyTimelinePremium(policy) {
  const amount = toNumber(policy?.premiumAmount);
  const currency = policy?.currency || 'SGD';
  switch (policy?.premiumFrequency) {
    case 'Monthly':
      return `${formatPolicyCurrencyWithLabel(amount, currency)}/mo`;
    case 'Quarterly':
      return `${formatPolicyCurrencyWithLabel(amount, currency)}/quarter`;
    case 'Semi-Annual':
      return `${formatPolicyCurrencyWithLabel(amount, currency)}/half-year`;
    case 'Annual':
      return `${formatPolicyCurrencyWithLabel(amount, currency)}/yr`;
    case 'Single Premium':
      return `Single premium: ${formatPolicyCurrencyWithLabel(amount, currency)}`;
    default:
      return 'Premium unknown';
  }
}

export function getPolicyTablePremiumValues(policy) {
  const amount = toNumber(policy?.premiumAmount);
  const currency = policy?.currency || 'SGD';
  if (policy?.premiumFrequency === 'Monthly') {
    return {
      monthlyDisplay: formatPolicyCurrencyWithLabel(amount, currency),
      annualDisplay: '-',
    };
  }
  if (policy?.premiumFrequency === 'Annual') {
    return {
      monthlyDisplay: '-',
      annualDisplay: formatPolicyCurrencyWithLabel(amount, currency),
    };
  }
  return {
    monthlyDisplay: '-',
    annualDisplay: '-',
  };
}

export function calculatePolicyTablePremiumTotalsByCurrency(policies = []) {
  return policies.reduce((items, policy) => {
    const currency = getPolicyCurrency(policy);
    const amount = toNumber(policy?.premiumAmount);
    if (!items[currency]) {
      items[currency] = { monthlyPremium: 0, annualPremium: 0 };
    }
    if (policy?.premiumFrequency === 'Monthly') {
      items[currency].monthlyPremium += amount;
    }
    if (policy?.premiumFrequency === 'Annual') {
      items[currency].annualPremium += amount;
    }
    return items;
  }, {});
}

export function calculatePolicySummary(policies = [], benchmark = defaultPolicyBenchmark) {
  const totalsByCurrency = {};
  const ensureCurrencyTotals = (currency) => {
    if (!totalsByCurrency[currency]) {
      totalsByCurrency[currency] = {
        monthlyPremium: 0,
        annualPremium: 0,
        singlePremium: 0,
        death: 0,
        tpd: 0,
        eci: 0,
        ci: 0,
        disabilityIncome: 0,
        deathAccident: 0,
        tpdAccident: 0,
        medicalReimbursementAccident: 0,
        hospitalIncome: 0,
      };
    }
    return totalsByCurrency[currency];
  };

  const totals = policies.reduce((items, policy) => {
    const currency = getPolicyCurrency(policy);
    const premium = calculatePolicyPremium(policy);
    const currencyTotals = ensureCurrencyTotals(currency);
    currencyTotals.monthlyPremium += premium.monthly;
    currencyTotals.annualPremium += premium.annual;
    currencyTotals.singlePremium += premium.single;
    currencyTotals.death += getBenefitAmountNumber(policy, 'death');
    currencyTotals.tpd += getBenefitAmountNumber(policy, 'tpd');
    currencyTotals.eci += getBenefitAmountNumber(policy, 'eci');
    currencyTotals.ci += getBenefitAmountNumber(policy, 'ci');
    currencyTotals.disabilityIncome += getBenefitAmountNumber(policy, 'disabilityIncome');
    currencyTotals.deathAccident += getBenefitAmountNumber(policy, 'deathAccident');
    currencyTotals.tpdAccident += getBenefitAmountNumber(policy, 'tpdAccident');
    currencyTotals.medicalReimbursementAccident += getBenefitAmountNumber(policy, 'medicalReimbursementAccident');
    currencyTotals.hospitalIncome += getBenefitAmountNumber(policy, 'hospitalIncome');

    return {
      monthlyPremium: items.monthlyPremium + premium.monthly,
      annualPremium: items.annualPremium + premium.annual,
      singlePremium: items.singlePremium + premium.single,
      death: items.death + getBenefitAmountNumber(policy, 'death'),
      tpd: items.tpd + getBenefitAmountNumber(policy, 'tpd'),
      eci: items.eci + getBenefitAmountNumber(policy, 'eci'),
      ci: items.ci + getBenefitAmountNumber(policy, 'ci'),
      disabilityIncome: items.disabilityIncome + getBenefitAmountNumber(policy, 'disabilityIncome'),
      deathAccident: items.deathAccident + getBenefitAmountNumber(policy, 'deathAccident'),
      tpdAccident: items.tpdAccident + getBenefitAmountNumber(policy, 'tpdAccident'),
      medicalReimbursementAccident: items.medicalReimbursementAccident + getBenefitAmountNumber(policy, 'medicalReimbursementAccident'),
      hospitalIncome: items.hospitalIncome + getBenefitAmountNumber(policy, 'hospitalIncome'),
    };
  }, {
    monthlyPremium: 0,
    annualPremium: 0,
    singlePremium: 0,
    death: 0,
    tpd: 0,
    eci: 0,
    ci: 0,
    disabilityIncome: 0,
    deathAccident: 0,
    tpdAccident: 0,
    medicalReimbursementAccident: 0,
    hospitalIncome: 0,
  });

  const hospitalPlans = policies
    .map((policy) => toSafeText(getBenefitAmount(policy, 'hospitalisation')))
    .filter(Boolean);
  const hospitalisationSummary = hospitalPlans.length > 0
    ? hospitalPlans.join(', ')
    : 'No hospitalisation plan entered';
  const recommendedDeath = toNumber(benchmark.annualIncome) * toNumber(benchmark.deathMultiplier);
  const recommendedCi = toNumber(benchmark.annualIncome) * toNumber(benchmark.ciMultiplier);
  const benchmarkCurrency = normalizeCurrencyLabel(benchmark.currency || 'SGD');
  const currencies = Object.keys(totalsByCurrency);
  const gapsByCurrency = currencies.reduce((items, currency) => {
    const current = totalsByCurrency[currency];
    const hasBenchmark = currency === benchmarkCurrency;
    return {
      ...items,
      [currency]: {
        hasBenchmark,
        recommendedDeath: hasBenchmark ? recommendedDeath : null,
        recommendedCi: hasBenchmark ? recommendedCi : null,
        currentDeath: current.death,
        currentCi: current.ci,
        deathGap: hasBenchmark ? current.death - recommendedDeath : null,
        ciGap: hasBenchmark ? current.ci - recommendedCi : null,
      },
    };
  }, {});

  return {
    totals,
    totalsByCurrency,
    currencies,
    benchmarkCurrency,
    gapsByCurrency,
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
  const duration = toOptionalNumber(policy?.premiumPayableDuration);
  if (type === 'Single premium') return hasValidAge(start) ? { label: `Single premium at age ${start}`, startAge: start, endAge: start, hasBar: true, isPoint: true } : { label: 'Single premium', startAge: '', endAge: '', hasBar: false };
  if (type === 'Fully paid') {
    if (hasValidAge(start) && hasValidAge(end)) return { label: `Age ${start}-${end}`, startAge: start, endAge: end, hasBar: true };
    if (hasValidAge(end)) return { label: `Paid up at age ${end}`, startAge: end, endAge: end, hasBar: true, isPoint: true };
    return { label: 'Fully paid', startAge: '', endAge: '', hasBar: false };
  }
  if (type === 'Whole life / ongoing') return hasValidAge(start) ? { label: `Age ${start}-Lifetime`, startAge: start, endAge: 99, hasBar: true, isLifetime: true } : unknownPremiumPeriod();
  if (type === 'Unknown') return unknownPremiumPeriod();
  if (type === 'Fixed term' && hasValidAge(start) && hasValidAge(duration)) {
    const durationEnd = start + duration;
    return { label: `Age ${start}-${durationEnd}`, startAge: start, endAge: durationEnd, hasBar: true };
  }
  if (type === 'To age' && hasValidAge(start) && hasValidAge(end)) return { label: `Age ${start}-${end}`, startAge: start, endAge: end, hasBar: true };
  if (hasValidAge(start) && hasValidAge(end)) return { label: `Age ${start}-${end}`, startAge: start, endAge: end, hasBar: true };
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

export function getBenefitCoverageDifferences(policy) {
  const mainCoverage = getCoveragePeriod(policy);
  if (!mainCoverage.hasBar || !hasValidAge(mainCoverage.startAge) || !hasValidAge(mainCoverage.endAge)) return [];
  return benefitCoverageDefinitions
    .map((definition) => {
      const period = getBenefitCoveragePeriod(policy, definition, mainCoverage);
      return period;
    })
    .filter(Boolean)
    .filter((period) => period.differsFromMain);
}

export function getBenefitCoverageDetails(policy) {
  const mainCoverage = getCoveragePeriod(policy);
  return benefitCoverageDefinitions
    .filter((definition) => hasBenefitValue(policy, definition))
    .map((definition) => getBenefitCoveragePeriod(policy, definition, mainCoverage) || {
      key: definition.key,
      label: definition.label,
      amountDisplay: formatBenefitAmount(policy, definition),
      periodLabel: mainCoverage.hasBar ? 'Uses main coverage period' : 'Coverage period unknown',
      hasBar: false,
      differsFromMain: false,
    });
}

export function getBenefitAmount(policy, benefitKey) {
  const definition = benefitCoverageDefinitions.find((benefit) => benefit.key === benefitKey);
  if (!definition) return '';
  const periodAmount = policy?.benefits?.[benefitKey]?.amount ?? policy?.benefitCoveragePeriods?.[benefitKey]?.amount;
  if (periodAmount !== '' && periodAmount !== null && typeof periodAmount !== 'undefined') return periodAmount;
  return policy?.[definition.amountField] ?? '';
}

export function getBenefitAmountDisplay(policy, benefitKey) {
  const definition = benefitCoverageDefinitions.find((benefit) => benefit.key === benefitKey);
  if (!definition) return '-';
  return formatBenefitAmount(policy, definition);
}

export function formatDisplayDate(value) {
  const text = toSafeText(value).trim();
  if (!text) return '-';
  const parsed = parseDisplayDate(text);
  if (!parsed) return '-';
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = parsed.toLocaleString('en-SG', { month: 'short' });
  const year = parsed.getFullYear();
  return `${day}-${month}-${year}`;
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

export function getPolicyCurrency(policy) {
  return normalizeCurrencyLabel(policy?.currency || 'SGD');
}

export function normalizeCurrencyLabel(currency) {
  const text = toSafeText(currency).trim().toUpperCase();
  const aliases = {
    RM: 'MYR',
    RMB: 'CNY',
    S$: 'SGD',
  };
  return aliases[text] || text || 'SGD';
}

export function formatCurrencyTotals(totalsByCurrency = {}, key, options = {}) {
  const suffix = options.suffix || '';
  return Object.entries(totalsByCurrency)
    .filter(([, totals]) => Math.abs(toNumber(totals?.[key])) > 0 || options.includeZero)
    .map(([currency, totals]) => `${formatPolicyCurrencyWithLabel(totals?.[key] || 0, currency)}${suffix}`);
}

export function formatPolicyCurrencyWithLabel(value, currency = 'SGD') {
  const currencyLabel = normalizeCurrencyLabel(currency);
  const formatted = formatPolicyCurrency(value, currencyLabel);
  return formatted.toUpperCase().startsWith(currencyLabel)
    ? formatted
    : `${currencyLabel} ${formatted}`;
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

function normalizeBenefits(periods = {}, policy = {}, legacyPeriods = {}) {
  const source = isPlainObject(periods) ? periods : {};
  const legacySource = isPlainObject(legacyPeriods) ? legacyPeriods : {};
  return benefitCoverageDefinitions.reduce((items, definition) => {
    const period = isPlainObject(source[definition.key]) ? source[definition.key] : {};
    const legacyPeriod = isPlainObject(legacySource[definition.key]) ? legacySource[definition.key] : {};
    const periodAmount = period.amount ?? period.value;
    const legacyAmount = legacyPeriod.amount ?? legacyPeriod.value;
    const sourceAmount = periodAmount !== '' && periodAmount !== null && typeof periodAmount !== 'undefined'
      ? periodAmount
      : legacyAmount !== '' && legacyAmount !== null && typeof legacyAmount !== 'undefined'
        ? legacyAmount
        : policy[definition.amountField];
    const startAge = toOptionalNumber(period.startAge) !== '' ? toOptionalNumber(period.startAge) : toOptionalNumber(legacyPeriod.startAge);
    const endAge = toOptionalNumber(period.endAge) !== '' ? toOptionalNumber(period.endAge) : toOptionalNumber(legacyPeriod.endAge);
    return {
      ...items,
      [definition.key]: {
        amount: normalizeBenefitAmount(sourceAmount, definition),
        startAge,
        endAge,
      },
    };
  }, {});
}

function getBenefitCoveragePeriod(policy, definition, mainCoverage) {
  if (!hasBenefitValue(policy, definition)) return null;
  const rawPeriod = policy?.benefits?.[definition.key] || policy?.benefitCoveragePeriods?.[definition.key] || {};
  const startAge = toOptionalNumber(rawPeriod.startAge);
  const endAge = toOptionalNumber(rawPeriod.endAge);
  const hasSpecificPeriod = hasValidAge(startAge) && hasValidAge(endAge);
  const effectiveStartAge = hasSpecificPeriod ? startAge : mainCoverage.startAge;
  const effectiveEndAge = hasSpecificPeriod ? endAge : mainCoverage.endAge;
  const hasBar = hasValidAge(effectiveStartAge) && hasValidAge(effectiveEndAge);
  const differsFromMain = hasSpecificPeriod && hasBar && (
    effectiveStartAge !== mainCoverage.startAge || effectiveEndAge !== mainCoverage.endAge
  );
  return {
    key: definition.key,
    label: definition.label,
    amountDisplay: formatBenefitAmount(policy, definition),
    startAge: effectiveStartAge,
    endAge: effectiveEndAge,
    hasBar,
    differsFromMain,
    periodLabel: hasSpecificPeriod ? `Age ${startAge}-${endAge}` : 'Uses main coverage period',
  };
}

function hasBenefitValue(policy, definition) {
  const amount = getBenefitAmount(policy, definition.key);
  if (definition.type === 'text') return Boolean(toSafeText(amount).trim());
  return toNumber(amount) > 0;
}

function formatBenefitAmount(policy, definition) {
  const amount = getBenefitAmount(policy, definition.key);
  if (definition.type === 'text') return toSafeText(amount).trim() || '-';
  return formatPolicyCurrency(amount, policy?.currency);
}

function getBenefitAmountNumber(policy, benefitKey) {
  return toNumber(getBenefitAmount(policy, benefitKey));
}

function normalizeBenefitAmount(value, definition) {
  if (definition.type === 'text') return toSafeText(value);
  if (value === '' || value === null || typeof value === 'undefined') return '';
  const parsed = parseFiniteNumber(value);
  return typeof parsed === 'number' ? parsed : '';
}

function parseDisplayDate(text) {
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) return buildDate(isoMatch[1], isoMatch[2], isoMatch[3]);
  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) return buildDate(slashMatch[3], slashMatch[2], slashMatch[1]);
  const dashMatch = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) return buildDate(dashMatch[3], dashMatch[2], dashMatch[1]);
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildDate(year, month, day) {
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return null;
  }
  return parsed;
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
