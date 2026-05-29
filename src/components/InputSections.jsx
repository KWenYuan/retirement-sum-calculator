import { Plus, Trash2 } from 'lucide-react';
import { NumberField, SectionHeader, SelectField, TextField, Toggle } from './FormControls.jsx';

export function ProfileSection({ profile, setProfile }) {
  const update = (key, value) => setProfile((current) => ({ ...current, [key]: value }));
  return (
    <section className="panel">
      <SectionHeader title="Client Profile" />
      <div className="form-grid">
        <TextField label="Client name" value={profile.clientName} onChange={(value) => update('clientName', value)} />
        <NumberField label="Current age" value={profile.currentAge} onChange={(value) => update('currentAge', value)} />
        <NumberField label="Target retirement age" value={profile.retirementAge} onChange={(value) => update('retirementAge', value)} />
        <NumberField label="Monthly income" prefix="$" value={profile.monthlyIncome} onChange={(value) => update('monthlyIncome', value)} />
        <NumberField label="Monthly expenses" prefix="$" value={profile.monthlyExpenses} onChange={(value) => update('monthlyExpenses', value)} />
        <NumberField label="Monthly savings" prefix="$" value={profile.monthlySavings} onChange={(value) => update('monthlySavings', value)} />
        <NumberField label="Desired retirement income" prefix="$" value={profile.desiredMonthlyIncome} onChange={(value) => update('desiredMonthlyIncome', value)} />
        <NumberField label="Inflation rate" suffix="%" step={0.1} value={profile.inflationRate} onChange={(value) => update('inflationRate', value)} />
        <NumberField label="General return rate" suffix="%" step={0.1} value={profile.generalReturnRate} onChange={(value) => update('generalReturnRate', value)} />
        <NumberField label="Retirement duration" suffix="years" value={profile.retirementDuration} onChange={(value) => update('retirementDuration', value)} />
        <NumberField label="Withdrawal rate" suffix="%" step={0.1} value={profile.withdrawalRate} onChange={(value) => update('withdrawalRate', value)} />
      </div>
    </section>
  );
}

export function CpfSection({ cpf, setCpf }) {
  const update = (key, value) => setCpf((current) => ({ ...current, [key]: value }));
  return (
    <section className="panel">
      <SectionHeader title="CPF" action={<Toggle label="Enabled" checked={cpf.enabled} onChange={(value) => update('enabled', value)} />} />
      {cpf.enabled && (
        <div className="form-grid">
          <NumberField label="CPF OA balance" prefix="$" value={cpf.oaBalance} onChange={(value) => update('oaBalance', value)} />
          <NumberField label="CPF SA balance" prefix="$" value={cpf.saBalance} onChange={(value) => update('saBalance', value)} />
          <NumberField label="CPF MA balance" prefix="$" value={cpf.maBalance} onChange={(value) => update('maBalance', value)} />
          <NumberField label="Monthly CPF contribution" prefix="$" value={cpf.monthlyContribution} onChange={(value) => update('monthlyContribution', value)} />
          <NumberField label="CPF annual interest" suffix="%" step={0.1} value={cpf.annualInterest} onChange={(value) => update('annualInterest', value)} />
          <NumberField label="FRS amount at age 55" prefix="$" value={cpf.frsAmountAt55} onChange={(value) => update('frsAmountAt55', value)} />
          <NumberField label="CPF LIFE payout start age" value={cpf.cpfLifePayoutStartAge} onChange={(value) => update('cpfLifePayoutStartAge', value)} />
          <NumberField label="CPF LIFE monthly payout" prefix="$" value={cpf.cpfLifeMonthlyPayout} onChange={(value) => update('cpfLifeMonthlyPayout', value)} />
          <Toggle label="Include CPF in retirement total" checked={cpf.includeInTotal} onChange={(value) => update('includeInTotal', value)} />
        </div>
      )}
    </section>
  );
}

export function SrsSection({ srs, setSrs }) {
  const update = (key, value) => setSrs((current) => ({ ...current, [key]: value }));
  return (
    <section className="panel">
      <SectionHeader title="SRS" action={<Toggle label="Enabled" checked={srs.enabled} onChange={(value) => update('enabled', value)} />} />
      {srs.enabled && (
        <div className="form-grid">
          <NumberField label="Current SRS balance" prefix="$" value={srs.currentBalance} onChange={(value) => update('currentBalance', value)} />
          <NumberField label="Annual SRS contribution" prefix="$" value={srs.annualContribution} onChange={(value) => update('annualContribution', value)} />
          <NumberField label="Expected annual return" suffix="%" step={0.1} value={srs.annualReturn} onChange={(value) => update('annualReturn', value)} />
          <NumberField label="Planned withdrawal age" value={srs.withdrawalAge} onChange={(value) => update('withdrawalAge', value)} />
          <NumberField label="Withdrawal start age" value={srs.withdrawalStartAge} onChange={(value) => update('withdrawalStartAge', value)} />
          <NumberField label="Withdrawal duration" suffix="years" value={srs.withdrawalDurationYears} onChange={(value) => update('withdrawalDurationYears', value)} />
          <SelectField label="Withdrawal frequency" value={srs.withdrawalFrequency} onChange={(value) => update('withdrawalFrequency', value)} options={['monthly', 'yearly']} />
        </div>
      )}
    </section>
  );
}

export function CashSection({ cash, setCash }) {
  const update = (key, value) => setCash((current) => ({ ...current, [key]: value }));
  return (
    <section className="panel">
      <SectionHeader title="Cash / Savings" />
      <div className="form-grid">
        <NumberField label="Current cash savings" prefix="$" value={cash.currentSavings} onChange={(value) => update('currentSavings', value)} />
        <NumberField label="Monthly cash savings" prefix="$" value={cash.monthlySavings} onChange={(value) => update('monthlySavings', value)} />
        <NumberField label="Expected annual interest" suffix="%" step={0.1} value={cash.annualInterest} onChange={(value) => update('annualInterest', value)} />
        <NumberField label="Emergency fund amount" prefix="$" value={cash.emergencyFund} onChange={(value) => update('emergencyFund', value)} />
        <SelectField label="Timeline withdrawal type" value={cash.withdrawalType || 'Lump sum'} onChange={(value) => update('withdrawalType', value)} options={['Not shown on timeline', 'Lump sum', 'Monthly income', 'Yearly income']} />
        <NumberField label="Planned withdrawal age" value={cash.plannedWithdrawalAge} onChange={(value) => update('plannedWithdrawalAge', value)} />
        {(cash.withdrawalType === 'Monthly income' || cash.withdrawalType === 'Yearly income') && (
          <NumberField label="Withdrawal end age" value={cash.withdrawalEndAge} onChange={(value) => update('withdrawalEndAge', value)} />
        )}
        <Toggle label="Include emergency fund" checked={cash.includeEmergencyFund} onChange={(value) => update('includeEmergencyFund', value)} />
      </div>
    </section>
  );
}

export function PoliciesSection({ policies, setPolicies }) {
  const addPolicy = () => setPolicies((current) => [
    ...current,
    {
      id: crypto.randomUUID(),
      name: 'New Policy',
      type: 'Investment-linked',
      startAge: 40,
      startYear: '',
      currentValue: 0,
      premiumAmount: 500,
      premiumFrequency: 'monthly',
      premiumTermYears: 10,
      annualReturn: 5,
      useScenarioReturn: true,
      withdrawalAge: 65,
      withdrawalType: 'Lump sum',
      withdrawalEndAge: 75,
    },
  ]);
  const updatePolicy = (id, key, value) => setPolicies((current) => current.map((policy) => (
    policy.id === id ? { ...policy, [key]: value } : policy
  )));
  const removePolicy = (id) => setPolicies((current) => current.filter((policy) => policy.id !== id));

  return (
    <section className="panel wide-panel">
      <SectionHeader
        title="Investment Policies"
        action={<button className="ghost-button" type="button" onClick={addPolicy}><Plus size={16} /> Add Policy</button>}
      />
      <div className="stack">
        {policies.map((policy) => (
          <div className="repeat-card" key={policy.id}>
            <div className="repeat-title">
              <strong>{policy.name || 'Policy'}</strong>
              <button className="icon-button" type="button" onClick={() => removePolicy(policy.id)} aria-label="Remove policy">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="form-grid compact">
              <TextField label="Policy name" value={policy.name} onChange={(value) => updatePolicy(policy.id, 'name', value)} />
              <TextField label="Policy type" value={policy.type} onChange={(value) => updatePolicy(policy.id, 'type', value)} />
              <NumberField label="Start age" value={policy.startAge} onChange={(value) => updatePolicy(policy.id, 'startAge', value)} />
              <TextField label="Start year" value={policy.startYear} onChange={(value) => updatePolicy(policy.id, 'startYear', value)} />
              <NumberField label="Current value" prefix="$" value={policy.currentValue} onChange={(value) => updatePolicy(policy.id, 'currentValue', value)} />
              <NumberField label="Premium amount" prefix="$" value={policy.premiumAmount} onChange={(value) => updatePolicy(policy.id, 'premiumAmount', value)} />
              <SelectField label="Premium frequency" value={policy.premiumFrequency} onChange={(value) => updatePolicy(policy.id, 'premiumFrequency', value)} options={['monthly', 'quarterly', 'semi-annually', 'annually']} />
              <NumberField label="Premium term" suffix="years" value={policy.premiumTermYears} onChange={(value) => updatePolicy(policy.id, 'premiumTermYears', value)} />
              <NumberField label="Expected return" suffix="%" step={0.1} value={policy.annualReturn} onChange={(value) => updatePolicy(policy.id, 'annualReturn', value)} />
              <NumberField label="Withdrawal age" value={policy.withdrawalAge} onChange={(value) => updatePolicy(policy.id, 'withdrawalAge', value)} />
              <SelectField label="Withdrawal type" value={policy.withdrawalType || 'Lump sum'} onChange={(value) => updatePolicy(policy.id, 'withdrawalType', value)} options={['Lump sum', 'Monthly income', 'Yearly income']} />
              {(policy.withdrawalType === 'Monthly income' || policy.withdrawalType === 'Yearly income') && (
                <NumberField label="Withdrawal end age" value={policy.withdrawalEndAge || policy.withdrawalAge + 10} onChange={(value) => updatePolicy(policy.id, 'withdrawalEndAge', value)} />
              )}
              <Toggle label="Use scenario return" checked={policy.useScenarioReturn} onChange={(value) => updatePolicy(policy.id, 'useScenarioReturn', value)} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function InvestmentsSection({ investments, setInvestments }) {
  const addInvestment = () => setInvestments((current) => [
    ...current,
    {
      id: crypto.randomUUID(),
      name: 'New Investment',
      currentValue: 0,
      monthlyContribution: 1000,
      annualReturn: 5,
      useScenarioReturn: true,
      riskLevel: 'Balanced',
      includeInTotal: true,
      plannedWithdrawalAge: 65,
      withdrawalType: 'Lump sum',
      withdrawalEndAge: 75,
    },
  ]);
  const updateInvestment = (id, key, value) => setInvestments((current) => current.map((investment) => (
    investment.id === id ? { ...investment, [key]: value } : investment
  )));
  const removeInvestment = (id) => setInvestments((current) => current.filter((investment) => investment.id !== id));

  return (
    <section className="panel wide-panel">
      <SectionHeader
        title="Personal Investments"
        action={<button className="ghost-button" type="button" onClick={addInvestment}><Plus size={16} /> Add Investment</button>}
      />
      <div className="stack">
        {investments.map((investment) => (
          <div className="repeat-card" key={investment.id}>
            <div className="repeat-title">
              <strong>{investment.name || 'Investment'}</strong>
              <button className="icon-button" type="button" onClick={() => removeInvestment(investment.id)} aria-label="Remove investment">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="form-grid compact">
              <TextField label="Investment name" value={investment.name} onChange={(value) => updateInvestment(investment.id, 'name', value)} />
              <NumberField label="Current value" prefix="$" value={investment.currentValue} onChange={(value) => updateInvestment(investment.id, 'currentValue', value)} />
              <NumberField label="Monthly contribution" prefix="$" value={investment.monthlyContribution} onChange={(value) => updateInvestment(investment.id, 'monthlyContribution', value)} />
              <NumberField label="Expected return" suffix="%" step={0.1} value={investment.annualReturn} onChange={(value) => updateInvestment(investment.id, 'annualReturn', value)} />
              <SelectField label="Risk level" value={investment.riskLevel} onChange={(value) => updateInvestment(investment.id, 'riskLevel', value)} options={['Conservative', 'Balanced', 'Growth']} />
              <SelectField label="Timeline withdrawal type" value={investment.withdrawalType || 'Lump sum'} onChange={(value) => updateInvestment(investment.id, 'withdrawalType', value)} options={['Not shown on timeline', 'Lump sum', 'Monthly income', 'Yearly income']} />
              <NumberField label="Planned withdrawal age" value={investment.plannedWithdrawalAge} onChange={(value) => updateInvestment(investment.id, 'plannedWithdrawalAge', value)} />
              {investment.withdrawalType !== 'Lump sum' && investment.withdrawalType !== 'Not shown on timeline' && (
                <NumberField label="Withdrawal end age" value={investment.withdrawalEndAge} onChange={(value) => updateInvestment(investment.id, 'withdrawalEndAge', value)} />
              )}
              <Toggle label="Use scenario return" checked={investment.useScenarioReturn} onChange={(value) => updateInvestment(investment.id, 'useScenarioReturn', value)} />
              <Toggle label="Include in retirement total" checked={investment.includeInTotal} onChange={(value) => updateInvestment(investment.id, 'includeInTotal', value)} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
