export const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const shortDate = (value: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
};

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const uuid = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
