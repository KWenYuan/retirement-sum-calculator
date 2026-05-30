import { useEffect, useMemo, useRef, useState } from 'react';
import html2pdf from 'html2pdf.js';
import { ShieldCheck } from 'lucide-react';
import { Dashboard } from './components/Dashboard.jsx';
import { AnnualReview } from './components/AnnualReview.jsx';
import { ExportReport } from './components/ExportReport.jsx';
import { FollowUpTasks } from './components/FollowUpTasks.jsx';
import { RetirementIncomeSources } from './components/RetirementIncomeSources.jsx';
import { RetirementTimeline } from './components/RetirementTimeline.jsx';
import {
  CashSection,
  CpfSection,
  InvestmentsSection,
  PoliciesSection,
  ProfileSection,
  SrsSection,
} from './components/InputSections.jsx';
import {
  SCENARIOS,
  defaultCash,
  defaultCpf,
  defaultProfile,
  defaultSrs,
  starterInvestments,
  starterPolicies,
} from './data/defaults.js';
import {
  buildClientDataState,
  buildExportPayload,
  clearSavedClientData,
  defaultAdvisorInsight,
  downloadClientData,
  importClientData,
  importPreviousReviewData,
  loadClientDataFromStorage,
  saveClientDataToStorage,
} from './utils/clientData.js';
import {
  buildAnnualReviewComparison,
  buildChangedSinceLastReview,
  buildReviewSnapshot,
} from './utils/annualReview.js';
import {
  buildIncomeSources,
  buildRetirementTimeline,
  buildTimeline,
  calculatePayoutSummary,
  calculateAtAge,
  calculateNeeds,
  formatCurrency,
  getAgeTimelineDetails,
  getRetirementTimelineEndAge,
  startLaterComparison,
} from './utils/projections.js';

const disclaimer = 'This calculator is for illustration and discussion purposes only. Figures are based on assumptions entered and are not guaranteed. Actual returns, CPF rules, SRS treatment, policy values, fees, withdrawals, taxation and market conditions may differ. Please refer to official policy documents and CPF/SRS guidelines where applicable.';
const VIEW_MODE_STORAGE_KEY = 'retirementProjectionViewMode';

export default function App() {
  const savedState = useMemo(() => loadClientDataFromStorage(), []);
  const [viewMode, setViewMode] = useState(() => loadViewMode());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [profile, setProfile] = useState(savedState?.profile || defaultProfile);
  const [cpf, setCpf] = useState(savedState?.cpf || defaultCpf);
  const [srs, setSrs] = useState(savedState?.srs || defaultSrs);
  const [policies, setPolicies] = useState(savedState?.policies || starterPolicies);
  const [investments, setInvestments] = useState(savedState?.investments || starterInvestments);
  const [cash, setCash] = useState(savedState?.cash || defaultCash);
  const [scenario, setScenario] = useState(savedState?.scenario || 'balanced');
  const [selectedAge, setSelectedAge] = useState(savedState?.selectedAge || defaultProfile.retirementAge);
  const [advisorInsight, setAdvisorInsight] = useState(savedState?.advisorInsight || defaultAdvisorInsight);
  const [followUpTasks, setFollowUpTasks] = useState(savedState?.followUpTasks || []);
  const [previousReviewData, setPreviousReviewData] = useState(savedState?.previousReviewData || null);
  const [includeFollowUpTasksInPdf, setIncludeFollowUpTasksInPdf] = useState(savedState?.includeFollowUpTasksInPdf || false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [dataMessage, setDataMessage] = useState('');
  const [dataError, setDataError] = useState('');
  const exportReportRef = useRef(null);
  const importInputRef = useRef(null);
  const previousReviewInputRef = useRef(null);

  const scenarioRate = SCENARIOS[scenario].returnRate;
  const retirementTimelineEndAge = getRetirementTimelineEndAge(profile);
  const projectionState = { profile, cpf, srs, policies, investments, cash, scenarioRate, timelineEndAge: retirementTimelineEndAge };
  const timeline = useMemo(() => buildTimeline(projectionState), [profile, cpf, srs, policies, investments, cash, scenarioRate]);
  const retirementTimeline = useMemo(() => buildRetirementTimeline(projectionState), [profile, cpf, srs, policies, investments, cash, scenarioRate]);
  const clampedSelectedAge = Math.min(Math.max(selectedAge, profile.currentAge), retirementTimelineEndAge);
  const selectedBreakdown = useMemo(
    () => calculateAtAge({ ...projectionState, age: clampedSelectedAge }),
    [profile, cpf, srs, policies, investments, cash, scenarioRate, clampedSelectedAge],
  );
  const retirementPoint = useMemo(
    () => calculateAtAge({ ...projectionState, age: profile.retirementAge }),
    [profile, cpf, srs, policies, investments, cash, scenarioRate],
  );
  const needs = useMemo(() => calculateNeeds(profile, retirementPoint.total), [profile, retirementPoint.total]);
  const startLater = useMemo(() => startLaterComparison(projectionState), [profile, cpf, srs, policies, investments, cash, scenarioRate]);
  const ageDetails = useMemo(
    () => getAgeTimelineDetails(retirementTimeline, clampedSelectedAge),
    [retirementTimeline, clampedSelectedAge],
  );
  const payoutSummary = useMemo(() => calculatePayoutSummary(ageDetails), [ageDetails]);
  const incomeSources = useMemo(
    () => buildIncomeSources({ profile, age: clampedSelectedAge, ageDetails }),
    [profile, clampedSelectedAge, ageDetails],
  );
  const currentReviewSnapshot = useMemo(
    () => buildReviewSnapshot({ profile, cpf, srs, policies, investments, cash, scenario }),
    [profile, cpf, srs, policies, investments, cash, scenario],
  );
  const annualReviewComparison = useMemo(
    () => buildAnnualReviewComparison(previousReviewData, { profile, cpf, srs, policies, investments, cash, scenario }, currentReviewSnapshot),
    [previousReviewData, profile, cpf, srs, policies, investments, cash, scenario, currentReviewSnapshot],
  );
  const reviewChanges = useMemo(
    () => buildChangedSinceLastReview(previousReviewData, { profile, cpf, srs, policies, investments, cash, scenario }, annualReviewComparison),
    [previousReviewData, profile, cpf, srs, policies, investments, cash, scenario, annualReviewComparison],
  );

  const exportDate = new Date().toLocaleDateString('en-CA');
  const clientDataState = useMemo(() => buildClientDataState({
    profile,
    cpf,
    srs,
    policies,
    investments,
    cash,
    scenario,
    selectedAge: clampedSelectedAge,
    advisorInsight,
    followUpTasks,
    previousReviewData,
    includeFollowUpTasksInPdf,
  }), [profile, cpf, srs, policies, investments, cash, scenario, clampedSelectedAge, advisorInsight, followUpTasks, previousReviewData, includeFollowUpTasksInPdf]);

  useEffect(() => {
    saveClientDataToStorage(clientDataState);
  }, [clientDataState]);

  useEffect(() => {
    saveViewMode(viewMode);
  }, [viewMode]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const exportPdf = async () => {
    if (!exportReportRef.current || isExporting) return;
    setIsExporting(true);
    setExportError('');
    const options = {
      margin: 10,
      filename: buildReportFilename(profile.clientName, exportDate),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 794,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['.avoid-break'], before: ['.page-break'] },
    };

    try {
      await html2pdf().set(options).from(exportReportRef.current).save();
    } catch (error) {
      console.error('PDF export failed:', error);
      setExportError('PDF export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportClientData = () => {
    setDataError('');
    const payload = buildExportPayload(clientDataState);
    downloadClientData(payload, profile.clientName, exportDate);
    setDataMessage('Client data exported successfully.');
  };

  const requestImportClientData = () => {
    setDataError('');
    setDataMessage('');
    importInputRef.current?.click();
  };

  const requestImportPreviousReviewData = () => {
    setDataError('');
    setDataMessage('');
    previousReviewInputRef.current?.click();
  };

  const handleImportClientData = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const shouldContinue = window.confirm('Importing this file will replace the current calculator inputs. Continue?');
    if (!shouldContinue) return;

    try {
      const restoredState = await importClientData(file);
      if (!restoredState) return;
      restoreState(restoredState);
      setDataMessage('Client data imported successfully.');
      setDataError('');
    } catch (error) {
      console.error('Client data import failed:', error);
      setDataError(error.message || 'Invalid client data file. Please upload a valid Retirement Sum Calculator JSON file.');
      setDataMessage('');
    }
  };

  const handleImportPreviousReviewData = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const reviewData = await importPreviousReviewData(file);
      if (!reviewData) return;
      setPreviousReviewData(reviewData);
      setDataMessage('Previous review data imported for comparison.');
      setDataError('');
    } catch (error) {
      console.error('Previous review import failed:', error);
      setDataError(error.message || 'Invalid client data file. Please upload a valid Retirement Sum Calculator JSON file.');
      setDataMessage('');
    }
  };

  const clearPreviousReviewData = () => {
    setPreviousReviewData(null);
    setDataMessage('Previous review comparison cleared.');
    setDataError('');
  };

  const clearBrowserSavedData = () => {
    clearSavedClientData();
    setDataMessage('Saved browser data cleared.');
    setDataError('');
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch (error) {
      console.warn('Fullscreen toggle failed:', error);
    }
  };

  const restoreState = (state) => {
    setProfile(state.profile);
    setCpf(state.cpf);
    setSrs(state.srs);
    setPolicies(state.policies);
    setInvestments(state.investments);
    setCash(state.cash);
    setScenario(state.scenario);
    setSelectedAge(state.selectedAge);
    setAdvisorInsight(state.advisorInsight);
    setFollowUpTasks(state.followUpTasks);
    setPreviousReviewData(state.previousReviewData);
    setIncludeFollowUpTasksInPdf(state.includeFollowUpTasksInPdf);
  };

  return (
    <div className={`app-shell ${viewMode}-mode`}>
      <ModeToolbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        exportPdf={exportPdf}
        isExporting={isExporting}
        toggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />

      <div className={`app ${viewMode === 'presentation' ? 'presentation-app' : ''}`}>
        {viewMode === 'advisor' && (
          <aside className="sidebar">
            <div className="brand">
              <div>
                <strong>Retirement Projection Studio</strong>
                <span>Private advisor calculator</span>
              </div>
            </div>

            <SidebarInputSummary
              profile={profile}
              retirementPoint={retirementPoint}
              incomeSources={incomeSources}
              needs={needs}
            />

            <ProfileSection profile={profile} setProfile={setProfile} />
            <CpfSection cpf={cpf} setCpf={setCpf} />
            <SrsSection srs={srs} setSrs={setSrs} />
            <CashSection cash={cash} setCash={setCash} />
            <PoliciesSection policies={policies} setPolicies={setPolicies} profile={profile} scenarioRate={scenarioRate} />
            <InvestmentsSection investments={investments} setInvestments={setInvestments} profile={profile} scenarioRate={scenarioRate} />
          </aside>
        )}

        <div className="report-surface">
        <Dashboard
          viewMode={viewMode}
          profile={profile}
          cpf={cpf}
          srs={srs}
          policies={policies}
          investments={investments}
          cash={cash}
          scenarioRate={scenarioRate}
          timeline={timeline}
          selectedBreakdown={selectedBreakdown}
          selectedAge={clampedSelectedAge}
          setSelectedAge={setSelectedAge}
          retirementPoint={retirementPoint}
          needs={needs}
          payoutSummary={payoutSummary}
          incomeSources={incomeSources}
          startLater={startLater}
          advisorInsight={advisorInsight}
          setAdvisorInsight={setAdvisorInsight}
          exportPdf={exportPdf}
          exportClientData={exportClientData}
          importClientData={requestImportClientData}
          clearSavedData={clearBrowserSavedData}
          isExporting={isExporting}
          exportError={exportError}
          dataMessage={dataMessage}
          dataError={dataError}
        />

        <div className="dashboard timeline-placement">
          <RetirementTimeline
            timeline={retirementTimeline}
            selectedAge={clampedSelectedAge}
            setSelectedAge={setSelectedAge}
            ageDetails={ageDetails}
          />

          <RetirementIncomeSources incomeSources={incomeSources} />

          {viewMode === 'advisor' ? (
            <>
              <AnnualReview
                previousReviewData={previousReviewData}
                comparison={annualReviewComparison}
                changes={reviewChanges}
                importPreviousReviewData={requestImportPreviousReviewData}
                clearPreviousReviewData={clearPreviousReviewData}
              />

              <FollowUpTasks
                tasks={followUpTasks}
                setTasks={setFollowUpTasks}
                includeFollowUpTasksInPdf={includeFollowUpTasksInPdf}
                setIncludeFollowUpTasksInPdf={setIncludeFollowUpTasksInPdf}
              />
            </>
          ) : (
            <KeyTakeaways
              profile={profile}
              retirementPoint={retirementPoint}
              incomeSources={incomeSources}
              needs={needs}
              cpf={cpf}
            />
          )}
        </div>

        {viewMode === 'advisor' && (
          <section className="pdf-summary">
          <h2>Client Summary</h2>
          <div className="summary-grid">
            <SummaryItem label="Client name" value={profile.clientName} />
            <SummaryItem label="Date" value={new Date().toLocaleDateString('en-SG')} />
            <SummaryItem label="Current age" value={profile.currentAge} />
            <SummaryItem label="Retirement age" value={profile.retirementAge} />
            <SummaryItem label="Projected retirement amount" value={formatCurrency(retirementPoint.total)} />
            <SummaryItem label="Required retirement amount" value={formatCurrency(needs.requiredAmount)} />
            <SummaryItem label="Surplus / shortfall" value={formatCurrency(needs.surplusShortfall)} />
            <SummaryItem label="Advisor insight" value={advisorInsight} />
          </div>
          </section>
        )}

        <footer className="disclaimer">
          <ShieldCheck size={18} />
          <p>{disclaimer}</p>
        </footer>
        </div>
      </div>

      <div className="export-report-host" aria-hidden="true">
        <div ref={exportReportRef}>
          <ExportReport
            profile={profile}
            cpf={cpf}
            srs={srs}
            policies={policies}
            investments={investments}
            cash={cash}
            scenarioRate={scenarioRate}
            retirementPoint={retirementPoint}
            needs={needs}
            retirementTimeline={retirementTimeline}
            incomeSources={incomeSources}
            annualReviewComparison={annualReviewComparison}
            reviewChanges={reviewChanges}
            followUpTasks={followUpTasks}
            includeFollowUpTasksInPdf={includeFollowUpTasksInPdf}
            advisorInsight={advisorInsight}
            disclaimer={disclaimer}
            exportDate={exportDate}
          />
        </div>
      </div>

      <input
        ref={importInputRef}
        className="hidden-file-input"
        type="file"
        accept="application/json,.json"
        onChange={handleImportClientData}
      />
      <input
        ref={previousReviewInputRef}
        className="hidden-file-input"
        type="file"
        accept="application/json,.json"
        onChange={handleImportPreviousReviewData}
      />
    </div>
  );
}

function loadViewMode() {
  try {
    const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    return stored === 'presentation' ? 'presentation' : 'advisor';
  } catch {
    return 'advisor';
  }
}

function saveViewMode(viewMode) {
  try {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  } catch {
    // Local storage can be unavailable in private contexts; mode still works in state.
  }
}

function ModeToolbar({ viewMode, setViewMode, exportPdf, isExporting, toggleFullscreen, isFullscreen }) {
  const isPresentation = viewMode === 'presentation';
  return (
    <header className="mode-toolbar">
      <div className="mode-toolbar-title">
        <strong>Retirement Projection Studio</strong>
        <span>{isPresentation ? 'Client presentation dashboard' : 'Advisor workspace'}</span>
      </div>
      <div className="mode-toolbar-actions">
        <div className="mode-toggle" aria-label="View mode">
          <button
            type="button"
            className={viewMode === 'advisor' ? 'active' : ''}
            onClick={() => setViewMode('advisor')}
          >
            Advisor Mode
          </button>
          <button
            type="button"
            className={isPresentation ? 'active' : ''}
            onClick={() => setViewMode('presentation')}
          >
            Presentation Mode
          </button>
        </div>
        {isPresentation && (
          <>
            <button className="ghost-button mode-action" type="button" onClick={() => setViewMode('advisor')}>
              Edit Details
            </button>
            <button className="export-button mode-export" type="button" onClick={exportPdf} disabled={isExporting}>
              {isExporting ? 'Generating PDF...' : 'Export PDF'}
            </button>
            {document.fullscreenEnabled && (
              <button className="ghost-button mode-action" type="button" onClick={toggleFullscreen}>
                {isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}

function buildReportFilename(clientName, exportDate) {
  const cleanName = clientName
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return `${cleanName ? `${cleanName}-` : ''}Retirement-Summary-${exportDate}.pdf`;
}

function SummaryItem({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SidebarInputSummary({ profile, retirementPoint, incomeSources, needs }) {
  return (
    <section className="sidebar-summary-card">
      <div>
        <span>Client</span>
        <strong>{profile.clientName || 'Client'}</strong>
      </div>
      <div className="sidebar-summary-grid">
        <SummaryMini label="Current Age" value={profile.currentAge} />
        <SummaryMini label="Retirement Age" value={profile.retirementAge} />
        <SummaryMini label="Desired Income" value={`${formatCurrency(profile.desiredMonthlyIncome)}/mo`} />
        <SummaryMini label="Projected Amount" value={formatCurrency(retirementPoint.total, true)} />
        <SummaryMini label="Projected Income" value={`${formatCurrency(incomeSources.totalMonthlyIncome)}/mo`} />
        <SummaryMini label={needs.surplusShortfall >= 0 ? 'Surplus' : 'Shortfall'} value={formatCurrency(needs.surplusShortfall, true)} />
      </div>
    </section>
  );
}

function SummaryMini({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function KeyTakeaways({ profile, retirementPoint, incomeSources, needs, cpf }) {
  const gapLabel = needs.surplusShortfall >= 0 ? 'estimated surplus' : 'estimated shortfall';
  const planningOpportunity = needs.surplusShortfall >= 0
    ? 'The plan is currently ahead of the illustrated retirement need based on the assumptions shown.'
    : 'The main planning opportunity is to close the retirement income gap with additional savings, investments, or adjusted assumptions.';

  const takeaways = [
    `Your projected retirement assets are ${formatCurrency(retirementPoint.total)} by age ${profile.retirementAge}.`,
    `Your projected monthly income at the selected age is ${formatCurrency(incomeSources.totalMonthlyIncome)}/month.`,
    cpf.enabled ? `CPF LIFE contributes ${formatCurrency(cpf.cpfLifeMonthlyPayout)}/month from age ${cpf.cpfLifePayoutStartAge}.` : 'CPF LIFE has not been included in this illustration.',
    `The current projection shows an ${gapLabel} of ${formatCurrency(Math.abs(needs.surplusShortfall))}.`,
    planningOpportunity,
  ];

  return (
    <section className="panel key-takeaways-panel">
      <div className="section-header">
        <div>
          <h2>Key Takeaways</h2>
          <p className="section-subtext">A short client-facing summary based on the current assumptions.</p>
        </div>
      </div>
      <ol className="key-takeaway-list">
        {takeaways.map((takeaway) => (
          <li key={takeaway}>{takeaway}</li>
        ))}
      </ol>
    </section>
  );
}
