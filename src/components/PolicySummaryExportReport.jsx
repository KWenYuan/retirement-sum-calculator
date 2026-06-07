import {
  calculatePolicyTablePremiumTotalsByCurrency,
  benefitCoverageDefinitions,
  formatCurrencyTotals,
  formatDisplayDate,
  formatPolicyCurrencyWithLabel,
  formatPolicyTimelinePremium,
  getBenefitAmountDisplay,
  getBenefitColor,
  getBenefitCoverageDetails,
  getBenefitTint,
  getPolicyTablePremiumValues,
  getPremiumPeriod,
} from '../utils/policySummary.js';
import { APP_NAME } from '../config/appBranding.js';

const disclaimer = 'This policy summary is prepared based on information provided and is for discussion purposes only. Please refer to the official policy contracts, benefit illustrations and insurer documents for exact benefits, exclusions, values, terms and conditions.';
const PDF_POLICY_CHUNK_SIZE = 8;
const PDF_TIMELINE_MAX_POLICIES_PER_PAGE = 5;
const PDF_TIMELINE_MAX_ROW_HEIGHT = 560;
const VERIFY_ITEM_LIMIT = 7;

const exportPolicyRows = [
  { label: 'Company', get: (policy) => textValue(policy.company) },
  { label: 'Policy No.', get: (policy) => textValue(policy.policyNumber) },
  { label: 'Type of Plan', get: (policy) => textValue(policy.typeOfPlan) },
  { label: 'Plan Name', get: (policy) => textValue(policy.planName) },
  { label: 'Policy Start Date', get: (policy) => formatDisplayDate(policy.startDate) },
  { label: 'Monthly Premium', totalKey: 'monthlyPremium', get: (policy) => getPolicyTablePremiumValues(policy).monthlyDisplay },
  { label: 'Annual Premium', totalKey: 'annualPremium', get: (policy) => getPolicyTablePremiumValues(policy).annualDisplay },
  { label: 'Premium Payable Period', get: (policy) => getPremiumPeriod(policy).label },
  { label: 'Death', totalKey: 'death', benefitKey: 'death', highlight: true, get: (policy) => getBenefitAmountDisplay(policy, 'death') },
  { label: 'TPD', totalKey: 'tpd', benefitKey: 'tpd', highlight: true, get: (policy) => getBenefitAmountDisplay(policy, 'tpd') },
  { label: 'ECI', totalKey: 'eci', benefitKey: 'eci', highlight: true, get: (policy) => getBenefitAmountDisplay(policy, 'eci') },
  { label: 'CI', totalKey: 'ci', benefitKey: 'ci', highlight: true, get: (policy) => getBenefitAmountDisplay(policy, 'ci') },
  { label: 'Hospitalisation', benefitKey: 'hospitalisation', highlight: true, get: (policy) => getBenefitAmountDisplay(policy, 'hospitalisation') },
  { label: 'Disability Income', totalKey: 'disabilityIncome', benefitKey: 'disabilityIncome', highlight: true, get: (policy) => getBenefitAmountDisplay(policy, 'disabilityIncome') },
  { label: 'Death (Accident)', totalKey: 'deathAccident', benefitKey: 'deathAccident', highlight: true, get: (policy) => getBenefitAmountDisplay(policy, 'deathAccident') },
  { label: 'TPD (Accident)', totalKey: 'tpdAccident', benefitKey: 'tpdAccident', highlight: true, get: (policy) => getBenefitAmountDisplay(policy, 'tpdAccident') },
  { label: 'Medical Reimbursement (Accident)', totalKey: 'medicalReimbursementAccident', benefitKey: 'medicalReimbursementAccident', highlight: true, get: (policy) => getBenefitAmountDisplay(policy, 'medicalReimbursementAccident') },
  { label: 'Hospital Income', totalKey: 'hospitalIncome', benefitKey: 'hospitalIncome', highlight: true, get: (policy) => getBenefitAmountDisplay(policy, 'hospitalIncome') },
  { label: 'Notes', get: (policy) => textValue(policy.notes) },
];

export function PolicySummaryExportReport({
  refNode,
  client,
  policies,
  summary,
  benchmark,
  notes,
}) {
  const safeClient = client || {};
  const safePolicies = Array.isArray(policies) ? policies.filter(Boolean) : [];
  const safeSummary = normalizeExportSummary(summary);
  const safeBenchmark = benchmark || {};
  const policyChunks = chunkPoliciesForPdf(safePolicies, PDF_POLICY_CHUNK_SIZE);
  const tablePremiumTotalsByCurrency = calculatePolicyTablePremiumTotalsByCurrency(safePolicies);
  const keyFindings = buildKeyFindings({ policies: safePolicies, summary: safeSummary, tablePremiumTotalsByCurrency });
  const dataToVerify = buildDataToVerify(safePolicies);
  const reviewDate = safeClient.reviewDate || new Date().toLocaleDateString('en-CA');
  const displayReviewDate = formatDisplayDate(reviewDate);

  return (
    <section className="policy-export-report pdf-export-root policy-summary-export-report" ref={refNode}>
      <section className="policy-pdf-page policy-export-cover-page">
        <header className="policy-export-header pdf-avoid-break">
          <div>
            <p>{APP_NAME} | Policy Summary Report</p>
            <h1>{safeClient.clientName || 'Client'}</h1>
            <span>Current as of {displayReviewDate}</span>
            <small>Advisor: {safeClient.advisorName || '-'}</small>
          </div>
          <img className="policy-export-logo pdf-report-logo" src="/logo.png" alt="Advisor logo" />
        </header>

        <section className="policy-export-client pdf-avoid-break">
          <ExportPill label="Date of birth" value={formatDisplayDate(safeClient.dateOfBirth)} />
          <ExportPill label="Age" value={safeClient.age || '-'} />
          <ExportPill label="Review date" value={displayReviewDate} />
          <ExportPill label="Policies" value={safePolicies.length} />
        </section>

        <section className="policy-export-summary-grid pdf-avoid-break">
          <section className="policy-export-summary-table">
            <h2>Premium Summary</h2>
            <CurrencySummaryTable summary={safeSummary} rows={[
              ['Monthly Premium', 'monthlyPremium'],
              ['Annual Premium', 'annualPremium'],
              ['Single Premium', 'singlePremium'],
            ]}
            />
          </section>

          <section className="policy-export-summary-table">
            <h2>Coverage Summary</h2>
            <CurrencySummaryTable summary={safeSummary} rows={[
              ['Death', 'death'],
              ['TPD', 'tpd'],
              ['ECI', 'eci'],
              ['CI', 'ci'],
              ['Disability Income', 'disabilityIncome'],
              ['Death (Accident)', 'deathAccident'],
              ['TPD (Accident)', 'tpdAccident'],
              ['Medical Reimbursement (Accident)', 'medicalReimbursementAccident'],
              ['Hospital Income', 'hospitalIncome'],
            ]}
            />
            <p className="policy-export-hospitalisation">Hospitalisation: {safeSummary.hospitalisationSummary}</p>
          </section>
        </section>

        <section className="policy-export-summary-table policy-export-gap pdf-avoid-break">
          <h2>Policy Gap Summary</h2>
          <GapSummaryTable summary={safeSummary} benchmark={safeBenchmark} />
        </section>

        <section className="policy-export-insights-grid pdf-avoid-break">
          <section className="policy-export-summary-table policy-export-key-findings">
            <h2>Key Findings</h2>
            <ol>
              {keyFindings.map((finding) => <li key={finding}>{finding}</li>)}
            </ol>
          </section>

          {dataToVerify.items.length > 0 && (
            <section className="policy-export-summary-table policy-export-data-verify">
              <h2>Data to Verify</h2>
              <ul>
                {dataToVerify.items.map((item) => <li key={item}>{item}</li>)}
                {dataToVerify.remaining > 0 && <li>and {dataToVerify.remaining} more item{dataToVerify.remaining === 1 ? '' : 's'} to verify</li>}
              </ul>
            </section>
          )}
        </section>

        <section className="policy-export-notes policy-export-notes-inline">
          <h2>Notes / Disclaimer</h2>
          <p>{notes || 'No notes entered.'}</p>
          <p>{disclaimer}</p>
        </section>
      </section>

      <PolicyTimelinePdf policies={safePolicies} />

      {policyChunks.map((chunk, index) => (
        <section
          className="policy-pdf-page policy-export-section policy-export-table-section policy-export-table-page"
          key={`policy-export-chunk-${index}`}
        >
          <h2>Policy Summary Table {index + 1} of {policyChunks.length}</h2>
          <PolicySummaryChunkTable
            policies={chunk}
            chunkIndex={index}
            summary={safeSummary}
            tablePremiumTotalsByCurrency={tablePremiumTotalsByCurrency}
          />
        </section>
      ))}

    </section>
  );
}

function CurrencySummaryTable({ summary, rows }) {
  const totalsByCurrency = summary?.totalsByCurrency || {};
  const currencies = Array.isArray(summary?.currencies) && summary.currencies.length > 0 ? summary.currencies : ['SGD'];
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
              <td key={`${key}-${currency}`}>{formatPolicyCurrencyWithLabel(totalsByCurrency[currency]?.[key] || 0, currency)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GapSummaryTable({ summary, benchmark }) {
  const currencies = Array.isArray(summary?.currencies) && summary.currencies.length > 0 ? summary.currencies : [summary?.benchmarkCurrency || benchmark?.currency || 'SGD'];
  const gapsByCurrency = summary?.gapsByCurrency || {};
  return (
    <table>
      <thead>
        <tr>
          <th>Currency</th>
          <th>Death Benchmark</th>
          <th>Current Death Coverage</th>
          <th>Death Gap</th>
          <th>CI Benchmark</th>
          <th>Current CI Coverage</th>
          <th>CI Gap</th>
        </tr>
      </thead>
      <tbody>
        {currencies.map((currency) => {
          const gap = gapsByCurrency[currency] || {
            hasBenchmark: false,
            currentDeath: 0,
            currentCi: 0,
          };
          return (
            <tr key={`gap-${currency}`}>
              <th>{currency}</th>
              <td>{gap.hasBenchmark ? formatPolicyCurrencyWithLabel(gap.recommendedDeath, currency) : 'Not calculated'}</td>
              <td>{formatPolicyCurrencyWithLabel(gap.currentDeath || 0, currency)}</td>
              <td className={gap.hasBenchmark && gap.deathGap >= 0 ? 'positive' : gap.hasBenchmark ? 'negative' : ''}>
                {gap.hasBenchmark ? formatPolicyCurrencyWithLabel(gap.deathGap, currency) : 'Not calculated'}
              </td>
              <td>{gap.hasBenchmark ? formatPolicyCurrencyWithLabel(gap.recommendedCi, currency) : 'Not calculated'}</td>
              <td>{formatPolicyCurrencyWithLabel(gap.currentCi || 0, currency)}</td>
              <td className={gap.hasBenchmark && gap.ciGap >= 0 ? 'positive' : gap.hasBenchmark ? 'negative' : ''}>
                {gap.hasBenchmark ? formatPolicyCurrencyWithLabel(gap.ciGap, currency) : 'Not calculated'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function buildKeyFindings({ policies, summary, tablePremiumTotalsByCurrency }) {
  const findings = [`Existing policies reviewed: ${policies.length}`];
  findings.push(`Total monthly premium: ${formatTotalsForFinding(tablePremiumTotalsByCurrency, 'monthlyPremium')}`);
  findings.push(`Total annual premium: ${formatTotalsForFinding(tablePremiumTotalsByCurrency, 'annualPremium')}`);

  const benchmarkCurrency = summary.benchmarkCurrency || summary.currencies?.[0] || 'SGD';
  const benchmarkGap = summary.gapsByCurrency?.[benchmarkCurrency];
  if (benchmarkGap?.hasBenchmark) {
    findings.push(`Death coverage position: ${formatGapPosition(benchmarkGap.deathGap, benchmarkCurrency)}`);
    findings.push(`CI coverage position: ${formatGapPosition(benchmarkGap.ciGap, benchmarkCurrency)}`);
  } else {
    findings.push('Death and CI coverage benchmarks should be verified before gap conclusions are finalised.');
  }

  const dataIssues = collectDataVerificationIssues(policies);
  const missingPremiumCount = policies.filter((policy) => !getPremiumPeriod(policy).hasBar).length;
  const missingCoverageCount = policies.filter((policy) => (
    getBenefitCoverageDetails(policy).some((period) => !period.hasBar)
  )).length;
  if (missingPremiumCount > 0 || missingCoverageCount > 0) {
    findings.push(`${missingPremiumCount} premium period${missingPremiumCount === 1 ? '' : 's'} and ${missingCoverageCount} coverage period${missingCoverageCount === 1 ? '' : 's'} need verification.`);
  }
  if (dataIssues.length > 0) {
    findings.push('Some policy details should be checked against official insurer documents.');
  }

  return findings;
}

function buildDataToVerify(policies) {
  const allItems = collectDataVerificationIssues(policies);
  return {
    items: allItems.slice(0, VERIFY_ITEM_LIMIT),
    remaining: Math.max(0, allItems.length - VERIFY_ITEM_LIMIT),
  };
}

function collectDataVerificationIssues(policies) {
  const issues = [];
  policies.forEach((policy, index) => {
    const name = policy.planName || policy.policyName || policy.name || `Policy ${index + 1}`;
    const premiumPeriod = getPremiumPeriod(policy);
    if (!policy.startDate) issues.push(`${name}: policy start date missing`);
    if (!isPdfValidAge(policy.ageInception)) issues.push(`${name}: policy start age missing`);
    if (!policy.policyStatus || policy.policyStatus === 'Unknown') issues.push(`${name}: policy status missing`);
    if (Number(policy.premiumAmount || 0) <= 0 && policy.premiumFrequency !== 'Single Premium') issues.push(`${name}: premium amount missing`);
    if (!premiumPeriod.hasBar) issues.push(`${name}: premium period unknown`);
    benefitCoverageDefinitions.forEach((benefit) => {
      const raw = policy.benefits?.[benefit.key] || policy.benefitCoveragePeriods?.[benefit.key] || {};
      const amount = raw.amount ?? policy[benefit.amountField];
      const hasAmount = benefit.type === 'text'
        ? Boolean(String(amount || '').trim())
        : Number(amount || 0) > 0;
      if (!hasAmount) return;
      const startAge = Number(raw.startAge);
      const endAge = Number(raw.endAge);
      const hasStart = isPdfValidAge(raw.startAge);
      const hasEnd = isPdfValidAge(raw.endAge);
      if (!hasStart || !hasEnd) {
        issues.push(`${name}: ${benefit.label} coverage period missing`);
        return;
      }
      if (endAge > 120) issues.push(`${name}: ${benefit.label} end age ${endAge} looks unusually high`);
      if (endAge < startAge) issues.push(`${name}: ${benefit.label} end age is before start age`);
    });
  });
  return Array.from(new Set(issues));
}

function formatTotalsForFinding(totalsByCurrency = {}, key) {
  const values = formatCurrencyTotals(totalsByCurrency, key, { includeZero: false });
  return values.length > 0 ? values.join(' / ') : '-';
}

function formatGapPosition(gap, currency) {
  if (gap === null || typeof gap === 'undefined') return 'Not calculated';
  const label = gap >= 0 ? 'surplus' : 'shortfall';
  return `${formatPolicyCurrencyWithLabel(Math.abs(gap), currency)} ${label}`;
}

function isPdfValidAge(value) {
  if (value === '' || value === null || typeof value === 'undefined') return false;
  return Number.isFinite(Number(value));
}

function PolicyTimelinePdf({ policies }) {
  const safePolicies = Array.isArray(policies) ? policies.filter(Boolean) : [];
  const rows = safePolicies.map((policy) => ({
    policy,
    premium: getPremiumPeriod(policy),
    benefits: getBenefitCoverageDetails(policy).filter((period) => period.hasBar),
    status: getTimelineStatus(policy),
  }));
  const timelinePages = chunkTimelineRows(rows);
  const barPeriods = rows.flatMap((row) => [row.premium, ...row.benefits]).filter((period) => period.hasBar && isValidAge(period.startAge) && isValidAge(period.endAge));
  const minAge = barPeriods.length > 0
    ? Math.max(0, Math.floor(Math.min(...barPeriods.map((period) => period.startAge)) / 5) * 5)
    : 25;
  const maxAge = barPeriods.length > 0
    ? Math.min(99, Math.max(85, Math.ceil(Math.max(...barPeriods.map((period) => period.endAge)) / 5) * 5))
    : 85;
  const ticks = buildTimelineTicks(minAge, maxAge);
  const range = Math.max(1, maxAge - minAge);
  const toStyle = (period) => {
    if (!period?.hasBar || !isValidAge(period.startAge) || !isValidAge(period.endAge)) return {};
    return {
      left: `${Math.max(0, ((period.startAge - minAge) / range) * 100)}%`,
      width: `${Math.max(period.startAge === period.endAge ? 2 : 4, ((period.endAge - period.startAge) / range) * 100)}%`,
    };
  };

  if (timelinePages.length === 0) {
    timelinePages.push([]);
  }

  return (
    <>
      {timelinePages.map((pageRows, pageIndex) => (
        <PolicyTimelinePdfPage
          key={`policy-timeline-pdf-page-${pageIndex}`}
          pageRows={pageRows}
          pageIndex={pageIndex}
          pageCount={timelinePages.length}
          ticks={ticks}
          minAge={minAge}
          range={range}
          toStyle={toStyle}
        />
      ))}
    </>
  );
}

function PolicyTimelinePdfPage({ pageRows, pageIndex, pageCount, ticks, minAge, range, toStyle }) {
  return (
    <section className="policy-pdf-page policy-export-section policy-timeline-section policy-timeline-pdf">
      <div className="section-header">
        <div>
          <h2>Policy Timeline{pageCount > 1 ? ` (${pageIndex + 1} of ${pageCount})` : ''}</h2>
          <p className="section-subtext">Premium payable periods and coverage periods by policy.</p>
        </div>
      </div>
      <div className="policy-timeline-legend">
        <span><i className="premium" /> Premium Payable</span>
        <span><i className="coverage" /> Benefit Coverage</span>
        <span><b className="fully-paid">Fully Paid</b></span>
        <span><b className="ended">Expired / Ended</b></span>
        <span><b className="lapsed">Lapsed</b></span>
      </div>
      <div className="policy-timeline-shared">
        <div className="policy-timeline-list">
          {pageRows.length === 0 && <p className="policy-timeline-empty">No policy timeline data entered.</p>}
          {pageRows.map(({ policy, premium, benefits, status }) => {
            const trackHeight = getTimelinePdfTrackHeight(benefits.length);
            return (
              <div
                className={`policy-timeline-row ${getStatusClass(policy)}`}
                key={policy.id || `${policy.planName}-${policy.policyNumber}`}
              >
                <div className="policy-timeline-name">
                  <strong>{policy.planName || 'Policy'}</strong>
                  <span>{policy.company || '-'} | {policy.policyStatus || '-'}</span>
                  <small>{formatPolicyTimelinePremium(policy)}</small>
                </div>
                <div className="policy-timeline-track" style={{ minHeight: trackHeight }}>
                  {ticks.map((tick) => (
                    <span
                      aria-hidden="true"
                      className="policy-timeline-gridline"
                      key={`${policy.id || policy.planName}-${tick}`}
                      style={{ left: `${((tick - minAge) / range) * 100}%` }}
                    />
                  ))}
                  {premium.hasBar ? (
                    <PolicyTimelinePdfBar period={premium} type="premium" style={toStyle(premium)} />
                  ) : (
                    <span className="policy-timeline-bar premium placeholder" style={{ left: '2%', width: '34%' }}>
                      Premium period to verify
                    </span>
                  )}
                  {benefits.map((period, index) => (
                    <PolicyTimelinePdfBar
                      key={`${policy.id || policy.planName}-${period.key}`}
                      period={period}
                      type="benefit"
                      style={period.hasBar ? {
                        ...toStyle(period),
                        top: 34 + (index * 16),
                        background: getBenefitColor(period.key),
                      } : {}}
                    />
                  ))}
                </div>
                <span className={`policy-status-badge ${getStatusClass(policy)}`}>{status}</span>
              </div>
            );
          })}
        </div>
        <div className="policy-timeline-axis">
          <span />
          <div>
            {ticks.map((tick) => (
              <b key={tick} style={{ left: `${((tick - minAge) / range) * 100}%` }}>{tick === 99 ? '99/Life' : tick}</b>
            ))}
          </div>
          <span />
        </div>
      </div>
    </section>
  );
}

function getTimelinePdfTrackHeight(benefitCount) {
  return Math.max(68, 44 + (benefitCount * 18));
}

function getTimelinePdfRowHeight(row) {
  return getTimelinePdfTrackHeight(row.benefits.length) + 22;
}

function chunkTimelineRows(rows) {
  const balancedPages = balancedChunks(rows, PDF_TIMELINE_MAX_POLICIES_PER_PAGE);
  const pages = [];

  balancedPages.forEach((page) => {
    let currentPage = [];
    let currentHeight = 0;
    page.forEach((row) => {
      const rowHeight = getTimelinePdfRowHeight(row);
      if (currentPage.length > 0 && currentHeight + rowHeight > PDF_TIMELINE_MAX_ROW_HEIGHT) {
        pages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
      }
      currentPage.push(row);
      currentHeight += rowHeight;
    });
    if (currentPage.length > 0) pages.push(currentPage);
  });

  return pages;
}

function PolicyTimelinePdfBar({ period, type, style }) {
  if (!period?.hasBar) {
    return <span className={`timeline-bar-text ${type}`}>{period.label}</span>;
  }
  const label = type === 'benefit' ? `${period.label}: ${period.periodLabel}` : period.label;
  return (
    <span className={`policy-timeline-bar ${type}`} style={style}>
      {label}
    </span>
  );
}

function PolicySummaryChunkTable({
  policies,
  chunkIndex,
  summary,
  tablePremiumTotalsByCurrency,
}) {
  const safePolicies = Array.isArray(policies) ? policies.filter(Boolean) : [];
  return (
    <table className="policy-export-table">
      <thead>
        <tr>
          <th>Field</th>
          {safePolicies.map((policy, index) => (
            <th key={`${policy.id || `policy-${index}`}-header`}>
              {policy.planName || `Policy ${(chunkIndex * PDF_POLICY_CHUNK_SIZE) + index + 1}`}
            </th>
          ))}
          <th className="policy-export-total-column">Total</th>
        </tr>
      </thead>
      <tbody>
        {exportPolicyRows.map((row) => (
          <tr
            key={row.label}
            className={row.highlight ? 'coverage-row' : ''}
            style={row.benefitKey ? {
              '--benefit-color': getBenefitColor(row.benefitKey),
              '--benefit-tint': getBenefitTint(row.benefitKey),
            } : undefined}
          >
            <th>{row.label}</th>
            {safePolicies.map((policy, index) => <td key={`${policy.id || index}-${row.label}`}>{row.get(policy)}</td>)}
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
    : summary?.totalsByCurrency || {};
  const values = formatCurrencyTotals(totalsByCurrency, row.totalKey, {
    includeZero: !Array.isArray(summary?.currencies) || summary.currencies.length <= 1,
  });
  if (values.length === 0) return '-';
  return (
    <span className="currency-total-list">
      {values.map((value) => <b key={`${row.label}-${value}`}>{value}</b>)}
    </span>
  );
}

function chunkPoliciesForPdf(policies, chunkSize = 4) {
  const safePolicies = Array.isArray(policies) ? policies.filter(Boolean) : [];
  const chunks = balancedChunks(safePolicies, chunkSize);
  return chunks.length > 0 ? chunks : [[]];
}

function balancedChunks(items, maxChunkSize) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (safeItems.length === 0) return [];
  const pageCount = Math.max(1, Math.ceil(safeItems.length / maxChunkSize));
  const baseSize = Math.floor(safeItems.length / pageCount);
  const extra = safeItems.length % pageCount;
  const chunks = [];
  let cursor = 0;
  for (let index = 0; index < pageCount; index += 1) {
    const size = baseSize + (index < extra ? 1 : 0);
    chunks.push(safeItems.slice(cursor, cursor + size));
    cursor += size;
  }
  return chunks.filter((chunk) => chunk.length > 0);
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

function normalizeExportSummary(summary = {}) {
  const currencies = Array.isArray(summary.currencies) ? summary.currencies : [];
  const benchmarkCurrency = summary.benchmarkCurrency || currencies[0] || 'SGD';
  return {
    ...summary,
    currencies,
    benchmarkCurrency,
    totalsByCurrency: summary.totalsByCurrency || {},
    gapsByCurrency: summary.gapsByCurrency || {},
    hospitalisationSummary: summary.hospitalisationSummary || 'No hospitalisation plan entered',
  };
}

function getTimelineStatus(policy) {
  if (policy.policyStatus === 'Lapsed' || policy.payStatus === 'Lapsed') return 'Lapsed';
  if (policy.payStatus === 'Fully paid' || policy.premiumPayableType === 'Fully paid') return 'Fully paid';
  if (policy.policyStatus === 'Matured' || policy.policyStatus === 'Cancelled') return 'Expired / Ended';
  return policy.policyStatus || 'Active';
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

function textValue(value) {
  return value || '-';
}
