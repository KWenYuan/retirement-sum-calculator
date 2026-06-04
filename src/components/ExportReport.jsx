import {
  calculateCpfAge55Transfer,
  formatCurrency,
  getInvestmentStructure,
  getPolicyStructure,
  getCpfAge55ExcessTreatment,
  hasCpfFrsMilestoneData,
  hasCpfProjectionData,
  projectCash,
  projectInvestmentAccumulatedAtAge,
  projectPolicyAccumulatedAtAge,
  projectSrs,
  isCashIncludedInProjection,
} from '../utils/projections.js';
import { formatPolicyCurrencyWithLabel } from '../utils/policySummary.js';

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function ExportReport({
  refNode,
  profile,
  cpf,
  srs,
  policies,
  investments,
  cash,
  scenarioRate,
  retirementPoint,
  needs,
  retirementTimeline,
  incomeSources,
  annualReviewComparison,
  reviewChanges = [],
  followUpTasks = [],
  includeFollowUpTasksInPdf = false,
  advisorInsight,
  disclaimer,
  exportDate,
  policyCashValueAssets = [],
}) {
  const includeCash = isCashIncludedInProjection(cash);
  const includeCpf = hasCpfProjectionData(cpf);
  const includeCpf55 = hasCpfFrsMilestoneData(cpf);
  const currentAssets = calculateCurrentAssets({ cpf, srs, policies, investments, cash, policyCashValueAssets });
  const assetBreakdown = [
    ...(includeCpf ? [['CPF', retirementPoint.cpf]] : []),
    ['SRS', retirementPoint.srs],
    ['Policy cash values', retirementPoint.policies],
    ['Personal investments', retirementPoint.investments],
    ...(includeCash ? [['Cash / savings', retirementPoint.cash]] : []),
    ['Total projected retirement amount', retirementPoint.total],
  ];
  const timelineRows = buildMilestoneRows({
    retirementTimeline,
  });
  const cpf55 = includeCpf55 ? calculateCpfAge55Transfer(cpf, profile) : null;
  const cpfAge55Treatment = getCpfAge55ExcessTreatment(cpf);
  const srsSummary = buildSrsSummary(profile, srs);
  const personalInvestmentRows = investments.map((investment) => {
    const structure = getInvestmentStructure(investment, asNumber(profile.retirementAge), asNumber(profile.retirementDuration));
    const value = projectInvestmentAccumulatedAtAge(
      investment,
      asNumber(profile.currentAge),
      structure.withdrawalStartAge,
      scenarioRate,
    );
    return [
      investment.name || 'Investment',
      investment.includeInTotal ? 'Included' : 'Excluded',
      buildInvestmentWithdrawalLabel(structure, value),
      structure.withdrawalStartAge,
      formatCurrency(value),
    ];
  });
  const cashProjectedValue = projectCash(cash, Math.max(0, asNumber(profile.retirementAge) - asNumber(profile.currentAge)));

  return (
    <article className="export-report pdf-export-root retirement-export-report" ref={refNode}>
      <header className="export-cover avoid-break">
        <div className="export-cover-content">
          <div>
            <p>Retirement Summary Report</p>
            <h1>{profile.clientName || 'Client'}</h1>
            <div className="export-meta">
              <span>Prepared for: {profile.clientName || 'Client'}</span>
              <span>Current age: {profile.currentAge}</span>
              <span>Target retirement age: {profile.retirementAge}</span>
              <span>Prepared on: {exportDate}</span>
            </div>
          </div>
          <img className="export-logo pdf-report-logo" src="/logo.png" alt="Advisor logo" />
        </div>
      </header>

      <section className="export-section avoid-break">
        <h2>Key Assumptions</h2>
        <div className="export-summary-grid">
          <SummaryBox label="Current age" value={profile.currentAge} />
          <SummaryBox label="Retirement age" value={profile.retirementAge} />
          <SummaryBox label="Desired monthly income" value={formatCurrency(profile.desiredMonthlyIncome)} />
          <SummaryBox label="Inflation rate" value={`${profile.inflationRate}%`} />
          <SummaryBox label="Retirement duration" value={`${profile.retirementDuration} years`} />
          <SummaryBox label="Withdrawal rate" value={`${profile.withdrawalRate}%`} />
        </div>
      </section>

      <section className="export-section avoid-break">
        <h2>Projected Retirement Position</h2>
        <div className="export-kpi-grid">
          <SummaryBox label="Projected retirement amount" value={formatCurrency(retirementPoint.total)} />
          <SummaryBox label="Required retirement amount" value={formatCurrency(needs.requiredAmount)} />
          <SummaryBox label="Surplus / shortfall" value={formatCurrency(needs.surplusShortfall)} />
          <SummaryBox label="Monthly investment to close gap" value={formatCurrency(needs.monthlyNeeded)} />
        </div>
        <div className="export-disclaimer-card">
          <h3>Disclaimer / Notes</h3>
          <p>{disclaimer}</p>
        </div>
      </section>

      <section className="export-section page-break">
        <h2>Current Assets Today</h2>
        <SimpleTable
          headers={['Asset Category', 'Current Value', 'Notes']}
          rows={currentAssets.rows}
          emptyMessage="No current assets entered."
        />
      </section>

      <section className="export-section avoid-break">
        <h2>Asset Breakdown at Retirement</h2>
        <SimpleTable
          headers={['Asset type', 'Projected value']}
          rows={assetBreakdown.map(([label, value]) => [label, formatCurrency(value)])}
        />
      </section>

      <section className="export-section avoid-break">
        <h2>Retirement Income Sources</h2>
        <div className="export-kpi-grid">
          <SummaryBox label="Required monthly income" value={`${formatCurrency(incomeSources.requiredMonthlyIncome)}/month`} />
          <SummaryBox label="Projected monthly income" value={`${formatCurrency(incomeSources.totalMonthlyIncome)}/month`} />
          <SummaryBox label="Monthly surplus / shortfall" value={`${formatCurrency(incomeSources.surplusShortfall)}/month`} />
        </div>
        <SimpleTable
          headers={['Source', 'Monthly income', 'Percentage']}
          rows={incomeSources.sources.map((item) => [
            item.source,
            `${formatCurrency(item.monthlyIncome)}/month`,
            `${Math.round(item.percentage)}%`,
          ])}
          emptyMessage="No active income streams at selected age."
        />
      </section>

      {includeCpf55 && (
        <section className="export-section avoid-break">
          <h2>CPF Age 55 Transfer</h2>
          <SimpleTable
            headers={['Item', 'Estimate']}
            rows={[
              ['Client turns 55 in', cpf55.yearTurning55],
              ['Retirement sum type used', cpf55.retirementSumType],
              ['Estimated BRS', formatCurrency(cpf55.brs)],
              ['Estimated FRS', formatCurrency(cpf55.frs)],
              ['Estimated ERS', formatCurrency(cpf55.ers)],
              ['Selected retirement sum assumption', cpf55.retirementSumType],
              ['Selected retirement sum amount', formatCurrency(cpf55.retirementSumAmount)],
              ['Projected OA at age 55', formatCurrency(cpf55.projectedOa)],
              ['Projected SA at age 55', formatCurrency(cpf55.projectedSa)],
              ['Projected OA + SA at age 55', formatCurrency(cpf55.projectedOaSa)],
              ['Estimated RA set aside', formatCurrency(cpf55.raSetAside)],
              ['Estimated withdrawable amount', formatCurrency(cpf55.withdrawableAmount)],
              ['CPF age 55 excess assumption', cpfAge55Treatment === 'withdrawToCash' ? 'Withdraw to Cash / Savings' : 'Keep in CPF OA'],
              [cpf55.shortfall > 0 ? 'Estimated shortfall' : 'Estimated excess', formatCurrency(cpf55.shortfall || cpf55.excess)],
            ]}
          />
        </section>
      )}

      {srs.enabled && (
        <section className="export-section avoid-break">
          <h2>SRS Withdrawal Summary</h2>
          <SimpleTable
            headers={['Start age', 'Duration', 'Projected value', 'Estimated withdrawal']}
            rows={[[
              srsSummary.startAge,
              `${srsSummary.duration} years`,
              formatCurrency(srsSummary.projectedValue),
              `${formatCurrency(srsSummary.annualWithdrawal)}/year or ${formatCurrency(srsSummary.monthlyWithdrawal)}/month`,
            ]]}
          />
        </section>
      )}

      <section className="export-section page-break">
        <h2>Retirement Timeline</h2>
        <RetirementTimelinePdfVisual timeline={retirementTimeline} />
        <h3 className="export-subheading">Timeline Summary Table</h3>
        <SimpleTable headers={['Age', 'Type', 'Event', 'Amount / Income', 'Duration']} rows={timelineRows} />
      </section>

      {policies.length > 0 && (
        <section className="export-section avoid-break">
          <h2>Policy Maturity / Withdrawal Milestones</h2>
          <SimpleTable
            headers={['Policy', 'Structure', 'Premium commitment', 'Premium period', 'Compounding period after premium', 'Withdrawal strategy', 'Projected value']}
            rows={policies.map((policy) => {
              const structure = getPolicyStructure(policy, asNumber(profile.retirementAge));
              const projectedValue = projectPolicyAccumulatedAtAge(policy, asNumber(profile.currentAge), structure.withdrawalStartAge, scenarioRate);
              return [
                policy.name || 'Policy',
                policy.policyStructure || 'Custom',
                policy.continuePremiumsAfterCommitment
                  ? `${formatCurrency(policy.premiumAmount)}/${policy.premiumFrequency || 'month'} until age ${structure.premiumEndAge}`
                  : `${formatCurrency(policy.premiumAmount)}/${policy.premiumFrequency || 'month'} for ${structure.premiumCommitmentTerm} years`,
                `Age ${structure.startAge}-${structure.premiumEndAge}`,
                structure.withdrawalStartAge > structure.premiumEndAge ? `Age ${structure.premiumEndAge}-${structure.withdrawalStartAge}` : '0 years',
                buildPolicyWithdrawalLabel(structure),
                formatCurrency(projectedValue),
              ];
            })}
          />
        </section>
      )}

      <section className="export-section avoid-break">
        <h2>Personal Investment Summary</h2>
        <SimpleTable
          headers={['Investment', 'Projection', 'Withdrawal strategy', 'Start age', 'Projected value']}
          rows={personalInvestmentRows}
          emptyMessage="No personal investments entered."
        />
      </section>

      {includeCash ? (
        <section className="export-section avoid-break">
          <h2>Cash / Savings Summary</h2>
          <SimpleTable
            headers={['Item', 'Estimate']}
            rows={[
              ['Projected accessible cash / savings at retirement age', formatCurrency(cashProjectedValue)],
              ['Emergency fund included', cash.includeEmergencyFund ? 'Yes' : 'No'],
            ]}
          />
        </section>
      ) : (
        <section className="export-section avoid-break">
          <h2>Cash / Savings</h2>
          <p className="export-note">Cash / Savings excluded from projection.</p>
        </section>
      )}

      <section className="export-section avoid-break">
        <h2>Advisor Insight</h2>
        <p className="export-note">{advisorInsight || 'No advisor insight entered.'}</p>
      </section>

      {annualReviewComparison && (
        <section className="export-section avoid-break">
          <h2>Annual Review Comparison</h2>
          <SimpleTable
            headers={['Item', 'Previous', 'Current', 'Difference']}
            rows={[
              [
                'Projected retirement amount',
                formatCurrency(annualReviewComparison.previousProjectedAmount),
                formatCurrency(annualReviewComparison.currentProjectedAmount),
                formatCurrency(annualReviewComparison.projectedAmountDifference),
              ],
              [
                'Retirement gap',
                formatCurrency(annualReviewComparison.previousGap),
                formatCurrency(annualReviewComparison.currentGap),
                formatCurrency(annualReviewComparison.gapDifference),
              ],
              [
                'Projected monthly income',
                `${formatCurrency(annualReviewComparison.previousMonthlyIncome)}/month`,
                `${formatCurrency(annualReviewComparison.currentMonthlyIncome)}/month`,
                `${formatCurrency(annualReviewComparison.monthlyIncomeDifference)}/month`,
              ],
            ]}
          />
          <p className="export-note">Status: {annualReviewComparison.status}. {annualReviewComparison.statusItems.join('. ')}.</p>
        </section>
      )}

      {annualReviewComparison && (
        <section className="export-section avoid-break">
          <h2>What Changed Since Last Review</h2>
          {reviewChanges.length === 0 ? (
            <p className="export-note">No major changes detected since the previous review.</p>
          ) : (
            <SimpleTable
              headers={['Area', 'Change']}
              rows={reviewChanges.slice(0, 18).map((item) => [item.group, item.text])}
            />
          )}
        </section>
      )}

      {includeFollowUpTasksInPdf && (
        <section className="export-section avoid-break">
          <h2>Follow-Up Actions</h2>
          <SimpleTable
            headers={['Task', 'Category', 'Due date', 'Status']}
            rows={followUpTasks.map((task) => [
              task.name || 'Follow-up task',
              task.category || 'Other',
              task.dueDate || 'Not set',
              task.status || 'Not started',
            ])}
            emptyMessage="No follow-up tasks entered."
          />
        </section>
      )}
    </article>
  );
}

function SummaryBox({ label, value }) {
  return (
    <div className="export-summary-box">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SimpleTable({ headers, rows, emptyMessage = 'No records entered.' }) {
  return (
    <table className="export-table">
      <thead>
        <tr>
          {headers.map((header) => <th key={header}>{header}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={headers.length}>{emptyMessage}</td>
          </tr>
        ) : rows.map((row, index) => (
          <tr className={String(row[0]).startsWith('Total Current Assets Today') ? 'export-total-row' : ''} key={`${row.join('-')}-${index}`}>
            {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RetirementTimelinePdfVisual({ timeline }) {
  const span = Math.max(1, timeline.endAge - timeline.startAge);
  const ageToPercent = (age) => `${Math.min(100, Math.max(0, ((age - timeline.startAge) / span) * 100))}%`;
  const visibleAgeGroups = Object.entries(timeline.lumpSumsByAge || {}).sort(([a], [b]) => Number(a) - Number(b));
  const topStreamRows = assignTimelineStreamRows(
    (timeline.incomeStreams || []).filter((stream) => isUpperTimelineStream(stream)),
    span,
  );
  const bottomStreamRows = assignTimelineStreamRows(
    (timeline.incomeStreams || []).filter((stream) => !isUpperTimelineStream(stream)),
    span,
  );
  const topLaneCount = Math.max(1, topStreamRows.length);
  const bottomLaneCount = Math.max(1, bottomStreamRows.length);
  const showCashLegend = hasTimelineCategory(timeline, 'cash');
  const showCpfLegend = hasTimelineCategory(timeline, 'cpf');
  const showSrsLegend = hasTimelineCategory(timeline, 'srs');

  if (visibleAgeGroups.length === 0 && (timeline.incomeStreams || []).length === 0) {
    return <p className="export-note">No retirement timeline events entered.</p>;
  }

  return (
    <div
      className="export-timeline-print simple-retirement-timeline"
      style={{
        '--top-stream-rows': topLaneCount,
        '--bottom-stream-rows': bottomLaneCount,
      }}
    >
      <div className="export-timeline-print-header">
        <p>One line showing lump sums, income starts, and important retirement ages.</p>
        <TimelinePrintLegend showCash={showCashLegend} showCpf={showCpfLegend} showSrs={showSrsLegend} />
      </div>

      <div className="single-timeline" aria-label="Retirement timeline PDF visual">
        <div className="milestone-guide-layer" aria-hidden="true">
          {visibleAgeGroups.map(([age]) => (
            <span
              key={`pdf-guide-${age}`}
              className="milestone-guide"
              style={{ left: ageToPercent(Number(age)) }}
            />
          ))}
        </div>

        <div className="timeline-tooltip-layer">
          {visibleAgeGroups.map(([age, events]) => {
            const position = ((Number(age) - timeline.startAge) / span) * 100;
            const edgeClass = position < 8 ? 'edge-left' : position > 92 ? 'edge-right' : '';
            const startingStreams = getStartingTimelineStreams(timeline.incomeStreams || [], Number(age));
            const lumpEvents = events.filter((event) => event.countsAsLumpSum !== false);
            const lumpTotal = lumpEvents.reduce((total, event) => total + asNumber(event.amount), 0);
            return (
              <div
                key={`pdf-card-${age}`}
                className={`lump-tooltip ${edgeClass} ${getTimelineCategoryClass(events[0]?.category)}`}
                style={{ left: ageToPercent(Number(age)) }}
              >
                <span className="lump-card">
                  <b>Age {age}</b>
                  <small>{lumpEvents.length > 0 ? `${lumpEvents.length} lump sum ${lumpEvents.length === 1 ? 'event' : 'events'}` : `${events.length} milestone ${events.length === 1 ? 'event' : 'events'}`}</small>
                  {startingStreams.length > 0 && <small>{startingStreams.length} income {startingStreams.length === 1 ? 'stream' : 'streams'}</small>}
                  <strong>Total: {formatCurrency(lumpTotal)}</strong>
                </span>
              </div>
            );
          })}
        </div>

        <div className="timeline-income-layer timeline-income-layer-top">
          {topStreamRows.map((row, rowIndex) => (
            <div className="income-lane-row" key={`pdf-top-row-${rowIndex}`}>
              {row.map((stream) => (
                <TimelinePrintStream
                  key={stream.id}
                  stream={stream}
                  placement="top"
                  rowIndex={rowIndex}
                  rowCount={topLaneCount}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="single-timeline-axis">
          {(timeline.ticks || []).map((age) => (
            <span
              key={`pdf-age-${age}`}
              className="single-age-marker"
              style={{ left: ageToPercent(age) }}
            >
              <span />
              <b>{age}</b>
            </span>
          ))}

          {visibleAgeGroups.map(([age, events], index) => {
            const position = ((Number(age) - timeline.startAge) / span) * 100;
            const edgeClass = position < 8 ? 'edge-left' : position > 92 ? 'edge-right' : '';
            return (
              <span
                key={`pdf-dot-${age}`}
                className={`lump-group stack-${index % 2} ${edgeClass} ${getTimelineCategoryClass(events[0]?.category)}`}
                style={{ left: ageToPercent(Number(age)) }}
              >
                <span className="lump-dot" />
              </span>
            );
          })}
        </div>

        <div className="timeline-income-layer timeline-income-layer-bottom">
          {bottomStreamRows.map((row, rowIndex) => (
            <div className="income-lane-row" key={`pdf-bottom-row-${rowIndex}`}>
              {row.map((stream) => (
                <TimelinePrintStream
                  key={stream.id}
                  stream={stream}
                  placement="bottom"
                  rowIndex={rowIndex}
                  rowCount={bottomLaneCount}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelinePrintLegend({ showCash, showCpf, showSrs }) {
  return (
    <div className="timeline-legend" aria-label="Timeline legend">
      <span><i className="legend-dot legend-lump" /> Lump Sum</span>
      <span><i className="legend-line legend-income" /> Income Stream</span>
      {showCpf && <span><i className="legend-dot category-cpf" /> CPF</span>}
      {showSrs && <span><i className="legend-dot category-srs" /> SRS</span>}
      <span><i className="legend-dot category-policy" /> Policy</span>
      <span><i className="legend-dot category-investment" /> Investment</span>
      {showCash && <span><i className="legend-dot category-cash" /> Cash / Savings</span>}
    </div>
  );
}

function TimelinePrintStream({ stream, placement, rowIndex, rowCount }) {
  const connectorHeight = placement === 'top'
    ? (rowCount - rowIndex - 1) * 58 + 74
    : rowIndex * 58 + 48;

  return (
    <div
      className={`income-bracket income-bracket-${placement} ${getTimelineCategoryClass(stream.category)}`}
      style={{
        left: stream.left,
        width: stream.width,
        '--stream-connector-height': `${connectorHeight}px`,
        '--stream-connector-top': placement === 'top' ? '0px' : `-${connectorHeight}px`,
      }}
    >
      <span className="income-start-marker" />
      <span className="income-label">
        <span className="income-title">{stream.title}</span>
        <small className="income-subtitle">{stream.startAge}-{stream.endAge} | {stream.duration}</small>
      </span>
    </div>
  );
}

function calculateCurrentAssets({ cpf, srs, policies, investments, cash, policyCashValueAssets = [] }) {
  const rows = [];
  let total = 0;

  if (hasCpfProjectionData(cpf)) {
    const oa = asNumber(cpf.oaBalance);
    const sa = asNumber(cpf.saBalance);
    const ma = asNumber(cpf.maBalance);
    const cpfTotal = oa + sa + ma;
    rows.push(['CPF OA', formatCurrency(oa), 'Included']);
    rows.push(['CPF SA', formatCurrency(sa), 'Included']);
    rows.push(['CPF MA', formatCurrency(ma), 'Included']);
    rows.push(['Total CPF', formatCurrency(cpfTotal), 'CPF balances entered']);
    total += cpfTotal;
  }

  if (srs.enabled && asNumber(srs.currentBalance) > 0) {
    const srsValue = asNumber(srs.currentBalance);
    rows.push(['SRS', formatCurrency(srsValue), 'Included']);
    total += srsValue;
  }

  policies.forEach((policy) => {
    const value = asNumber(policy.currentValue);
    rows.push([policy.name || 'Policy', formatCurrency(value), 'Policy value']);
    total += value;
  });

  const totalPolicyValue = policies.reduce((sum, policy) => sum + asNumber(policy.currentValue), 0);
  if (policies.length > 0) rows.push(['Total current policy value', formatCurrency(totalPolicyValue), 'Policy values entered']);

  if (policyCashValueAssets.length > 0) {
    rows.push(['Policy Cash Values Included', 'Selected policy cash values', 'Only selected policy cash values are included in this retirement projection.']);
    policyCashValueAssets.forEach((asset) => {
      const isSgd = String(asset.currency || 'SGD').toUpperCase() === 'SGD';
      rows.push([
        `${asset.name || asset.planName || 'Policy'}${asset.company ? ` (${asset.company})` : ''}`,
        formatPolicyCurrencyWithLabel(asset.cashValue, asset.currency),
        isSgd ? 'Included from Policy Summary' : 'Shown separately; not combined without FX conversion',
      ]);
      if (isSgd) total += asNumber(asset.cashValue);
    });
  }

  investments.forEach((investment) => {
    const value = asNumber(investment.currentValue);
    rows.push([investment.name || 'Investment', formatCurrency(value), 'Investment value']);
    total += value;
  });

  const totalInvestmentValue = investments.reduce((sum, investment) => sum + asNumber(investment.currentValue), 0);
  if (investments.length > 0) rows.push(['Total current investment value', formatCurrency(totalInvestmentValue), 'Investment values entered']);

  const cashValue = asNumber(cash.currentSavings);
  if (cashValue > 0 || isCashIncludedInProjection(cash)) {
    rows.push([
      'Cash / Savings',
      formatCurrency(cashValue),
      isCashIncludedInProjection(cash) ? 'Included' : 'Excluded from retirement projection',
    ]);
    total += cashValue;
  }

  rows.push(['Total Current Assets Today', formatCurrency(total), 'Current values entered']);
  return { rows, total };
}

function buildSrsSummary(profile, srs) {
  const startAge = asNumber(srs.withdrawalStartAge) || asNumber(srs.withdrawalAge);
  const duration = Math.max(1, asNumber(srs.withdrawalDurationYears) || 1);
  const projectedValue = projectSrs(srs, asNumber(profile.currentAge), startAge);
  const annualWithdrawal = projectedValue / duration;
  return {
    startAge,
    duration,
    projectedValue,
    annualWithdrawal,
    monthlyWithdrawal: annualWithdrawal / 12,
  };
}

function buildMilestoneRows({ retirementTimeline }) {
  return retirementTimeline.exportRows.map((row) => [
    row.age,
    row.type,
    row.event,
    row.amountIncome,
    row.duration,
  ]);
}

function buildPolicyWithdrawalLabel(structure) {
  if (structure.withdrawalType === 'Keep invested / no withdrawal yet') return 'Keep invested / no withdrawal yet';
  if (structure.withdrawalType === 'Monthly income' || structure.withdrawalType === 'Yearly income') {
    return `${structure.withdrawalType}, age ${structure.withdrawalStartAge}-${structure.withdrawalEndAge}`;
  }
  return `Lump sum at age ${structure.withdrawalStartAge}`;
}

function buildInvestmentWithdrawalLabel(structure, projectedValue) {
  if (structure.withdrawalType === 'Keep invested / no withdrawal') return 'Keep invested / no withdrawal';
  if (structure.withdrawalType === 'Monthly income') {
    return `${formatCurrency(projectedValue / (structure.withdrawalDuration * 12))}/month, age ${structure.withdrawalStartAge}-${structure.withdrawalEndAge}`;
  }
  if (structure.withdrawalType === 'Yearly income') {
    return `${formatCurrency(projectedValue / structure.withdrawalDuration)}/year, age ${structure.withdrawalStartAge}-${structure.withdrawalEndAge}`;
  }
  return `Lump sum at age ${structure.withdrawalStartAge}`;
}

function getStartingTimelineStreams(streams, age) {
  return streams.filter((stream) => Math.round(stream.startAge) === Math.round(age));
}

function getTimelineCategoryClass(category = '') {
  const normalized = category.toLowerCase();
  if (normalized.includes('cpf')) return 'category-cpf';
  if (normalized.includes('srs')) return 'category-srs';
  if (normalized.includes('policy')) return 'category-policy';
  if (normalized.includes('investment')) return 'category-investment';
  if (normalized.includes('cash')) return 'category-cash';
  return 'category-lump';
}

function isUpperTimelineStream(stream) {
  const category = (stream.category || '').toLowerCase();
  const title = (stream.title || '').toLowerCase();
  return category.includes('srs') || title.includes('srs');
}

function hasTimelineCategory(timeline, category) {
  const normalized = category.toLowerCase();
  return [...(timeline.milestones || []), ...(timeline.incomeStreams || [])]
    .some((item) => (item.category || '').toLowerCase().includes(normalized));
}

function assignTimelineStreamRows(streams, span) {
  const labelPadding = Math.max(2, span * 0.08);
  const sortedStreams = [...streams].sort((a, b) => a.startAge - b.startAge || a.endAge - b.endAge);
  const rows = [];

  sortedStreams.forEach((stream) => {
    const candidate = {
      ...stream,
      collisionStart: stream.startAge - labelPadding,
      collisionEnd: stream.endAge + labelPadding,
    };
    const row = rows.find((existingRow) => existingRow.every((item) => (
      candidate.collisionEnd < item.collisionStart || candidate.collisionStart > item.collisionEnd
    )));

    if (row) {
      row.push(candidate);
    } else {
      rows.push([candidate]);
    }
  });

  return rows;
}
