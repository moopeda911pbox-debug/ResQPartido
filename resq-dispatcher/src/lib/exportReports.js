import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND_ORANGE = [224, 83, 10];
const BRAND_NAVY = [15, 37, 69];

function timestamp() {
  return new Date().toISOString().slice(0, 10);
}

// Prevents CSV/Excel formula injection: if a citizen-submitted field
// (description, address, name) starts with =, +, -, or @, Excel may try
// to evaluate it as a formula when a dispatcher opens the exported file.
// Prefixing with a straight quote makes Excel treat it as plain text.
function sheetSafe(value) {
  const str = value == null ? "" : String(value);
  return /^[=+\-@]/.test(str) ? `'${str}` : str;
}

function reporterName(inc) {
  const p = inc.profiles;
  const name = [p?.first_name, p?.last_name].filter(Boolean).join(" ").trim();
  return name || "Unknown";
}

function incidentRow(inc) {
  return {
    Type: sheetSafe(inc.incident_type),
    Description: sheetSafe(inc.description),
    "Reported By": sheetSafe(reporterName(inc)),
    Municipality: sheetSafe(inc.profiles?.municipality || ""),
    Status: sheetSafe(inc.status),
    Submitted: inc.created_at ? new Date(inc.created_at).toLocaleString() : "",
    Verified: inc.verified_at ? new Date(inc.verified_at).toLocaleString() : "",
    Responded: inc.responded_at ? new Date(inc.responded_at).toLocaleString() : "",
    Latitude: inc.latitude ?? "",
    Longitude: inc.longitude ?? "",
    Address: sheetSafe(inc.address ?? ""),
  };
}

function docHeader(doc, title, subtitle) {
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_NAVY);
  doc.text(title, 14, 16);
  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(subtitle, 14, 22);
  }
  return subtitle ? 27 : 22;
}

// ---------------------------------------------------------------
// Manage Reports — export the incident list (respects whatever
// filter/tab is currently applied on screen, since callers pass in
// the already-filtered array).
// ---------------------------------------------------------------

export function exportIncidentsToExcel(incidents, { filename, sheetName = "Reports" } = {}) {
  const rows = incidents.map(incidentRow);
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 18 }, { wch: 40 }, { wch: 18 }, { wch: 14 }, { wch: 12 },
    { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 11 }, { wch: 11 }, { wch: 30 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename || `resqpartido-reports-${timestamp()}.xlsx`);
}

export function exportIncidentsToPDF(incidents, { filename, title = "ResQPartido — Incident Reports", subtitle } = {}) {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = docHeader(doc, title, subtitle || `Generated ${new Date().toLocaleString()} · ${incidents.length} reports`);

  autoTable(doc, {
    startY,
    head: [["Type", "Description", "Reported By", "Municipality", "Status", "Submitted"]],
    body: incidents.map((inc) => [
      inc.incident_type,
      (inc.description || "").slice(0, 90),
      reporterName(inc),
      inc.profiles?.municipality || "",
      inc.status,
      inc.created_at ? new Date(inc.created_at).toLocaleString() : "",
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: BRAND_ORANGE, textColor: 255 },
    alternateRowStyles: { fillColor: [249, 249, 249] },
  });

  doc.save(filename || `resqpartido-reports-${timestamp()}.pdf`);
}

// ---------------------------------------------------------------
// Analytics & Report — export the summary stats + chart data
// currently shown on screen.
// ---------------------------------------------------------------

export function exportAnalyticsToExcel({ counts, incidentTypeData, trend, municipalityData }, { filename } = {}) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      { Metric: "Total Reports", Value: counts.total },
      { Metric: "Pending", Value: counts.pending },
      { Metric: "Verified", Value: counts.acknowledged },
      { Metric: "Responded", Value: counts.resolved },
    ]),
    "Summary"
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(incidentTypeData.map((d) => ({ Type: d.type, Count: d.count }))),
    "Incident Types"
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(municipalityData.map((d) => ({ Municipality: d.type, Count: d.count }))),
    "By Municipality"
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      trend.map((d) => ({
        Date: d.label,
        Pending: d.pending,
        Verified: d.acknowledged,
        Responded: d.resolved,
        Total: d.total,
      }))
    ),
    "Daily Trend"
  );

  XLSX.writeFile(wb, filename || `resqpartido-analytics-${timestamp()}.xlsx`);
}

export function exportAnalyticsToPDF(
  { counts, incidentTypeData, trend, municipalityData },
  { filename, rangeLabel } = {}
) {
  const doc = new jsPDF({ orientation: "landscape" });
  let y = docHeader(
    doc,
    "ResQPartido — Analytics & Report",
    `Generated ${new Date().toLocaleString()}${rangeLabel ? ` · Trend range: ${rangeLabel}` : ""}`
  );

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Total Reports", counts.total],
      ["Pending", counts.pending],
      ["Verified", counts.acknowledged],
      ["Responded", counts.resolved],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: BRAND_ORANGE, textColor: 255 },
    tableWidth: 100,
  });

  y = doc.lastAutoTable.finalY + 12;
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_NAVY);
  doc.text("Incident Types", 14, y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Type", "Count"]],
    body: incidentTypeData.map((d) => [d.type, d.count]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND_ORANGE, textColor: 255 },
    tableWidth: 100,
  });

  y = doc.lastAutoTable.finalY + 12;
  doc.text("Reports by Municipality", 14, y);
  autoTable(doc, {
    startY: y + 4,
    head: [["Municipality", "Count"]],
    body: municipalityData.map((d) => [d.type, d.count]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND_ORANGE, textColor: 255 },
    tableWidth: 100,
  });

  doc.addPage();
  doc.setFontSize(12);
  doc.setTextColor(...BRAND_NAVY);
  doc.text("Reports Over Time", 14, 16);
  autoTable(doc, {
    startY: 22,
    head: [["Date", "Pending", "Verified", "Responded", "Total"]],
    body: trend.map((d) => [d.label, d.pending, d.acknowledged, d.resolved, d.total]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND_ORANGE, textColor: 255 },
  });

  doc.save(filename || `resqpartido-analytics-${timestamp()}.pdf`);
}
