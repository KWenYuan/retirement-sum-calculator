import {
  calculateCpfAge55Transfer,
  formatCurrency,
  getPolicyStructure,
  hasCpfFrsMilestoneData,
  hasCpfProjectionData,
  projectCash,
  projectInvestment,
  projectPolicy,
  projectSrs,
  isCashIncludedInProjection,
} from '../utils/projections.js';

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function ExportReport({
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
}) {
  const includeCash = isCashIncludedInProjection(cash);
  const includeCpf = hasCpfProjectionData(cpf);
  const includeCpf55 = hasCpfFrsMilestoneData(cpf);
  const currentAssets = calculateCurrentAssets({ cpf, srs, policies, investments, cash });
  const assetBreakdown = [
    ...(includeCpf ? [['CPF', retirementPoint.cpf]] : []),
    ['SRS', retirementPoint.srs],
    ['Investment policies', retirementPoint.policies],
    ['Personal investments', retirementPoint.investments],
    ...(includeCash ? [['Cash / savings', retirementPoint.cash]] : []),
    ['Total projected retirement amount', retirementPoint.total],
  ];
  const timelineRows = buildMilestoneRows({
    retirementTimeline,
  });
  const timelineVisualRows = timelineRows.slice(0, 8);
  const cpf55 = includeCpf55 ? calculateCpfAge55Transfer(cpf, profile) : null;
  const srsSummary = buildSrsSummary(profile, srs);
  const personalInvestmentRows = investments.map((investment) => {
    const withdrawalAge = asNumber(investment.plannedWithdrawalAge) || asNumber(profile.retirementAge);
    const value = projectInvestment(
      investment,
      Math.max(0, withdrawalAge - asNumber(profile.currentAge)),
      scenarioRate,
    );
    return [
      investment.name || 'Investment',
      investment.riskLevel,
      investment.withdrawalType || 'Lump sum',
      withdrawalAge,
      formatCurrency(value),
    ];
  });
  const cashWithdrawalAge = asNumber(cash.plannedWithdrawalAge) || asNumber(profile.retirementAge);
  const cashProjectedValue = projectCash(cash, Math.max(0, cashWithdrawalAge - asNumber(profile.currentAge)));

  return (
    <article className="export-report">
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
          <img className="export-logo" src="/logo.png" alt="Advisor logo" />
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
        <h2>Current Assets Today</h2>
        <SimpleTable
          headers={['Asset Category', 'Current Value', 'Notes']}
          rows={currentAssets.rows}
          emptyMessage="No current assets entered."
        />
      </section>

      <section className="export-section avoid-break">
        <h2>Projected Retirement Position</h2>
        <div className="export-kpi-grid">
          <SummaryBox label="Projected retirement amount" value={formatCurrency(retirementPoint.total)} />
          <SummaryBox label="Required retirement amount" value={formatCurrency(needs.requiredAmount)} />
          <SummaryBox label="Surplus / shortfall" value={formatCurrency(needs.surplusShortfall)} />
          <SummaryBox label="Monthly investment to close gap" value={formatCurrency(needs.monthlyNeeded)} />
        </div>
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
        <div className="export-timeline-visual">
          {timelineVisualRows.length === 0 ? (
            <p className="export-note">No retirement timeline events entered.</p>
          ) : timelineVisualRows.map(([age, type, event, amountIncome, duration], index) => (
            <div className={`export-timeline-item ${type.toLowerCase().includes('income') ? 'income' : 'lump'}`} key={`${age}-${event}-${index}`}>
              <span>Age {age}</span>
              <strong>{event}</strong>
              <small>{amountIncome} | {duration}</small>
            </div>
          ))}
        </div>
        <h3 className="export-subheading">Timeline Summary Table</h3>
        <SimpleTable headers={['Age', 'Type', 'Event', 'Amount / Income', 'Duration']} rows={timelineRows} />
      </section>

      <section className="export-section avoid-break">
        <h2>Policy Maturity / Withdrawal Milestones</h2>
        <SimpleTable
          headers={['Policy', 'Premium commitment', 'Premium period', 'Holding until', 'Withdrawal strategy', 'Projected value']}
          rows={policies.map((policy) => {
            const structure = getPolicyStructure(policy, asNumber(profile.retirementAge));
            const projectedValue = projectPolicy(policy, asNumber(profile.currentAge), structure.withdrawalStartAge || structure.holdingUntilAge, scenarioRate);
            return [
              policy.name || 'Policy',
              policy.continuePremiumsAfterCommitment
                ? `${formatCurrency(policy.premiumAmount)}/${policy.premiumFrequency || 'month'} until age ${structure.premiumEndAge}`
                : `${formatCurrency(policy.premiumAmount)}/${policy.premiumFrequency || 'month'} for ${structure.premiumCommitmentTerm} years`,
              `Age ${structure.startAge}-${structure.premiumEndAge}`,
              `Age ${structure.holdingUntilAge}`,
              buildPolicyWithdrawalLabel(structure),
              formatCurrency(projectedValue),
            ];
          })}
        />
      </section>

      <section className="export-section avoid-break">
        <h2>Personal Investment Summary</h2>
        <SimpleTable
          headers={['Investment', 'Risk level', 'Timeline treatment', 'Start age', 'Projected value']}
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
              ['Available age', cashWithdrawalAge],
              ['Projected accessible cash / savings', formatCurrency(cashProjectedValue)],
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

      <section className="export-section avoid-break">
        <h2>Disclaimer</h2>
        <p className="export-disclaimer">{disclaimer}</p>
      </section>
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

function calculateCurrentAssets({ cpf, srs, policies, investments, cash }) {
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
