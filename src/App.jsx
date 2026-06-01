import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2pdf from 'html2pdf.js';
import { ShieldCheck } from 'lucide-react';
import { Dashboard } from './components/Dashboard.jsx';
import { AnnualReview } from './components/AnnualReview.jsx';
import { ExportReport } from './components/ExportReport.jsx';
import { FollowUpTasks } from './components/FollowUpTasks.jsx';
import { PolicySummary } from './components/PolicySummary.jsx';
import { RetirementIncomeSources } from './components/RetirementIncomeSources.jsx';
import { RetirementTimeline } from './components/RetirementTimeline.jsx';
import {
  CashSection,
  CpfSection,
  InvestmentsSection,
  PoliciesSection,
  PolicyCashValueReview,
  ProfileSection,
  RetirementGoalSection,
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
  getPolicyCashValueRetirementAssets,
  loadPolicySummaryFromStorage,
  savePolicySummaryToStorage,
} from './utils/policySummary.js';
import {
  buildIncomeSources,
  buildRetirementTimeline,
  buildTimeline,
  calculateCpfAge55Transfer,
  calculatePayoutSummary,
  calculateAtAge,
  calculateNeeds,
  formatCurrency,
  getAgeTimelineDetails,
  hasCpfProjectionData,
  getRetirementTimelineEndAge,
  startLaterComparison,
} from './utils/projections.js';

const disclaimer = 'This calculator is for illustration and discussion purposes only. Figures are based on assumptions entered and are not guaranteed. Future CPF retirement sums are estimated using an advisor-entered BRS growth assumption. Actual returns, CPF BRS, FRS, ERS, CPF LIFE payouts, CPF/SRS treatment, policy values, fees, withdrawals, taxation and market conditions may differ. Please refer to official policy documents and CPF/SRS guidelines where applicable.';

export default function App() {
  const savedState = useMemo(() => loadClientDataFromStorage(), []);
  const [currentPage, setCurrentPage] = useState('input');
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
  const [policySummaryData, setPolicySummaryData] = useState(() => loadPolicySummaryFromStorage());
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [dataMessage, setDataMessage] = useState('');
  const [dataError, setDataError] = useState('');
  const exportReportRef = useRef(null);
  const importInputRef = useRef(null);
  const previousReviewInputRef = useRef(null);

  const scenarioRate = SCENARIOS[scenario].returnRate;
  const sharedPolicySummaryClient = useMemo(() => ({
    clientName: profile.clientName,
    dateOfBirth: profile.dateOfBirth,
    age: profile.currentAge,
    reviewDate: profile.reviewDate,
    advisorName: profile.advisorName,
  }), [profile.clientName, profile.dateOfBirth, profile.currentAge, profile.reviewDate, profile.advisorName]);
  const policyCashValueAssets = useMemo(
    () => getPolicyCashValueRetirementAssets(policySummaryData?.policies || []),
    [policySummaryData],
  );
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

  const handlePolicySummaryDataChange = useCallback((nextData) => {
    setPolicySummaryData(nextData);
  }, []);

  const handlePolicySummaryClientImport = useCallback((client) => {
    if (!client) return;
    setProfile((current) => ({
      ...current,
      clientName: client.clientName || current.clientName,
      dateOfBirth: client.dateOfBirth || current.dateOfBirth,
      currentAge: client.age || current.currentAge,
      reviewDate: client.reviewDate || current.reviewDate,
      advisorName: client.advisorName || current.advisorName,
    }));
  }, []);

  const updatePolicyCashValueInclusion = useCallback((policyId, includeCashValueInRetirement) => {
    setPolicySummaryData((current) => {
      if (!current?.policies) return current;
      const nextData = {
        ...current,
        policies: current.policies.map((policy) => (
          policy.id === policyId ? { ...policy, includeCashValueInRetirement } : policy
        )),
      };
      savePolicySummaryToStorage(nextData);
      return nextData;
    });
  }, []);

  useEffect(() => {
    saveClientDataToStorage(clientDataState);
  }, [clientDataState]);

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
        windowWidth: 1123,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
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
    <div className="app-shell">
      <PageNavigation currentPage={currentPage} setCurrentPage={setCurrentPage} />

      {currentPage === 'input' && (
        <main className="client-input-page">
          <section className="panel client-input-hero">
            <div>
              <p className="client-label">Advisor workspace</p>
              <h1>Client Input</h1>
              <span>Enter and maintain client details, retirement assumptions, assets, and policy summary information.</span>
            </div>
          </section>

          {dataError && <div className="export-error">{dataError}</div>}
          {dataMessage && <div className="data-message">{dataMessage}</div>}

          <section className="client-input-flow">
            <ProfileSection profile={profile} setProfile={setProfile} />

            <PolicySummary
              editable
              showClientDetails={false}
              showReport={false}
              showPdfExport={false}
              showJsonActions
              sharedClient={sharedPolicySummaryClient}
              onClientImport={handlePolicySummaryClientImport}
              onDataChange={handlePolicySummaryDataChange}
            />

            <section className="client-input-group">
              <div className="client-input-group-heading">
                <h2>Retirement Inputs</h2>
                <p>Projection assumptions and assets used by the Retirement Projection page.</p>
              </div>
              <RetirementGoalSection profile={profile} setProfile={setProfile} />
              <PolicyCashValueReview
                policySummaryPolicies={policySummaryData?.policies || []}
                retirementPolicies={policies}
                onToggle={updatePolicyCashValueInclusion}
              />
              <CpfSection cpf={cpf} setCpf={setCpf} profile={profile} />
              <SrsSection srs={srs} setSrs={setSrs} />
              <PoliciesSection policies={policies} setPolicies={setPolicies} profile={profile} scenarioRate={scenarioRate} />
              <InvestmentsSection investments={investments} setInvestments={setInvestments} profile={profile} scenarioRate={scenarioRate} />
              <CashSection cash={cash} setCash={setCash} />
            </section>

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

            <section className="panel advisor-panel">
              <div className="section-header">
                <div>
                  <h2>Advisor Insight</h2>
                  <p className="section-subtext">Private planning notes used in the retirement report.</p>
                </div>
              </div>
              <textarea
                value={advisorInsight}
                onChange={(event) => setAdvisorInsight(event.target.value)}
                placeholder="Client has strong income but most wealth is held in cash..."
              />
            </section>

            <section className="panel data-export-panel">
              <div>
                <h2>Data Import / Export</h2>
                <p>Retirement JSON controls are here. Policy Summary JSON controls are in the Policy Summary Inputs card above.</p>
              </div>
              <div className="data-export-actions">
                <button className="ghost-button data-action-button" type="button" onClick={exportClientData}>
                  Export Retirement Client Data
                </button>
                <button className="ghost-button data-action-button" type="button" onClick={requestImportClientData}>
                  Import Retirement Client Data
                </button>
                <button className="ghost-button data-action-button subtle" type="button" onClick={clearBrowserSavedData}>
                  Clear Saved Data
                </button>
              </div>
            </section>
          </section>
        </main>
      )}

      {currentPage === 'retirement' && (
        <div className="app presentation-app">
          <div className="report-surface">
            <section className="page-action-bar">
              <div>
                <p className="client-label">Client-facing view</p>
                <h1>Retirement Projection</h1>
              </div>
              <button className="export-button" type="button" onClick={exportPdf} disabled={isExporting}>
                {isExporting ? 'Generating PDF...' : 'Export Retirement PDF'}
              </button>
            </section>
            {exportError && <div className="export-error retirement-export-message">{exportError}</div>}

            <Dashboard
              clientFacing
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

              <KeyTakeaways
                profile={profile}
                retirementPoint={retirementPoint}
                incomeSources={incomeSources}
                needs={needs}
                cpf={cpf}
              />
            </div>

            <footer className="disclaimer">
              <ShieldCheck size={18} />
              <p>{disclaimer}</p>
            </footer>
          </div>
        </div>
      )}

      {currentPage === 'policySummary' && (
        <PolicySummary
          editable={false}
          showReport
          showPdfExport
          showJsonActions={false}
          sharedClient={sharedPolicySummaryClient}
          onDataChange={handlePolicySummaryDataChange}
        />
      )}

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
            policyCashValueAssets={policyCashValueAssets}
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

function PageNavigation({ currentPage, setCurrentPage }) {
  const pages = [
    ['input', 'Client Input'],
    ['retirement', 'Retirement Projection'],
    ['policySummary', 'Policy Summary'],
  ];
  return (
    <header className="mode-toolbar">
      <div className="mode-toolbar-title">
        <strong>Retirement Projection Studio</strong>
        <span>Client input, retirement projection and policy summary</span>
      </div>
      <div className="mode-toolbar-actions">
        <div className="page-toggle" aria-label="App page">
          {pages.map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={currentPage === key ? 'active' : ''}
              onClick={() => setCurrentPage(key)}
            >
              {label}
            </button>
          ))}
        </div>
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
  const cpfTransfer = calculateCpfAge55Transfer(cpf, profile);
  const planningOpportunity = needs.surplusShortfall >= 0
    ? 'The plan is currently ahead of the illustrated retirement need based on the assumptions shown.'
    : 'The main planning opportunity is to close the retirement income gap with additional savings, investments, or adjusted assumptions.';

  const takeaways = [
    `Your projected retirement assets are ${formatCurrency(retirementPoint.total)} by age ${profile.retirementAge}.`,
    `Your projected monthly income at the selected age is ${formatCurrency(incomeSources.totalMonthlyIncome)}/month.`,
    hasCpfProjectionData(cpf) && cpfTransfer
      ? `CPF age 55 estimated withdrawable amount is ${formatCurrency(cpfTransfer.withdrawableAmount)}, with ${formatCurrency(cpfTransfer.raSetAside)} set aside in RA.`
      : 'CPF has not been included in this illustration.',
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
