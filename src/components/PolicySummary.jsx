import { useEffect, useMemo, useRef, useState } from 'react';
import html2pdf from 'html2pdf.js';
import { Copy, Download, FileJson, FolderUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { NumberField, SelectField, TextField, Toggle } from './FormControls.jsx';
import { PolicySummaryExportReport } from './PolicySummaryExportReport.jsx';
import {
  applyPolicySummaryCalculatedAges,
  benefitCoverageDefinitions,
  getBenefitColor,
  getBenefitTint,
  premiumTimelineColor,
  calculatePolicyPremium,
  calculatePolicyTablePremiumTotalsByCurrency,
  calculatePolicySummary,
  createPolicySummaryPolicy,
  defaultPolicyBenchmark,
  defaultPolicySummaryClient,
  defaultPolicySummaryNotes,
  downloadPolicySummaryData,
  formatCurrencyTotals,
  formatDisplayDate,
  formatPolicyCurrency,
  formatPolicyCurrencyWithLabel,
  formatPolicyTimelinePremium,
  getBenefitAmountDisplay,
  getBenefitCoverageDetails,
  getPolicyTablePremiumValues,
  getPremiumPeriod,
  importPolicySummaryData,
  loadPolicySummaryFromStorage,
  restorePolicySummaryData,
  savePolicySummaryToStorage,
} from '../utils/policySummary.js';

const disclaimer = 'This policy summary is prepared based on information provided and is for discussion purposes only. Please refer to the official policy contracts, benefit illustrations and insurer documents for exact benefits, exclusions, values, terms and conditions.';

const premiumFrequencies = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Single Premium', 'Unknown'];
const policyStatuses = ['In-force', 'Lapsed', 'Matured', 'Cancelled', 'Pending', 'Paid-up', 'Unknown'];
const payStatuses = ['Paying', 'Fully paid', 'Waived', 'Lapsed', 'In-force', 'Unknown'];
const coverageStatuses = ['Active', 'Ended', 'Pending', 'Unknown'];
const premiumPayableTypes = ['Fixed term', 'To age', 'Whole life / ongoing', 'Single premium', 'Fully paid', 'Unknown'];
const policyRows = [
  { label: 'Company', get: (policy) => textValue(policy.company) },
  { label: 'Policy No.', get: (policy) => textValue(policy.policyNumber) },
  { label: 'Type of Plan', get: (policy) => textValue(policy.typeOfPlan) },
  { label: 'Plan Name', get: (policy) => textValue(policy.planName) },
  { label: 'Policy Start Date', get: (policy) => formatDisplayDate(policy.startDate) },
  { label: 'Monthly Premium', totalKey: 'monthlyPremium', premiumTableTotal: true, get: (policy) => getPolicyTablePremiumValues(policy).monthlyDisplay },
  { label: 'Annual Premium', totalKey: 'annualPremium', premiumTableTotal: true, get: (policy) => getPolicyTablePremiumValues(policy).annualDisplay },
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

function mergeClientDetails(client, sharedClient) {
  if (!sharedClient) return client;
  return {
    ...client,
    clientName: sharedClient.clientName || client.clientName,
    dateOfBirth: sharedClient.dateOfBirth || client.dateOfBirth,
    age: sharedClient.age || client.age,
    reviewDate: sharedClient.reviewDate || client.reviewDate,
    advisorName: sharedClient.advisorName || client.advisorName,
  };
}

export function PolicySummary({
  editable = true,
  showClientDetails = true,
  showReport = true,
  showPdfExport = true,
  showJsonActions = true,
  sharedClient = null,
  onClientImport,
  onDataChange,
}) {
  const savedData = useMemo(() => loadPolicySummaryFromStorage(), []);
  const [client, setClient] = useState(savedData?.client || defaultPolicySummaryClient);
  const [policies, setPolicies] = useState(savedData?.policies || restorePolicySummaryData().policies);
  const [benchmark, setBenchmark] = useState(savedData?.benchmark || defaultPolicyBenchmark);
  const [notes, setNotes] = useState(savedData?.notes || defaultPolicySummaryNotes);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedTimelinePolicyId, setSelectedTimelinePolicyId] = useState(null);
  const importRef = useRef(null);
  const reportRef = useRef(null);
  const summary = useMemo(() => calculatePolicySummary(policies, benchmark), [policies, benchmark]);
  const selectedTimelinePolicy = policies.find((policy) => policy.id === selectedTimelinePolicyId) || policies[0] || null;
  const exportDate = new Date().toLocaleDateString('en-CA');
  const displayClient = useMemo(() => mergeClientDetails(client, sharedClient), [client, sharedClient]);
  const dataState = useMemo(() => ({ client: displayClient, policies, benchmark, notes }), [displayClient, policies, benchmark, notes]);

  useEffect(() => {
    savePolicySummaryToStorage(dataState);
    onDataChange?.(dataState);
  }, [dataState, onDataChange]);

  useEffect(() => {
    setPolicies((current) => {
      const nextPolicies = current.map((policy) => applyPolicySummaryCalculatedAges(policy, {
        client: displayClient,
        previousPolicy: policy,
      }));
      return arePoliciesEquivalent(current, nextPolicies) ? current : nextPolicies;
    });
  }, [displayClient.dateOfBirth]);

  const addPolicy = () => {
    const policy = applyPolicySummaryCalculatedAges(
      createPolicySummaryPolicy({ planName: 'New Policy', owner: displayClient.clientName || 'Client', lifeAssured: displayClient.clientName || 'Client' }),
      { client: displayClient },
    );
    setPolicies((current) => [policy, ...current]);
    setEditingId(policy.id);
  };

  const updatePolicy = (id, key, value) => {
    setPolicies((current) => current.map((policy) => (
      policy.id === id
        ? applyPolicySummaryCalculatedAges(
          normalizePolicyPremiumFields({ ...policy, [key]: value }, key),
          { client: displayClient, previousPolicy: policy },
        )
        : policy
    )));
  };

  const duplicatePolicy = (policy) => {
    const copy = applyPolicySummaryCalculatedAges(
      createPolicySummaryPolicy({ ...policy, id: crypto.randomUUID(), planName: `${policy.planName || 'Policy'} copy` }),
      { client: displayClient, previousPolicy: policy },
    );
    setPolicies((current) => [copy, ...current]);
    setEditingId(copy.id);
  };

  const deletePolicy = (id) => {
    setPolicies((current) => current.filter((policy) => policy.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const exportPdf = async () => {
    if (!reportRef.current || isExporting) return;
    setIsExporting(true);
    setError('');
    try {
      await html2pdf().set({
        margin: 6,
        filename: buildPolicySummaryPdfFilename(displayClient.clientName, exportDate),
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 1040 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.pdf-avoid-break', '.avoid-break'], before: ['.pdf-page-break', '.page-break'] },
      }).from(reportRef.current).save();
    } catch (pdfError) {
      console.error('Policy summary PDF export failed:', pdfError);
      setError('Policy Summary PDF export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportJson = () => {
    downloadPolicySummaryData(dataState, displayClient.clientName, exportDate);
    setMessage('Policy summary data exported successfully.');
    setError('');
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const restored = await importPolicySummaryData(file);
      if (!restored) return;
      setClient(restored.client);
      setPolicies(restored.policies);
      setBenchmark(restored.benchmark);
      setNotes(restored.notes);
      onClientImport?.(restored.client);
      const policyCount = restored.importReport?.policyCount ?? restored.policies.length;
      const cleanedMessage = restored.importReport?.cleanedPolicies > 0
        ? ' Some missing or unknown fields were converted to safe defaults.'
        : '';
      setMessage(`Imported ${policyCount} ${policyCount === 1 ? 'policy' : 'policies'} successfully.${cleanedMessage}`);
      setError('');
    } catch (importError) {
      console.error('Policy summary import failed:', importError);
      setError('Policy Summary import failed. Some fields may be in an unsupported format.');
      setMessage('');
    }
  };

  return (
    <main className="policy-summary-page">
      <section className="policy-summary-hero panel">
        <div>
          <p>Personal Wealth Planning</p>
          <h1>Policy Summary for {displayClient.clientName || 'Client'}</h1>
          <span>Current as of {formatDisplayDate(displayClient.reviewDate || exportDate)}</span>
        </div>
        <div className="policy-summary-actions">
          {showPdfExport && (
            <button className="export-button" type="button" onClick={exportPdf} disabled={isExporting}>
              <Download size={17} />
              {isExporting ? 'Generating PDF...' : 'Export Policy Summary PDF'}
            </button>
          )}
          {showJsonActions && (
            <>
              <button className="ghost-button" type="button" onClick={exportJson}><FileJson size={16} /> Export Policy Summary Data</button>
              <button className="ghost-button" type="button" onClick={() => importRef.current?.click()}><FolderUp size={16} /> Import Policy Summary Data</button>
            </>
          )}
        </div>
      </section>

      {message && <div className="data-message policy-message">{message}</div>}
      {error && <div className="export-error policy-message">{error}</div>}

      {editable && (
        <section className="policy-summary-editor">
          {showClientDetails && (
            <details className="input-accordion panel" open>
              <summary><span>Client Details</span></summary>
              <div className="accordion-content form-grid compact input-compact-grid">
                <TextField label="Client name" value={client.clientName} onChange={(value) => setClient((current) => ({ ...current, clientName: value }))} />
                <TextField label="Date of birth" value={client.dateOfBirth} onChange={(value) => setClient((current) => ({ ...current, dateOfBirth: value }))} />
                <NumberField label="Age" value={client.age} onChange={(value) => setClient((current) => ({ ...current, age: value }))} />
                <TextField label="Review date" value={client.reviewDate} onChange={(value) => setClient((current) => ({ ...current, reviewDate: value }))} />
                <TextField label="Advisor name" value={client.advisorName} onChange={(value) => setClient((current) => ({ ...current, advisorName: value }))} />
              </div>
            </details>
          )}

          <details className="input-accordion panel" open>
            <summary>
              <span>Policies</span>
              <div className="accordion-action" onClick={(event) => event.preventDefault()}>
                <button className="ghost-button compact-action" type="button" onClick={addPolicy}><Plus size={15} /> Add policy</button>
              </div>
            </summary>
            <div className="accordion-content compact-item-list">
              {policies.map((policy) => (
                <PolicySummaryCard
                  key={policy.id}
                  policy={policy}
                  isEditing={editingId === policy.id}
                  setEditingId={setEditingId}
                  updatePolicy={updatePolicy}
                  duplicatePolicy={duplicatePolicy}
                  deletePolicy={deletePolicy}
                />
              ))}
            </div>
          </details>

          <details className="input-accordion panel">
            <summary><span>Coverage Benchmark</span></summary>
            <div className="accordion-content form-grid compact input-compact-grid">
              <NumberField label="Annual income" prefix="$" value={benchmark.annualIncome} onChange={(value) => setBenchmark((current) => ({ ...current, annualIncome: value }))} />
              <NumberField label="Death benchmark" suffix="x income" value={benchmark.deathMultiplier} onChange={(value) => setBenchmark((current) => ({ ...current, deathMultiplier: value }))} />
              <NumberField label="CI benchmark" suffix="x income" value={benchmark.ciMultiplier} onChange={(value) => setBenchmark((current) => ({ ...current, ciMultiplier: value }))} />
            </div>
          </details>

          <details className="input-accordion panel">
            <summary><span>Notes</span></summary>
            <div className="accordion-content">
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </details>
        </section>
      )}

      {showReport && (
        <PolicySummaryReport
          client={displayClient}
          policies={policies}
          summary={summary}
          benchmark={benchmark}
          notes={notes}
          selectedTimelinePolicy={selectedTimelinePolicy}
          setSelectedTimelinePolicyId={setSelectedTimelinePolicyId}
        />
      )}

      <div className="policy-export-hidden" aria-hidden="true">
        <PolicySummaryExportReport
          refNode={reportRef}
          client={displayClient}
          policies={policies}
          summary={summary}
          benchmark={benchmark}
          notes={notes}
        />
      </div>

      <input
        ref={importRef}
        className="hidden-file-input"
        type="file"
        accept="application/json,.json"
        onChange={handleImport}
      />
    </main>
  );
}

function PolicySummaryCard({ policy, isEditing, setEditingId, updatePolicy, duplicatePolicy, deletePolicy }) {
  const premium = calculatePolicyPremium(policy);
  const updateBenefitCoverage = (benefitKey, field, value) => {
    const benefit = benefitCoverageDefinitions.find((item) => item.key === benefitKey);
    updatePolicy(policy.id, 'benefits', {
      ...(policy.benefits || policy.benefitCoveragePeriods || {}),
      [benefitKey]: {
        ...(policy.benefits?.[benefitKey] || policy.benefitCoveragePeriods?.[benefitKey] || {}),
        [field]: value,
      },
    });
  };
  return (
    <div className="compact-item-card policy-summary-card">
      <div className="compact-item-summary">
        <div>
          <strong>{policy.planName || 'Policy'}</strong>
          <span>Company: {textValue(policy.company)}</span>
          <span>Type: {textValue(policy.typeOfPlan)}</span>
          <span>Premium: {formatPolicyTimelinePremium(policy)}</span>
          <span>Death: {getBenefitAmountDisplay(policy, 'death')} | CI: {getBenefitAmountDisplay(policy, 'ci')}</span>
        </div>
        <div className="compact-item-value">
          <span>Annual</span>
          <strong>{formatPolicyCurrency(premium.annual || premium.single, policy.currency)}</strong>
        </div>
      </div>
      <div className="compact-item-actions">
        <button type="button" className="ghost-button compact-action" onClick={() => setEditingId(isEditing ? null : policy.id)}><Pencil size={14} /> {isEditing ? 'Close' : 'Edit'}</button>
        <button type="button" className="ghost-button compact-action" onClick={() => duplicatePolicy(policy)}><Copy size={14} /> Duplicate</button>
        <button type="button" className="icon-button" onClick={() => deletePolicy(policy.id)} aria-label="Delete policy"><Trash2 size={15} /></button>
      </div>
      {isEditing && (
        <div className="compact-edit-form">
          <details className="advanced-block" open>
            <summary>Basic Details</summary>
            <div className="form-grid compact input-compact-grid">
              <TextField label="Company" value={policy.company} onChange={(value) => updatePolicy(policy.id, 'company', value)} />
              <TextField label="Policy number" value={policy.policyNumber} onChange={(value) => updatePolicy(policy.id, 'policyNumber', value)} />
              <TextField label="Type of plan" value={policy.typeOfPlan} onChange={(value) => updatePolicy(policy.id, 'typeOfPlan', value)} />
              <TextField label="Plan name" value={policy.planName} onChange={(value) => updatePolicy(policy.id, 'planName', value)} />
              <SelectField label="Policy status" value={policy.policyStatus} onChange={(value) => updatePolicy(policy.id, 'policyStatus', value)} options={policyStatuses} />
              <TextField label="Start date" value={policy.startDate} onChange={(value) => updatePolicy(policy.id, 'startDate', value)} />
              <NumberField label="Policy start age" value={policy.ageInception} onChange={() => {}} readOnly />
              <TextField label="Currency" value={policy.currency} onChange={(value) => updatePolicy(policy.id, 'currency', value)} />
            </div>
            <p className="field-helper">Policy start age is calculated from the client date of birth and policy start date.</p>
          </details>
          <details className="advanced-block" open>
            <summary>Premium Details</summary>
            <div className="form-grid compact input-compact-grid">
              <NumberField label="Premium amount" prefix="$" value={policy.premiumAmount} onChange={(value) => updatePolicy(policy.id, 'premiumAmount', value)} />
              <SelectField label="Premium frequency" value={policy.premiumFrequency} onChange={(value) => updatePolicy(policy.id, 'premiumFrequency', value)} options={premiumFrequencies} />
              <SelectField label="Premium payable type" value={policy.premiumPayableType} onChange={(value) => updatePolicy(policy.id, 'premiumPayableType', value)} options={premiumPayableTypes} />
              {policy.premiumPayableType === 'Fixed term' && (
                <>
                  <NumberField label="Premium payable start age" value={policy.premiumPayableStartAge} onChange={(value) => updatePolicy(policy.id, 'premiumPayableStartAge', value)} />
                  <NumberField label="Premium payable duration" suffix="years" value={policy.premiumPayableDuration} onChange={(value) => updatePolicy(policy.id, 'premiumPayableDuration', value)} />
                  <NumberField label="Premium payable end age" value={policy.premiumPayableEndAge} onChange={(value) => updatePolicy(policy.id, 'premiumPayableEndAge', value)} />
                </>
              )}
              {policy.premiumPayableType === 'To age' && (
                <>
                  <NumberField label="Premium payable start age" value={policy.premiumPayableStartAge} onChange={(value) => updatePolicy(policy.id, 'premiumPayableStartAge', value)} />
                  <NumberField label="Premium payable end age" value={policy.premiumPayableEndAge} onChange={(value) => updatePolicy(policy.id, 'premiumPayableEndAge', value)} />
                </>
              )}
              {policy.premiumPayableType === 'Whole life / ongoing' && (
                <NumberField label="Premium payable start age" value={policy.premiumPayableStartAge} onChange={(value) => updatePolicy(policy.id, 'premiumPayableStartAge', value)} />
              )}
              {policy.premiumPayableType === 'Single premium' && (
                <NumberField label="Single premium age" value={policy.premiumPayableStartAge} onChange={(value) => updatePolicy(policy.id, 'premiumPayableStartAge', value)} />
              )}
              {policy.premiumPayableType === 'Fully paid' && (
                <>
                  <NumberField label="Premium start age (optional)" value={policy.premiumPayableStartAge} onChange={(value) => updatePolicy(policy.id, 'premiumPayableStartAge', value)} />
                  <NumberField label="Paid-up age (optional)" value={policy.premiumPayableEndAge} onChange={(value) => updatePolicy(policy.id, 'premiumPayableEndAge', value)} />
                </>
              )}
              <SelectField label="Pay status" value={policy.payStatus} onChange={(value) => updatePolicy(policy.id, 'payStatus', value)} options={payStatuses} />
            </div>
          </details>
          <details className="advanced-block" open>
            <summary>Coverage Details</summary>
            <div className="coverage-details-layout">
              <p>Enter each benefit amount and its coverage ages here. These rows drive the summary table, coverage totals, timeline, PDF and JSON export.</p>
              <div className="benefit-coverage-grid">
                <span>Benefit</span>
                <span>Amount</span>
                <span>Start age</span>
                <span>End age</span>
                {benefitCoverageDefinitions.map((benefit) => (
                  <div className="benefit-coverage-row" key={benefit.key}>
                    <strong>{benefit.label}</strong>
                    {benefit.type === 'text' ? (
                      <TextField
                        label={`${benefit.label} amount`}
                        value={policy.benefits?.[benefit.key]?.amount ?? policy.benefitCoveragePeriods?.[benefit.key]?.amount ?? policy[benefit.amountField] ?? ''}
                        onChange={(value) => updateBenefitCoverage(benefit.key, 'amount', value)}
                      />
                    ) : (
                      <NumberField
                        label={`${benefit.label} amount`}
                        prefix="$"
                        value={policy.benefits?.[benefit.key]?.amount ?? policy.benefitCoveragePeriods?.[benefit.key]?.amount ?? policy[benefit.amountField] ?? ''}
                        onChange={(value) => updateBenefitCoverage(benefit.key, 'amount', value)}
                      />
                    )}
                    <NumberField
                      label={`${benefit.label} start age`}
                      value={policy.benefits?.[benefit.key]?.startAge ?? policy.benefitCoveragePeriods?.[benefit.key]?.startAge ?? ''}
                      onChange={(value) => updateBenefitCoverage(benefit.key, 'startAge', value)}
                    />
                    <NumberField
                      label={`${benefit.label} end age`}
                      value={policy.benefits?.[benefit.key]?.endAge ?? policy.benefitCoveragePeriods?.[benefit.key]?.endAge ?? ''}
                      onChange={(value) => updateBenefitCoverage(benefit.key, 'endAge', value)}
                    />
                  </div>
                ))}
              </div>
              <div className="form-grid compact input-compact-grid">
                <TextField label="Other benefits" value={policy.otherBenefits} onChange={(value) => updatePolicy(policy.id, 'otherBenefits', value)} />
              </div>
            </div>
          </details>
          <details className="advanced-block">
            <summary>Policy Values</summary>
            <div className="form-grid compact input-compact-grid">
              <NumberField label="Cash value" prefix="$" value={policy.cashValue} onChange={(value) => updatePolicy(policy.id, 'cashValue', value)} />
              <Toggle
                label="Include cash value in retirement projection"
                checked={Boolean(policy.includeCashValueInRetirement)}
                onChange={(value) => updatePolicy(policy.id, 'includeCashValueInRetirement', value)}
              />
            </div>
            <p className="field-helper">If enabled, this policy's current cash value will be added as an asset in the Retirement Projection.</p>
          </details>
          <details className="advanced-block">
            <summary>Notes</summary>
            <label className="field policy-notes-field">
              <span>Notes</span>
              <textarea value={policy.notes} onChange={(event) => updatePolicy(policy.id, 'notes', event.target.value)} />
            </label>
          </details>
        </div>
      )}
    </div>
  );
}

function PolicySummaryReport({ client, policies, summary, benchmark, notes, selectedTimelinePolicy, setSelectedTimelinePolicyId }) {
  return (
    <section className="policy-report panel">
      <header className="policy-report-header avoid-break">
        <div>
          <p>Personal Wealth Planning for</p>
          <h2>{client.clientName || 'Client'}</h2>
          <span>Current as of {formatDisplayDate(client.reviewDate || new Date().toLocaleDateString('en-CA'))}</span>
          <small>Advisor: {client.advisorName || '-'}</small>
        </div>
        <img src="/logo.png" alt="Advisor logo" />
      </header>

      <div className="policy-client-strip avoid-break">
        <SummaryPill label="Date of birth" value={formatDisplayDate(client.dateOfBirth)} />
        <SummaryPill label="Age" value={client.age || '-'} />
        <SummaryPill label="Review date" value={formatDisplayDate(client.reviewDate)} />
        <SummaryPill label="Policies" value={policies.length} />
      </div>

      <div className="policy-table-card">
        <PolicySummaryTable policies={policies} summary={summary} />
      </div>

      <PolicyTimeline
        policies={policies}
        selectedPolicy={selectedTimelinePolicy}
        setSelectedPolicyId={setSelectedTimelinePolicyId}
      />

      <div className="policy-summary-grid">
        <section className="policy-mini-panel avoid-break">
          <h3>Premium Summary</h3>
          <SummaryLine label="Total monthly premium" value={<CurrencyTotalValue summary={summary} totalKey="monthlyPremium" />} />
          <SummaryLine label="Total annual premium" value={<CurrencyTotalValue summary={summary} totalKey="annualPremium" />} />
          <SummaryLine label="Single premium entered" value={<CurrencyTotalValue summary={summary} totalKey="singlePremium" />} />
        </section>

        <section className="policy-mini-panel avoid-break">
          <h3>Coverage Summary</h3>
          <SummaryLine label="Death" value={<CurrencyTotalValue summary={summary} totalKey="death" />} />
          <SummaryLine label="TPD" value={<CurrencyTotalValue summary={summary} totalKey="tpd" />} />
          <SummaryLine label="ECI" value={<CurrencyTotalValue summary={summary} totalKey="eci" />} />
          <SummaryLine label="CI" value={<CurrencyTotalValue summary={summary} totalKey="ci" />} />
          <SummaryLine label="Hospitalisation" value={summary.hospitalisationSummary} />
          <SummaryLine label="Disability income" value={<CurrencyTotalValue summary={summary} totalKey="disabilityIncome" />} />
          <SummaryLine label="Death (Accident)" value={<CurrencyTotalValue summary={summary} totalKey="deathAccident" />} />
          <SummaryLine label="TPD (Accident)" value={<CurrencyTotalValue summary={summary} totalKey="tpdAccident" />} />
          <SummaryLine label="Medical reimbursement" value={<CurrencyTotalValue summary={summary} totalKey="medicalReimbursementAccident" />} />
          <SummaryLine label="Hospital income" value={<CurrencyTotalValue summary={summary} totalKey="hospitalIncome" />} />
        </section>

        <section className="policy-mini-panel avoid-break">
          <h3>Policy Gap Summary</h3>
          <SummaryLine label={`${summary.benchmarkCurrency} annual income benchmark`} value={formatPolicyCurrencyWithLabel(benchmark.annualIncome, summary.benchmarkCurrency)} />
          {summary.currencies.map((currency) => {
            const gap = summary.gapsByCurrency[currency];
            return (
              <div className="currency-gap-block" key={currency}>
                <span>{currency}</span>
                {gap.hasBenchmark ? (
                  <strong>
                    Death gap: {formatPolicyCurrencyWithLabel(gap.deathGap, currency)}
                    <br />
                    CI gap: {formatPolicyCurrencyWithLabel(gap.ciGap, currency)}
                  </strong>
                ) : (
                  <strong>
                    Death cover: {formatPolicyCurrencyWithLabel(gap.currentDeath, currency)}
                    <br />
                    No {currency} benchmark entered
                  </strong>
                )}
              </div>
            );
          })}
        </section>
      </div>

      <section className="policy-notes avoid-break">
        <h3>Notes / Disclaimer</h3>
        <p>{notes || 'No notes entered.'}</p>
        <p>{disclaimer}</p>
      </section>
    </section>
  );
}

function PolicySummaryTable({ policies, summary }) {
  const tablePremiumTotalsByCurrency = calculatePolicyTablePremiumTotalsByCurrency(policies);
  return (
    <table className="policy-summary-table">
      <thead>
        <tr>
          <th>Field</th>
          {policies.map((policy, index) => <th key={policy.id}>{policy.planName || `Policy ${index + 1}`}</th>)}
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {policyRows.map((row) => (
          <tr
            key={row.label}
            className={row.highlight ? 'coverage-row' : ''}
            style={row.benefitKey ? {
              '--benefit-color': getBenefitColor(row.benefitKey),
              '--benefit-tint': getBenefitTint(row.benefitKey),
            } : undefined}
          >
            <th>{row.label}</th>
            {policies.map((policy) => <td key={`${policy.id}-${row.label}`}>{row.get(policy)}</td>)}
            <td>
              {row.totalKey ? (
                <CurrencyTotalValue
                  summary={summary}
                  totalKey={row.totalKey}
                  totalsByCurrency={row.premiumTableTotal ? tablePremiumTotalsByCurrency : undefined}
                />
              ) : '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PolicyTimeline({ policies, selectedPolicy, setSelectedPolicyId }) {
  const policyTimelineRows = policies.map((policy) => ({
    policy,
    premium: getPremiumPeriod(policy),
    benefits: getBenefitCoverageDetails(policy).filter((period) => period.hasBar),
  }));
  const periods = policyTimelineRows.flatMap((row) => [row.premium, ...row.benefits])
    .filter((period) => period.hasBar);
  const minAge = periods.length > 0
    ? Math.max(0, Math.floor(Math.min(...periods.map((period) => period.startAge)) / 5) * 5)
    : 25;
  const maxAge = periods.length > 0
    ? Math.min(99, Math.max(85, Math.ceil(Math.max(...periods.map((period) => period.endAge)) / 5) * 5))
    : 85;
  const range = Math.max(1, maxAge - minAge);
  const ticks = buildPolicyTimelineTicks(minAge, maxAge);
  const toStyle = (period) => {
    if (!period?.hasBar || !isValidTimelineAge(period.startAge) || !isValidTimelineAge(period.endAge)) {
      return {};
    }
    return {
      left: `${Math.max(0, ((period.startAge - minAge) / range) * 100)}%`,
      width: `${Math.max(period.startAge === period.endAge ? 2 : 4, ((period.endAge - period.startAge) / range) * 100)}%`,
    };
  };

  return (
    <section className="policy-timeline-section avoid-break">
      <div className="section-header">
        <div>
          <h2>Policy Timeline</h2>
          <p className="section-subtext">Premium payable periods and coverage periods by policy.</p>
        </div>
      </div>
      <div className="policy-timeline-legend">
        <span><i className="premium" /> Premium Payable</span>
        <span><i className="benefit" /> Benefit Coverage</span>
        <span><b className="fully-paid">Fully Paid</b></span>
        <span><b className="ended">Expired / Ended</b></span>
        <span><b className="lapsed">Lapsed</b></span>
      </div>
      <div className="policy-timeline-shared">
        <div className="policy-timeline-list">
          {policyTimelineRows.map(({ policy, premium, benefits }) => {
            const trackHeight = Math.max(50, 36 + (benefits.length * 16));
            return (
              <button
                type="button"
                className={`policy-timeline-row ${selectedPolicy?.id === policy.id ? 'active' : ''} ${getStatusClass(policy)}`}
                key={policy.id}
                onClick={() => setSelectedPolicyId(policy.id)}
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
                      key={`${policy.id}-${tick}`}
                      style={{ left: `${((tick - minAge) / range) * 100}%` }}
                    />
                  ))}
                  <TimelineBar period={premium} type="premium" style={premium.hasBar ? toStyle(premium) : {}} />
                  {benefits.map((period, index) => (
                    <TimelineBar
                      key={`${policy.id}-${period.key}`}
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
                <span className={`policy-status-badge ${getStatusClass(policy)}`}>{getTimelineStatus(policy)}</span>
              </button>
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
      {selectedPolicy && (
        <div className="policy-timeline-detail">
          <h3>{selectedPolicy.planName || 'Policy'}</h3>
          <div>
            <SummaryLine label="Policy start date" value={formatDisplayDate(selectedPolicy.startDate)} />
            <SummaryLine label="Premium payable period" value={getPremiumPeriod(selectedPolicy).label} />
            {getBenefitCoverageDetails(selectedPolicy).map((benefit) => (
              <SummaryLine
                key={`${selectedPolicy.id}-${benefit.key}-detail`}
                label={benefit.label}
                value={`${benefit.amountDisplay} | ${benefit.periodLabel}`}
              />
            ))}
            <SummaryLine label="Premium" value={formatPolicyTimelinePremium(selectedPolicy)} />
            <SummaryLine label="Notes" value={selectedPolicy.notes || '-'} />
          </div>
        </div>
      )}
      <h3 className="export-subheading">Policy Timeline Summary</h3>
      <table className="policy-timeline-export-table">
        <thead>
          <tr>
            <th>Policy</th>
            <th>Premium Payable Period</th>
            <th>Benefit Coverage Periods</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((policy) => (
            <tr key={`${policy.id}-timeline-row`}>
              <td>{policy.planName || 'Policy'}</td>
              <td>{getPremiumPeriod(policy).label}</td>
              <td>{summarizeBenefitPeriods(policy)}</td>
              <td>{getTimelineStatus(policy)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function buildPolicyTimelineTicks(minAge, maxAge) {
  const ticks = [];
  for (let age = minAge; age <= maxAge; age += 5) ticks.push(age);
  if (maxAge === 99 && !ticks.includes(99)) ticks.push(99);
  if (!ticks.includes(maxAge)) ticks.push(maxAge);
  return ticks;
}

function TimelineBar({ period, type, style }) {
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

function summarizeBenefitPeriods(policy) {
  const benefits = getBenefitCoverageDetails(policy).filter((benefit) => benefit.hasBar);
  if (benefits.length === 0) return '-';
  return benefits.map((benefit) => `${benefit.label}: ${benefit.periodLabel}`).join('; ');
}

function SummaryPill({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryLine({ label, value, tone }) {
  return (
    <div className={tone || ''}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CurrencyTotalValue({ summary, totalKey, suffix = '', totalsByCurrency }) {
  const sourceTotals = totalsByCurrency || summary.totalsByCurrency;
  const values = formatCurrencyTotals(sourceTotals, totalKey, { includeZero: summary.currencies.length <= 1, suffix });
  return (
    <span className="currency-total-list">
      {values.length > 0 ? values.map((value) => <b key={value}>{value}</b>) : <b>-</b>}
    </span>
  );
}

function textValue(value) {
  return value || '-';
}

function isValidTimelineAge(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizePolicyPremiumFields(policy, updatedKey = '') {
  const benefit = benefitCoverageDefinitions.find((item) => item.amountField === updatedKey);
  const syncedPolicy = benefit ? {
    ...policy,
    benefits: {
      ...(policy.benefits || {}),
      [benefit.key]: {
        ...(policy.benefits?.[benefit.key] || {}),
        amount: policy[benefit.amountField],
      },
    },
    benefitCoveragePeriods: {
      ...(policy.benefitCoveragePeriods || {}),
      [benefit.key]: {
        ...(policy.benefitCoveragePeriods?.[benefit.key] || {}),
        amount: policy[benefit.amountField],
      },
    },
  } : policy;
  if (syncedPolicy.premiumPayableType !== 'Fixed term') return syncedPolicy;
  const startAge = toLocalNumber(syncedPolicy.premiumPayableStartAge);
  const duration = toLocalNumber(syncedPolicy.premiumPayableDuration);
  if (startAge === '' || duration === '') return syncedPolicy;
  return { ...syncedPolicy, premiumPayableEndAge: startAge + duration };
}

function arePoliciesEquivalent(first, second) {
  return JSON.stringify(first) === JSON.stringify(second);
}

function toLocalNumber(value) {
  if (value === '' || value === null || typeof value === 'undefined') return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
}

function buildPolicySummaryPdfFilename(clientName, date) {
  const cleanName = (clientName || '')
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return `${cleanName ? `${cleanName}-` : ''}Policy-Summary-${date}.pdf`;
}
