import { CalendarClock, CircleDollarSign } from 'lucide-react';
import { calculatePayoutSummary, formatCurrency } from '../utils/projections.js';

const timelineNote = 'CPF projections, retirement sums, CPF LIFE payouts, policy values, withdrawals and investment returns are simplified estimates for illustration only. Future CPF retirement sums are estimated using an advisor-entered BRS growth assumption. Actual CPF BRS, FRS, ERS, CPF LIFE payouts, CPF rules, policy terms, market returns, fees, withdrawals, taxation and prevailing regulations may differ.';

export function RetirementTimeline({
  timeline,
  selectedAge,
  setSelectedAge,
  ageDetails,
}) {
  const span = Math.max(1, timeline.endAge - timeline.startAge);
  const ageToPercent = (age) => `${Math.min(100, Math.max(0, ((age - timeline.startAge) / span) * 100))}%`;
  const visibleAgeGroups = Object.entries(timeline.lumpSumsByAge || {}).sort(([a], [b]) => Number(a) - Number(b));
  const topStreamRows = assignStreamRows(
    timeline.incomeStreams.filter((stream) => isUpperStream(stream)),
    span,
  );
  const bottomStreamRows = assignStreamRows(
    timeline.incomeStreams.filter((stream) => !isUpperStream(stream)),
    span,
  );
  const showCashLegend = hasCashTimelineItems(timeline);
  const showSrsLegend = hasSrsTimelineItems(timeline);
  const showCpfLegend = hasCpfTimelineItems(timeline);
  const topLaneCount = Math.max(1, topStreamRows.length);
  const bottomLaneCount = Math.max(1, bottomStreamRows.length);
  const payoutSummary = calculatePayoutSummary(ageDetails);

  return (
    <section className="panel retirement-timeline-panel simple-retirement-timeline">
      <div className="section-header">
        <div>
          <h2>Retirement Timeline</h2>
          <p className="section-subtext">One line showing lump sums, income starts, and important retirement ages.</p>
        </div>
        <div className="timeline-header-tools">
          <TimelineLegend showCash={showCashLegend} showSrs={showSrsLegend} showCpf={showCpfLegend} />
          <div className="timeline-selected-age">
            <div className="selected-age-copy">
              <span>Selected age</span>
              <strong>{selectedAge}</strong>
            </div>
            <img className="selected-age-logo" src="/logo.png" alt="Advisor logo" />
          </div>
        </div>
      </div>

      <div
        className="single-timeline"
        aria-label="Retirement timeline"
        style={{
          '--top-stream-rows': topLaneCount,
          '--bottom-stream-rows': bottomLaneCount,
        }}
      >
        <div className="milestone-guide-layer" aria-hidden="true">
          {visibleAgeGroups.map(([age]) => (
            <span
              key={`guide-${age}`}
              className="milestone-guide"
              style={{ left: ageToPercent(Number(age)) }}
            />
          ))}
        </div>

        <div className="timeline-tooltip-layer">
          {visibleAgeGroups.map(([age, events]) => {
            const position = ((Number(age) - timeline.startAge) / span) * 100;
            const edgeClass = position < 8 ? 'edge-left' : position > 92 ? 'edge-right' : '';
            const startingStreams = getStartingStreams(timeline.incomeStreams, Number(age));
            const lumpEvents = events.filter((event) => event.countsAsLumpSum !== false);
            const lumpTotal = lumpEvents.reduce((total, event) => total + event.amount, 0);
            const categoryClass = getCategoryClass(events[0]?.category);
            return (
              <button
                type="button"
                key={`tooltip-${age}`}
                className={`lump-tooltip ${edgeClass} ${categoryClass}`}
                style={{ left: ageToPercent(Number(age)) }}
                onClick={() => setSelectedAge(Number(age))}
              >
                <span className="lump-card">
                  <b>Age {age}</b>
                  <small>{lumpEvents.length > 0 ? `${lumpEvents.length} lump sum ${lumpEvents.length === 1 ? 'event' : 'events'}` : `${events.length} milestone ${events.length === 1 ? 'event' : 'events'}`}</small>
                  {startingStreams.length > 0 && (
                    <small>{startingStreams.length} income {startingStreams.length === 1 ? 'stream' : 'streams'}</small>
                  )}
                  <strong>Total: {formatCurrency(lumpTotal)}</strong>
                  <em>Click for details</em>
                </span>
              </button>
            );
          })}
        </div>

        <div className="timeline-income-layer timeline-income-layer-top">
          {topStreamRows.map((row, rowIndex) => (
            <div className="income-lane-row" key={`top-row-${rowIndex}`}>
              {row.map((stream) => (
                <StreamBar
                  key={stream.id}
                  stream={stream}
                  placement="top"
                  rowIndex={rowIndex}
                  rowCount={topLaneCount}
                  setSelectedAge={setSelectedAge}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="single-timeline-axis">
          {timeline.ticks.map((age) => (
            <button
              type="button"
              key={age}
              className={`single-age-marker ${Math.round(selectedAge) === age ? 'active' : ''}`}
              style={{ left: ageToPercent(age) }}
              onClick={() => setSelectedAge(age)}
            >
              <span />
              <b>{age}</b>
            </button>
          ))}

          {visibleAgeGroups.map(([age, events], index) => {
            const position = ((Number(age) - timeline.startAge) / span) * 100;
            const edgeClass = position < 8 ? 'edge-left' : position > 92 ? 'edge-right' : '';
            return (
            <button
              type="button"
              key={age}
              className={`lump-group stack-${index % 2} ${edgeClass} ${getCategoryClass(events[0]?.category)}`}
              style={{ left: ageToPercent(Number(age)) }}
              onClick={() => setSelectedAge(Number(age))}
              aria-label={`Milestones at age ${age}: ${events.map((event) => event.title).join(', ')}`}
            >
              <span className="lump-dot" />
            </button>
            );
          })}

          <button
            type="button"
            className="single-selected-marker"
            style={{ left: ageToPercent(selectedAge) }}
            onClick={() => setSelectedAge(selectedAge)}
            aria-label={`Selected age ${selectedAge}`}
          />
        </div>

        <div className="timeline-income-layer timeline-income-layer-bottom">
          {bottomStreamRows.map((row, rowIndex) => (
            <div className="income-lane-row" key={`bottom-row-${rowIndex}`}>
              {row.map((stream) => (
                <StreamBar
                  key={stream.id}
                  stream={stream}
                  placement="bottom"
                  rowIndex={rowIndex}
                  rowCount={bottomLaneCount}
                  setSelectedAge={setSelectedAge}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="age-detail-grid compact-age-details">
        <div className="age-detail-card payout-summary-card">
          <div className="detail-title">
            <CircleDollarSign size={17} />
            <strong>What You Receive at Age {selectedAge}</strong>
          </div>
          <div className="payout-summary-list">
            <PayoutLine label="Total Lump Sum" value={formatCurrency(payoutSummary.lumpSum)} />
            <PayoutLine label="Total Monthly Income" value={`${formatCurrency(payoutSummary.monthlyIncome)}/month`} />
            <PayoutLine label="Total Yearly Income" value={`${formatCurrency(payoutSummary.yearlyIncome)}/year`} />
            <PayoutLine label="Combined Monthly Equivalent" value={`${formatCurrency(payoutSummary.combinedMonthlyEquivalent)}/month`} strong />
          </div>
        </div>

        <div className="age-detail-card">
          <div className="detail-title">
            <CalendarClock size={17} />
            <strong>Events at Age {selectedAge}</strong>
          </div>
          <div className="event-list">
            {ageDetails.milestones.length === 0 && ageDetails.incomeStreams.length === 0 && (
              <p className="empty-events">No milestone or active income stream at this age.</p>
            )}
            {ageDetails.milestones.map((item) => (
              <div className="event-item" key={item.id}>
                <span>{item.category} | Lump sum</span>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
            ))}
            {ageDetails.incomeStreams.map((item) => (
              <div className="event-item income-event" key={item.id}>
                <span>Active income | Age {item.startAge}-{item.endAge}</span>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="timeline-note">{timelineNote}</p>
    </section>
  );
}

function PayoutLine({ label, value, strong }) {
  return (
    <div className={strong ? 'highlight' : ''}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StreamBar({ stream, placement, rowIndex, rowCount, setSelectedAge }) {
  const connectorHeight = placement === 'top'
    ? (rowCount - rowIndex - 1) * 68 + 86
    : rowIndex * 68 + 56;

  return (
    <button
      type="button"
      className={`income-bracket income-bracket-${placement} ${getCategoryClass(stream.category)}`}
      style={{
        left: stream.left,
        width: stream.width,
        '--stream-connector-height': `${connectorHeight}px`,
        '--stream-connector-top': placement === 'top' ? '0px' : `-${connectorHeight}px`,
      }}
      onClick={() => setSelectedAge(stream.startAge)}
      title={`${stream.title}: ${stream.description}`}
    >
      <span className="income-start-marker" />
      <span className="income-label">
        <span className="income-title">{stream.title}</span>
        <small className="income-subtitle">{stream.startAge}-{stream.endAge} | {stream.duration}</small>
      </span>
    </button>
  );
}

function TimelineLegend({ showCash, showSrs, showCpf }) {
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

function getStartingStreams(streams, age) {
  return streams.filter((stream) => Math.round(stream.startAge) === Math.round(age));
}

function getCategoryClass(category = '') {
  const normalized = category.toLowerCase();
  if (normalized.includes('cpf')) return 'category-cpf';
  if (normalized.includes('srs')) return 'category-srs';
  if (normalized.includes('policy')) return 'category-policy';
  if (normalized.includes('investment')) return 'category-investment';
  if (normalized.includes('cash')) return 'category-cash';
  return 'category-lump';
}

function isUpperStream(stream) {
  const category = (stream.category || '').toLowerCase();
  const title = (stream.title || '').toLowerCase();
  return category.includes('srs') || title.includes('srs');
}

function hasCashTimelineItems(timeline) {
  return [...(timeline.milestones || []), ...(timeline.incomeStreams || [])]
    .some((item) => (item.category || '').toLowerCase().includes('cash'));
}

function hasCpfTimelineItems(timeline) {
  return [...(timeline.milestones || []), ...(timeline.incomeStreams || [])]
    .some((item) => (item.category || '').toLowerCase().includes('cpf'));
}

function hasSrsTimelineItems(timeline) {
  return [...(timeline.milestones || []), ...(timeline.incomeStreams || [])]
    .some((item) => (item.category || '').toLowerCase().includes('srs'));
}

function assignStreamRows(streams, span) {
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
