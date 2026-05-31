import {
  calculatePolicyPremium,
  formatPolicyCurrency,
  getCoveragePeriod,
  getPremiumPeriod,
} from '../utils/policySummary.js';

const disclaimer = 'This policy summary is prepared based on information provided and is for discussion purposes only. Please refer to the official policy contracts, benefit illustrations and insurer documents for exact benefits, exclusions, values, terms and conditions.';

const exportPolicyRows = [
  { label: 'Company', get: (policy) => textValue(policy.company) },
  { label: 'Policy No.', get: (policy) => textValue(policy.policyNumber) },
  { label: 'Type of Plan', get: (policy) => textValue(policy.typeOfPlan) },
  { label: 'Plan Name', get: (policy) => textValue(policy.planName) },
  { label: 'Policy Status', get: (policy) => textValue(policy.policyStatus) },
  { label: 'Pay Status', get: (policy) => textValue(policy.payStatus) },
  { label: 'Premium Frequency', get: (policy) => textValue(policy.premiumFrequency) },
  { label: 'Monthly Premium', get: (policy) => formatPolicyCurrency(calculatePolicyPremium(policy).monthly, policy.currency) },
  { label: 'Annual Premium', get: (policy) => formatPolicyCurrency(calculatePolicyPremium(policy).annual, policy.currency) },
  { label: 'Premium Payable Period', get: (policy) => getPremiumPeriod(policy).label },
  { label: 'Coverage Period', get: (policy) => getCoveragePeriod(policy).label },
  { label: 'Death', highlight: true, get: (policy) => formatPolicyCurrency(policy.deathBenefit, policy.currency) },
  { label: 'TPD', highlight: true, get: (policy) => formatPolicyCurrency(policy.tpdBenefit, policy.currency) },
  { label: 'ECI', highlight: true, get: (policy) => formatPolicyCurrency(policy.eciBenefit, policy.currency) },
  { label: 'CI', highlight: true, get: (policy) => formatPolicyCurrency(policy.ciBenefit, policy.currency) },
  { label: 'Hospitalisation', highlight: true, get: (policy) => textValue(policy.hospitalisation) },
  { label: 'Accident', highlight: true, get: (policy) => formatPolicyCurrency(policy.personalAccident, policy.currency) },
  { label: 'Disability Income', highlight: true, get: (policy) => formatPolicyCurrency(policy.disabilityIncome, policy.currency) },
  { label: 'Owner', get: (policy) => textValue(policy.owner) },
  { label: 'Life Assured', get: (policy) => textValue(policy.lifeAssured) },
  { label: 'Notes', get: (policy) => textValue(policy.notes || policy.remarks) },
];

export function PolicySummaryExportReport({
  refNode,
  client,
  policies,
  summary,
  benchmark,
  notes,
}) {
  const policyChunks = chunkPoliciesForPdf(policies, 4);
  const reviewDate = client.reviewDate || new Date().toLocaleDateString('en-CA');

  return (
    <section className="policy-export-report" ref={refNode}>
      <header className="policy-export-header pdf-avoid-break">
        <div>
          <p>Personal Wealth Planning for</p>
          <h1>{client.clientName || 'Client'}</h1>
          <span>Current as of {reviewDate}</span>
          <small>Advisor: {client.advisorName || '-'}</small>
        </div>
        <img src="/logo.png" alt="Advisor logo" />
      </header>

      <section className="policy-export-client pdf-avoid-break">
        <ExportPill label="Date of birth" value={client.dateOfBirth || '-'} />
        <ExportPill label="Age" value={client.age || '-'} />
        <ExportPill label="Review date" value={reviewDate} />
        <ExportPill label="Policies" value={policies.length} />
      </section>

      <section className="policy-export-summary-grid pdf-avoid-break">
        <section className="policy-export-summary-table">
          <h2>Premium Summary</h2>
          <SummaryTable rows={[
            ['Total monthly premium', formatPolicyCurrency(summary.totals.monthlyPremium)],
            ['Total annual premium', formatPolicyCurrency(summary.totals.annualPremium)],
            ['Single premium entered', formatPolicyCurrency(summary.totals.singlePremium)],
          ]}
          />
        </section>

        <section className="policy-export-summary-table">
          <h2>Coverage Summary</h2>
          <SummaryTable rows={[
            ['Death', formatPolicyCurrency(summary.totals.death)],
            ['TPD', formatPolicyCurrency(summary.totals.tpd)],
            ['ECI', formatPolicyCurrency(summary.totals.eci)],
            ['CI', formatPolicyCurrency(summary.totals.ci)],
            ['Hospitalisation', summary.hospitalisationSummary],
            ['Accident', formatPolicyCurrency(summary.totals.accident)],
            ['Disability income', formatPolicyCurrency(summary.totals.disabilityIncome)],
          ]}
          />
        </section>
      </section>

      <PolicyTimelinePdf policies={policies} />

      {policyChunks.map((chunk, index) => (
        <section
          className="policy-export-section policy-export-table-section pdf-avoid-break"
          key={`policy-export-chunk-${index}`}
        >
          <h2>Policy Summary Table {index + 1} of {policyChunks.length}</h2>
          <PolicySummaryChunkTable policies={chunk} chunkIndex={index} />
        </section>
      ))}

      <section className="policy-export-summary-table policy-export-gap pdf-avoid-break">
        <h2>Policy Gap Summary</h2>
        <SummaryTable rows={[
          ['Annual income benchmark', formatPolicyCurrency(benchmark.annualIncome)],
          ['Recommended death coverage', formatPolicyCurrency(summary.recommendedDeath)],
          ['Current death coverage', formatPolicyCurrency(summary.totals.death)],
          ['Death gap / surplus', formatPolicyCurrency(summary.deathGap), summary.deathGap >= 0 ? 'positive' : 'negative'],
          ['Recommended CI coverage', formatPolicyCurrency(summary.recommendedCi)],
          ['Current CI coverage', formatPolicyCurrency(summary.totals.ci)],
          ['CI gap / surplus', formatPolicyCurrency(summary.ciGap), summary.ciGap >= 0 ? 'positive' : 'negative'],
        ]}
        />
      </section>

      <section className="policy-export-notes pdf-avoid-break">
        <h2>Notes / Disclaimer</h2>
        <p>{notes || 'No notes entered.'}</p>
        <p>{disclaimer}</p>
      </section>
    </section>
  );
}

function PolicyTimelinePdf({ policies }) {
  const rows = policies.map((policy) => ({
    policy,
    premium: getPremiumPeriod(policy),
    coverage: getCoveragePeriod(policy),
    status: getTimelineStatus(policy),
  }));
  const barPeriods = rows.flatMap((row) => [row.premium, row.coverage]).filter((period) => period.hasBar && isValidAge(period.startAge) && isValidAge(period.endAge));
  const minAge = barPeriods.length > 0
    ? Math.max(0, Math.floor(Math.min(...barPeriods.map((period) => period.startAge)) / 5) * 5)
    : 25;
  const maxAge = barPeriods.length > 0
    ? Math.min(99, Math.max(85, Math.ceil(Math.max(...barPeriods.map((period) => period.endAge)) / 5) * 5))
    : 85;
  const ticks = buildTimelineTicks(minAge, maxAge);
  const width = 1000;
  const leftWidth = 220;
  const statusWidth = 78;
  const chartX = leftWidth;
  const chartWidth = width - leftWidth - statusWidth - 12;
  const topPad = 34;
  const rowHeight = rows.length > 12 ? 22 : 24;
  const height = topPad + (Math.max(rows.length, 1) * rowHeight) + 24;
  const range = Math.max(1, maxAge - minAge);
  const xForAge = (age) => chartX + (((age - minAge) / range) * chartWidth);
  const bar = (period, y, color, label) => {
    if (!period.hasBar || !isValidAge(period.startAge) || !isValidAge(period.endAge)) {
      return (
        <text x={chartX + 2} y={y + 7} className="policy-timeline-pdf-unknown">
          {label}
        </text>
      );
    }
    const x = xForAge(period.startAge);
    const endX = xForAge(period.endAge);
    const barWidth = Math.max(7, endX - x);
    return (
      <g>
        <rect x={x} y={y} width={barWidth} height="6" rx="3" fill={color} />
        <text x={Math.min(x + barWidth + 4, chartX + chartWidth - 54)} y={y + 6} className="policy-timeline-pdf-bar-label">
          {period.isLifetime ? 'Lifetime' : period.label}
        </text>
      </g>
    );
  };

  return (
    <section className="policy-export-section policy-timeline-pdf pdf-avoid-break">
      <div className="policy-timeline-pdf-heading">
        <h2>Policy Timeline</h2>
        <div>
          <span><i className="premium" /> Premium payable</span>
          <span><i className="coverage" /> Coverage period</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Policy timeline visual">
        <line x1={chartX} y1="23" x2={chartX + chartWidth} y2="23" stroke="#cfd8e5" strokeWidth="1.2" />
        {ticks.map((tick) => {
          const x = xForAge(tick);
          return (
            <g key={`tick-${tick}`}>
              <line x1={x} y1="20" x2={x} y2={height - 14} stroke="#e6ebf2" strokeWidth="1" />
              <text x={x} y="14" textAnchor="middle" className="policy-timeline-pdf-tick">{tick === 99 ? '99/Life' : tick}</text>
            </g>
          );
        })}
        {rows.map((row, index) => {
          const rowY = topPad + (index * rowHeight);
          return (
            <g key={`timeline-pdf-${row.policy.id}`}>
              <line x1="0" y1={rowY + rowHeight - 3} x2={width} y2={rowY + rowHeight - 3} stroke="#eef2f6" strokeWidth="1" />
              <text x="0" y={rowY + 8} className="policy-timeline-pdf-name">{truncateText(row.policy.planName || 'Policy', 30)}</text>
              <text x="0" y={rowY + 18} className="policy-timeline-pdf-company">{truncateText(row.policy.company || row.status || '-', 36)}</text>
              {bar(row.premium, rowY + 3, '#c49a43', 'premium unknown')}
              {bar(row.coverage, rowY + 13, '#102a4c', 'coverage unknown')}
              <text x={width - statusWidth + 6} y={rowY + 13} className={`policy-timeline-pdf-status ${getStatusClass(row.policy)}`}>
                {truncateText(row.status, 16)}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

function PolicySummaryChunkTable({ policies, chunkIndex }) {
  return (
    <table className="policy-export-table">
      <thead>
        <tr>
          <th>Field</th>
          {policies.map((policy, index) => (
            <th key={`${policy.id}-header`}>
              {policy.planName || `Policy ${(chunkIndex * 4) + index + 1}`}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {exportPolicyRows.map((row) => (
          <tr key={row.label} className={row.highlight ? 'coverage-row' : ''}>
            <th>{row.label}</th>
            {policies.map((policy) => <td key={`${policy.id}-${row.label}`}>{row.get(policy)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function chunkPoliciesForPdf(policies, chunkSize = 4) {
  const chunks = [];
  for (let index = 0; index < policies.length; index += chunkSize) {
    chunks.push(policies.slice(index, index + chunkSize));
  }
  return chunks.length > 0 ? chunks : [[]];
}

function ExportPill({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryTable({ rows }) {
  return (
    <table>
      <tbody>
        {rows.map(([label, value, tone]) => (
          <tr className={tone || ''} key={label}>
            <th>{label}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function getTimelineStatus(policy) {
  if (policy.policyStatus === 'Lapsed' || policy.payStatus === 'Lapsed') return 'Lapsed';
  if (policy.coverageStatus === 'Ended') return 'Expired / Ended';
  if (policy.payStatus === 'Fully paid' || policy.premiumPayableType === 'Fully paid') return 'Fully paid';
  return policy.coverageStatus || policy.policyStatus || 'Active';
}

function getStatusClass(policy) {
  const status = getTimelineStatus(policy).toLowerCase();
  if (status.includes('lapsed')) return 'lapsed';
  if (status.includes('expired') || status.includes('ended')) return 'ended';
  if (status.includes('fully')) return 'fully-paid';
  return 'active';
}

function buildTimelineTicks(minAge, maxAge) {
  const ticks = [];
  const step = maxAge - minAge > 55 ? 10 : 5;
  for (let age = minAge; age <= maxAge; age += step) ticks.push(age);
  if (!ticks.includes(maxAge)) ticks.push(maxAge);
  if (maxAge === 99 && !ticks.includes(99)) ticks.push(99);
  return ticks;
}

function isValidAge(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function truncateText(value, maxLength) {
  const text = String(value || '');
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}...` : text;
}

function textValue(value) {
  return value || '-';
}
