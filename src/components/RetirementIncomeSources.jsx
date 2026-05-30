import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { getIncomeSourceColor } from '../utils/chartColors.js';
import { formatCurrency } from '../utils/projections.js';

export function RetirementIncomeSources({ incomeSources }) {
  return (
    <section className="panel income-sources-panel">
      <div className="section-header">
        <div>
          <h2>Retirement Income Sources</h2>
          <p className="section-subtext">Monthly income streams active at age {incomeSources.age}.</p>
        </div>
        <div className={incomeSources.surplusShortfall >= 0 ? 'income-status positive' : 'income-status negative'}>
          {incomeSources.surplusShortfall >= 0 ? 'Monthly surplus' : 'Monthly shortfall'}
          <strong>{formatCurrency(Math.abs(incomeSources.surplusShortfall))}/month</strong>
        </div>
      </div>

      <div className="income-source-layout">
        <div className="income-source-kpis">
          <div>
            <span>Total Projected Monthly Income</span>
            <strong>{formatCurrency(incomeSources.totalMonthlyIncome)}/month</strong>
          </div>
          <div>
            <span>Desired Income at Age {incomeSources.age}</span>
            <strong>{formatCurrency(incomeSources.requiredMonthlyIncome)}/month</strong>
          </div>
          <div>
            <span>Today’s Value Equivalent</span>
            <strong>{formatCurrency(incomeSources.todayValueEquivalent)}/month</strong>
          </div>
        </div>

        <div className="income-chart">
          {incomeSources.sources.length === 0 ? (
            <p className="empty-events">No active monthly or yearly income streams at this age.</p>
          ) : (
            <ResponsiveContainer>
              <PieChart>
                <Pie data={incomeSources.sources} dataKey="monthlyIncome" nameKey="source" innerRadius={58} outerRadius={88} paddingAngle={3}>
                  {incomeSources.sources.map((entry, index) => (
                    <Cell key={entry.source} fill={getIncomeSourceColor(entry.source, index)} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${formatCurrency(value)}/month`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="income-source-table">
        {incomeSources.sources.map((item, index) => (
          <div key={item.source}>
            <span style={{ background: getIncomeSourceColor(item.source, index) }} />
            <p>{item.source}</p>
            <strong>{formatCurrency(item.monthlyIncome)}/month</strong>
            <em>{Math.round(item.percentage)}%</em>
          </div>
        ))}
      </div>
    </section>
  );
}
