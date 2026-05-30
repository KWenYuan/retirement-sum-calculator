import {
  formatCurrency,
  projectCash,
  projectCpfOaSa,
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
  const assetBreakdown = [
    ['CPF', retirementPoint.cpf],
    ['SRS', retirementPoint.srs],
    ['Investment policies', retirementPoint.policies],
    ['Personal investments', retirementPoint.investments],
    ...(includeCash ? [['Cash / savings', retirementPoint.cash]] : []),
    ['Total projected retirement amount', retirementPoint.total],
  ];
  const timelineRows = buildMilestoneRows({
    retirementTimeline,
  });
  const cpf55 = buildCpf55Summary(profile, cpf);
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
        <p>Retirement Projection Summary</p>
        <h1>{profile.clientName || 'Client'}</h1>
        <div className="export-meta">
          <span>Date of export: {exportDate}</span>
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
        <h2>Retirement Outcome</h2>
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

      <section className="export-section avoid-break">
        <h2>CPF 55 Milestone</h2>
        <SimpleTable
          headers={['Item', 'Estimate']}
          rows={[
            ['Projected OA + SA at age 55', formatCurrency(cpf55.oaSa)],
            ['FRS amount set aside', formatCurrency(cpf55.frs)],
            [cpf55.excess >= 0 ? 'Estimated excess withdrawable' : 'Estimated FRS shortfall', formatCurrency(Math.abs(cpf55.excess))],
          ]}
        />
      </section>

      <section className="export-section avoid-break">
        <h2>CPF LIFE Income</h2>
        <SimpleTable
          headers={['Start age', 'Estimated monthly payout']}
          rows={[[cpf.cpfLifePayoutStartAge, formatCurrency(cpf.cpfLifeMonthlyPayout)]]}
        />
      </section>

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
        <h2>Retirement Timeline Summary</h2>
        <SimpleTable headers={['Age', 'Type', 'Event', 'Amount / Income', 'Duration']} rows={timelineRows} />
      </section>

      <section className="export-section avoid-break">
        <h2>Policy Maturity / Withdrawal Milestones</h2>
        <SimpleTable
          headers={['Policy', 'Withdrawal type', 'Start age', 'Available age', 'Projected value']}
          rows={policies.map((policy) => {
            const startAge = asNumber(policy.startAge);
            const premiumEndAge = startAge + asNumber(policy.premiumTermYears);
            const withdrawalType = policy.withdrawalType || 'Lump sum';
            const withdrawalAge = asNumber(policy.withdrawalAge) || premiumEndAge;
            const projectedValue = projectPolicy(policy, asNumber(profile.currentAge), withdrawalAge, scenarioRate);
            return [
              policy.name || 'Policy',
              withdrawalType,
              startAge,
              withdrawalAge,
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
          <tr key={`${row.join('-')}-${index}`}>
            {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function buildCpf55Summary(profile, cpf) {
  const oaSa = projectCpfOaSa(cpf, profile.currentAge, 55);
  const frs = asNumber(cpf.frsAmountAt55);
  return {
    oaSa,
    frs,
    excess: oaSa - frs,
  };
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
