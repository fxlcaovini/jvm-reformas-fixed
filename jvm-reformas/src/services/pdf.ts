import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Budget, BudgetItem, Client, Project } from '@/types/models';
import { money, shortDate } from '@/utils/format';

export async function exportBudgetPdf(
  budget: Budget,
  items: BudgetItem[],
  client?: Client | null,
  project?: Project | null
) {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.quantity}</td>
        <td>${money(item.unitPrice)}</td>
        <td>${money(item.quantity * item.unitPrice)}</td>
      </tr>`
    )
    .join('');

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; padding: 28px; color: #0f172a; }
        .header { background: #0f766e; color: white; padding: 18px; border-radius: 16px; }
        .grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; margin-top: 18px; }
        .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 18px; }
        th, td { padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: left; }
        th { background: #ecfeff; }
        .total { margin-top: 18px; font-size: 22px; font-weight: bold; text-align: right; }
        .footer { margin-top: 28px; color: #475569; font-size: 12px; }
        img.signature { max-width: 220px; max-height: 100px; object-fit: contain; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>JVM REFORMAS</h1>
        <p>${budget.title}</p>
      </div>

      <div class="grid">
        <div class="box">
          <strong>Cliente</strong>
          <div>${client?.name ?? '-'}</div>
          <div>${client?.phone ?? '-'}</div>
          <div>${client?.email ?? '-'}</div>
        </div>
        <div class="box">
          <strong>Obra</strong>
          <div>${project?.title ?? '-'}</div>
          <div>${project?.address ?? '-'}</div>
          <div>Prazo: ${project?.dueDate ? shortDate(project.dueDate) : '-'}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qtd.</th>
            <th>Unitário</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="total">Total do orçamento: ${money(budget.total)}</div>

      <div class="box" style="margin-top:18px;">
        <strong>Observações</strong>
        <div>${budget.notes || 'Sem observações.'}</div>
      </div>

      <div class="box" style="margin-top:18px;">
        <strong>Assinatura digital do cliente</strong>
        ${budget.signatureDataUrl ? `<div><img class="signature" src="${budget.signatureDataUrl}" /></div>` : '<div>Não coletada.</div>'}
      </div>

      <div class="footer">
        Documento gerado em ${new Date().toLocaleString('pt-BR')} pelo app JVM Reformas.
      </div>
    </body>
  </html>`;

  const result = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar orçamento' });
  }
  return result.uri;
}
