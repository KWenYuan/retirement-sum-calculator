export const ASSET_COLORS = {
  total: '#102a4c',
  cpf: '#4d7ea8',
  srs: '#c49a43',
  policy: '#15345f',
  investment: '#7b61a8',
  cash: '#7b8492',
  lumpSum: '#c49a43',
  incomeStream: '#2f855a',
};

export const POLICY_COLORS = ['#15345f', '#1f4977', '#2c5f94', '#344054'];

export const INVESTMENT_COLORS = ['#7b61a8', '#8f72c7', '#5f4b8b', '#a88bd8'];

export const BREAKDOWN_COLORS = {
  CPF: ASSET_COLORS.cpf,
  SRS: ASSET_COLORS.srs,
  Policies: ASSET_COLORS.policy,
  Investments: ASSET_COLORS.investment,
  Cash: ASSET_COLORS.cash,
};

export const INCOME_SOURCE_COLORS = {
  CPF: ASSET_COLORS.cpf,
  SRS: ASSET_COLORS.srs,
  Policy: ASSET_COLORS.policy,
  Investment: ASSET_COLORS.investment,
  Cash: ASSET_COLORS.cash,
};

export function getIncomeSourceColor(source = '', index = 0) {
  const normalized = source.toLowerCase();
  if (normalized.includes('cpf')) return INCOME_SOURCE_COLORS.CPF;
  if (normalized.includes('srs')) return INCOME_SOURCE_COLORS.SRS;
  if (normalized.includes('policy')) return INCOME_SOURCE_COLORS.Policy;
  if (normalized.includes('investment')) return INCOME_SOURCE_COLORS.Investment;
  if (normalized.includes('cash')) return INCOME_SOURCE_COLORS.Cash;
  return [ASSET_COLORS.incomeStream, ASSET_COLORS.policy, ASSET_COLORS.investment][index % 3];
}
