export function exportTableToCsv(table: HTMLTableElement, filename: string): void {
  const headers = Array.from(table.querySelectorAll('thead th')).map((cell) =>
    csvCell(cell.textContent?.trim() ?? ''),
  );
  const rows = Array.from(table.querySelectorAll('tbody tr')).map((row) =>
    Array.from(row.querySelectorAll('th, td')).map((cell) =>
      csvCell(cell.textContent?.trim() ?? ''),
    ),
  );
  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvCell(value: string): string {
  const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
