import { RotateCcw } from 'lucide-react';
import { formatCurrency } from '../utils/projections.js';

export function AnnualReview({
  previousReviewData,
  comparison,
  changes,
  clearPreviousReviewData,
}) {
  return (
    <section className="panel review-panel">
      <div className="section-header">
        <div>
          <h2>Annual Review</h2>
          <p className="section-subtext">Previous review comparisons are restored from full client data imports when available.</p>
        </div>
        <div className="review-actions">
          {previousReviewData && (
            <button className="ghost-button data-action-button subtle" type="button" onClick={clearPreviousReviewData}>
              <RotateCcw size={16} />
              Clear Previous Review Data
            </button>
          )}
        </div>
      </div>

      {!comparison ? (
        <p className="empty-events">No previous review loaded yet.</p>
      ) : (
        <>
          <div className="review-date-row">
            <span>Last review: <strong>{formatDate(comparison.previousDate)}</strong></span>
            <span>Current review: <strong>{formatDate(comparison.currentDate)}</strong></span>
          </div>
          <div className="review-grid">
            <ReviewMetric
              label="Projected retirement amount"
              previous={comparison.previousProjectedAmount}
              current={comparison.currentProjectedAmount}
              difference={comparison.projectedAmountDifference}
            />
            <ReviewMetric
              label="Retirement gap"
              previous={comparison.previousGap}
              current={comparison.currentGap}
              difference={comparison.gapDifference}
            />
            <ReviewMetric
              label="Projected monthly retirement income"
              previous={comparison.previousMonthlyIncome}
              current={comparison.currentMonthlyIncome}
              difference={comparison.monthlyIncomeDifference}
              suffix="/month"
            />
          </div>
          <div className="review-status">
            <strong>{comparison.status}</strong>
            <div>
              {comparison.statusItems.map((item) => <span key={item}>{item}</span>)}
            </div>
          </div>
        </>
      )}

      {comparison && (
        <section className="changed-review-section">
          <h3>What Changed Since Last Review</h3>
          {changes.length === 0 ? (
            <p className="empty-events">No major changes detected since the previous review.</p>
          ) : (
            <div className="change-groups">
              {Object.entries(groupChanges(changes)).map(([group, items]) => (
                <div className="change-group" key={group}>
                  <strong>{group}</strong>
                  <ul>
                    {items.slice(0, 6).map((item) => (
                      <li className={item.tone} key={item.text}>{item.text}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

function ReviewMetric({ label, previous, current, difference, suffix = '' }) {
  return (
    <div className="review-metric">
      <span>{label}</span>
      <dl>
        <div><dt>Previous</dt><dd>{formatCurrency(previous)}{suffix}</dd></div>
        <div><dt>Current</dt><dd>{formatCurrency(current)}{suffix}</dd></div>
        <div><dt>Progress</dt><dd className={difference >= 0 ? 'positive' : 'negative'}>{difference >= 0 ? '+' : ''}{formatCurrency(difference)}{suffix}</dd></div>
      </dl>
    </div>
  );
}

function groupChanges(changes) {
  return changes.reduce((groups, item) => {
    groups[item.group] = groups[item.group] ? [...groups[item.group], item] : [item];
    return groups;
  }, {});
}

function formatDate(value) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString('en-SG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
