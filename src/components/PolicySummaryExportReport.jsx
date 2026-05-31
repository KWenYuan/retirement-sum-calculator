import {
  calculatePolicyTablePremiumTotalsByCurrency,
  formatCurrencyTotals,
  formatDisplayDate,
  formatPolicyCurrencyWithLabel,
  formatPolicyTimelinePremium,
  getBenefitCoverageDifferences,
  getPolicyTablePremiumValues,
  getCoveragePeriod,
  getPremiumPeriod,
} from '../utils/policySummary.js';

const disclaimer = 'This policy summary is prepared based on information provided and is for discussion purposes only. Please refer to the official policy contracts, benefit illustrations and insurer documents for exact benefits, exclusions, values, terms and conditions.';
const PDF_POLICY_CHUNK_SIZE = 8;

const exportPolicyRows = [
  { label: 'Company', get: (policy) => textValue(policy.company) },
  { label: 'Policy No.', get: (policy) => textValue(policy.policyNumber) },
  { label: 'Type of Plan', get: (policy) => textValue(policy.typeOfPlan) },
  { label: 'Plan Name', get: (policy) => textValue(policy.planName) },
  { label: 'Policy Start Date', get: (policy) => formatDisplayDate(policy.startDate) },
  { label: 'Monthly Premium', totalKey: 'monthlyPremium', get: (policy) => getPolicyTablePremiumValues(policy).monthlyDisplay },
  { label: 'Annual Premium', totalKey: 'annualPremium', get: (policy) => getPolicyTablePremiumValues(policy).annualDisplay },
  { label: 'Premium Payable Period', get: (policy) => getPremiumPeriod(policy).label },
  { label: 'Death', totalKey: 'death', highlight: true, get: (policy) => formatPolicyCurrencyWithLabel(policy.deathBenefit, policy.currency) },
  { label: 'TPD', totalKey: 'tpd', highlight: true, get: (policy) => formatPolicyCurrencyWithLabel(policy.tpdBenefit, policy.currency) },
  { label: 'ECI', totalKey: 'eci', highlight: true, get: (policy) => formatPolicyCurrencyWithLabel(policy.eciBenefit, policy.currency) },
  { label: 'CI', totalKey: 'ci', highlight: true, get: (policy) => formatPolicyCurrencyWithLabel(policy.ciBenefit, policy.currency) },
  { label: 'Hospitalisation', highlight: true, get: (policy) => textValue(policy.hospitalisation) },
  { label: 'Accident', totalKey: 'accident', highlight: true, get: (policy) => formatPolicyCurrencyWithLabel(policy.personalAccident, policy.currency) },
  { label: 'Disability Income', totalKey: 'disabilityIncome', highlight: true, get: (policy) => formatPolicyCurrencyWithLabel(policy.disabilityIncome, policy.currency) },
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
  const policyChunks = chunkPoliciesForPdf(policies, PDF_POLICY_CHUNK_SIZE);
  const tablePremiumTotalsByCurrency = calculatePolicyTablePremiumTotalsByCurrency(policies);
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
          <CurrencySummaryTable summary={summary} rows={[
            ['Monthly Premium', 'monthlyPremium'],
            ['Annual Premium', 'annualPremium'],
            ['Single Premium', 'singlePremium'],
          ]}
          />
        </section>

        <section className="policy-export-summary-table">
          <h2>Coverage Summary</h2>
          <CurrencySummaryTable summary={summary} rows={[
            ['Death', 'death'],
            ['TPD', 'tpd'],
            ['ECI', 'eci'],
            ['CI', 'ci'],
            ['Accident', 'accident'],
            ['Disability Income', 'disabilityIncome'],
          ]}
          />
          <p className="policy-export-hospitalisation">Hospitalisation: {summary.hospitalisationSummary}</p>
        </section>
      </section>

      <PolicyTimelinePdf policies={policies} />

      {policyChunks.map((chunk, index) => (
        <section
          className="policy-export-section policy-export-table-section pdf-avoid-break"
          key={`policy-export-chunk-${index}`}
        >
          <h2>Policy Summary Table {index + 1} of {policyChunks.length}</h2>
          <PolicySummaryChunkTable
            policies={chunk}
            chunkIndex={index}
            summary={summary}
            tablePremiumTotalsByCurrency={tablePremiumTotalsByCurrency}
          />
        </section>
      ))}

      <section className="policy-export-summary-table policy-export-gap pdf-avoid-break">
        <h2>Policy Gap Summary</h2>
        <GapSummaryTable summary={summary} benchmark={benchmark} />
      </section>

      <section className="policy-export-notes pdf-avoid-break">
        <h2>Notes / Disclaimer</h2>
        <p>{notes || 'No notes entered.'}</p>
        <p>{disclaimer}</p>
      </section>
    </section>
  );
}

function CurrencySummaryTable({ summary, rows }) {
  const currencies = summary.currencies.length > 0 ? summary.currencies : ['SGD'];
  const singleCurrency = currencies.length === 1;
  return (
    <table>
      <thead>
        <tr>
          <th>{singleCurrency ? 'Item' : 'Item'}</th>
          {singleCurrency ? <th>Amount</th> : currencies.map((currency) => <th key={currency}>{currency}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, key]) => (
          <tr key={key}>
            <th>{label}</th>
            {currencies.map((currency) => (
              <td key={`${key}-${currency}`}>{formatPolicyCurrencyWithLabel(summary.totalsByCurrency[currency]?.[key] || 0, currency)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GapSummaryTable({ summary, benchmark }) {
  const currencies = summary.currencies.length > 0 ? summary.currencies : [summary.benchmarkCurrency];
  return (
    <table>
      <thead>
        <tr>
          <th>Currency</th>
          <th>Death Benchmark / Cover</th>
          <th>Death Gap</th>
          <th>CI Benchmark / Cover</th>
          <th>CI Gap</th>
        </tr>
      </thead>
      <tbody>
        {currencies.map((currency) => {
          const gap = summary.gapsByCurrency[currency] || {};
          return (
            <tr key={`gap-${currency}`}>
              <th>{currency}</th>
              <td>
                {gap.hasBenchmark
                  ? `${formatPolicyCurrencyWithLabel(benchmark.annualIncome * benchmark.deathMultiplier, currency)} / ${formatPolicyCurrencyWithLabel(gap.currentDeath, currency)}`
                  : `No benchmark / ${formatPolicyCurrencyWithLabel(gap.currentDeath || 0, currency)}`}
              </td>
              <td className={gap.hasBenchmark && gap.deathGap >= 0 ? 'positive' : gap.hasBenchmark ? 'negative' : ''}>
                {gap.hasBenchmark ? formatPolicyCurrencyWithLabel(gap.deathGap, currency) : 'Not combined'}
              </td>
              <td>
                {gap.hasBenchmark
                  ? `${formatPolicyCurrencyWithLabel(benchmark.annualIncome * benchmark.ciMultiplier, currency)} / ${formatPolicyCurrencyWithLabel(gap.currentCi, currency)}`
                  : `No benchmark / ${formatPolicyCurrencyWithLabel(gap.currentCi || 0, currency)}`}
              </td>
              <td className={gap.hasBenchmark && gap.ciGap >= 0 ? 'positive' : gap.hasBenchmark ? 'negative' : ''}>
                {gap.hasBenchmark ? formatPolicyCurrencyWithLabel(gap.ciGap, currency) : 'Not combined'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PolicyTimelinePdf({ policies }) {
  const rows = policies.map((policy) => ({
    policy,
    premium: getPremiumPeriod(policy),
    coverage: getCoveragePeriod(policy),
    benefitDifferences: getBenefitCoverageDifferences(policy),
    status: getTimelineStatus(policy),
  }));
  const benefitDifferenceRows = rows.flatMap((row) => row.benefitDifferences.map((period) => ({
    policyName: row.policy.planName || 'Policy',
    benefit: period.label,
    period: period.periodLabel,
  })));
  const barPeriods = rows.flatMap((row) => [row.premium, row.coverage, ...row.benefitDifferences]).filter((period) => period.hasBar && isValidAge(period.startAge) && isValidAge(period.endAge));
  const minAge = barPeriods.length > 0
    ? Math.max(0, Math.floor(Math.min(...barPeriods.map((period) => period.startAge)) / 5) * 5)
    : 25;
  const maxAge = barPeriods.length > 0
    ? Math.min(99, Math.max(85, Math.ceil(Math.max(...barPeriods.map((period) => period.endAge)) / 5) * 5))
    : 85;
  const ticks = buildTimelineTicks(minAge, maxAge);
  const width = 1000;
  const leftWidth = 300;
  const statusWidth = 60;
  const chartX = leftWidth;
  const chartWidth = width - leftWidth - statusWidth - 12;
  const topPad = 34;
  const hasBenefitBars = rows.some((row) => row.benefitDifferences.length > 0);
  const rowHeight = hasBenefitBars ? 42 : rows.length > 12 ? 31 : 32;
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
          <span><i className="benefit" /> Benefit-specific</span>
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
          const premiumDisplay = formatPolicyTimelinePremium(row.policy);
          return (
            <g key={`timeline-pdf-${row.policy.id}`}>
              <line x1="0" y1={rowY + rowHeight - 3} x2={width} y2={rowY + rowHeight - 3} stroke="#eef2f6" strokeWidth="1" />
              <text x="0" y={rowY + 7} className="policy-timeline-pdf-name">{truncateText(row.policy.planName || 'Policy', 32)}</text>
              <text x="0" y={rowY + 15} className="policy-timeline-pdf-company">{truncateText(`${row.policy.company || '-'} | ${row.status || '-'}`, 42)}</text>
              <text x="0" y={rowY + 23} className="policy-timeline-pdf-company">{truncateText(premiumDisplay, 44)}</text>
              <text x="145" y={rowY + 23} className="policy-timeline-pdf-company">{truncateText(`Premium: ${row.premium.label}`, 30)}</text>
              <text x="145" y={rowY + 30} className="policy-timeline-pdf-company">{truncateText(`Coverage: ${row.coverage.label}`, 30)}</text>
              {bar(row.premium, rowY + 3, '#c49a43', 'premium unknown')}
              {bar(row.coverage, rowY + 13, '#102a4c', 'coverage unknown')}
              {row.benefitDifferences.slice(0, 2).map((period, benefitIndex) => {
                const x = xForAge(period.startAge);
                const endX = xForAge(period.endAge);
                const barWidth = Math.max(7, endX - x);
                const benefitY = rowY + 24 + (benefitIndex * 7);
                return (
                  <g key={`timeline-pdf-${row.policy.id}-${period.key}`}>
                    <rect x={x} y={benefitY} width={barWidth} height="4" rx="2" fill={benefitIndex === 0 ? '#6f56d9' : '#4f86c6'} />
                    <text x={Math.min(x + barWidth + 4, chartX + chartWidth - 54)} y={benefitY + 4} className="policy-timeline-pdf-bar-label">
                      {truncateText(`${period.label}: ${period.periodLabel}`, 26)}
                    </text>
                  </g>
                );
              })}
              <text x={width - statusWidth + 6} y={rowY + 13} className={`policy-timeline-pdf-status ${getStatusClass(row.policy)}`}>
                {truncateText(row.status, 16)}
              </text>
            </g>
          );
        })}
      </svg>
      {benefitDifferenceRows.length > 0 && (
        <div className="policy-benefit-differences-pdf">
          <h3>Benefit Coverage Differences</h3>
          <table>
            <thead>
              <tr>
                <th>Policy</th>
                <th>Benefit</th>
                <th>Coverage Period</th>
              </tr>
            </thead>
            <tbody>
              {benefitDifferenceRows.map((row) => (
                <tr key={`${row.policyName}-${row.benefit}-${row.period}`}>
                  <td>{row.policyName}</td>
                  <td>{row.benefit}</td>
                  <td>{row.period}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function PolicySummaryChunkTable({
  policies,
  chunkIndex,
  summary,
  tablePremiumTotalsByCurrency,
}) {
  return (
    <table className="policy-export-table">
      <thead>
        <tr>
          <th>Field</th>
          {policies.map((policy, index) => (
            <th key={`${policy.id}-header`}>
              {policy.planName || `Policy ${(chunkIndex * PDF_POLICY_CHUNK_SIZE) + index + 1}`}
            </th>
          ))}
          <th className="policy-export-total-column">Total</th>
        </tr>
      </thead>
      <tbody>
        {exportPolicyRows.map((row) => (
          <tr key={row.label} className={row.highlight ? 'coverage-row' : ''}>
            <th>{row.label}</th>
            {policies.map((policy) => <td key={`${policy.id}-${row.label}`}>{row.get(policy)}</td>)}
            <td className="policy-export-total-column">
              <PdfCurrencyTotalValue
                row={row}
                summary={summary}
                tablePremiumTotalsByCurrency={tablePremiumTotalsByCurrency}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PdfCurrencyTotalValue({ row, summary, tablePremiumTotalsByCurrency }) {
  if (!row.totalKey) return '-';
  const totalsByCurrency = row.label === 'Monthly Premium' || row.label === 'Annual Premium'
    ? tablePremiumTotalsByCurrency
    : summary.totalsByCurrency;
  const values = formatCurrencyTotals(totalsByCurrency, row.totalKey, {
    includeZero: summary.currencies.length <= 1,
  });
  if (values.length === 0) return '-';
  return (
    <span className="currency-total-list">
      {values.map((value) => <b key={`${row.label}-${value}`}>{value}</b>)}
    </span>
  );
}

function chunkPoliciesForPdf(policies, chunkSize = 4) {
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
