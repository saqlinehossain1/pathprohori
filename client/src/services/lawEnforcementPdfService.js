import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates and downloads a structured, official Law Enforcement PDF document
 * compiling high-severity validated neighborhood threat reports.
 *
 * @param {Object} params
 * @param {Array} params.incidents - Array of incident objects
 * @param {Object} params.generatedBy - Admin user object { name, email, role, id }
 * @param {String} params.filterArea - Optional neighborhood filter name
 */
export const exportLawEnforcementPDF = ({ incidents = [], generatedBy = {}, filterArea = 'All Neighborhoods' }) => {
  const jsPDFClass = typeof jsPDF === 'function' ? jsPDF : (jsPDF?.jsPDF || jsPDF?.default || jsPDF);
  const doc = new jsPDFClass({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const primaryColor = [225, 29, 72]; // Rose/Crimson #E11D48
  const darkColor = [15, 23, 42]; // Slate-900 #0F172A
  const mutedColor = [100, 116, 139]; // Slate-500 #64748B
  const lightBg = [248, 250, 252]; // Slate-50 #F8FAFC
  const borderLine = [226, 232, 240]; // Slate-200 #E2E8F0

  const now = new Date();
  const reportDateStr = now.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const reportTimeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const reportId = `PPR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  let currentY = 14;

  // Helper: Draw Header Banner on top of Page 1
  const drawHeaderBanner = () => {
    // Header background bar
    doc.setFillColor(...darkColor);
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Accent line
    doc.setFillColor(...primaryColor);
    doc.rect(0, 28, pageWidth, 2, 'F');

    // Title text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('PATHPROHORI — HYPERLOCAL THREAT TELEMETRY REPORT', margin, 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(244, 114, 182); // Rose-300
    doc.text('OFFICIAL LAW-ENFORCEMENT HANDOVER DOSSIER // CONFIDENTIAL', margin, 18);

    doc.setTextColor(203, 213, 225); // Slate-300
    doc.text(`REPORT ID: ${reportId}`, pageWidth - margin, 12, { align: 'right' });
    doc.text(`GENERATED: ${reportDateStr} ${reportTimeStr}`, pageWidth - margin, 18, { align: 'right' });

    currentY = 36;
  };

  drawHeaderBanner();

  // Metadata Classification Box
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderLine);
  doc.roundedRect(margin, currentY, contentWidth, 24, 3, 3, 'FD');

  doc.setTextColor(...darkColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORT CLASSIFICATION & METADATA', margin + 4, currentY + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text(`Target Authority: Local Police Department & Operations Command`, margin + 4, currentY + 12);
  doc.text(`Filter Scope: ${filterArea}`, margin + 4, currentY + 17);

  const adminName = generatedBy.name || 'System Admin';
  const adminEmail = generatedBy.email || 'admin@pathprohori.com';
  doc.text(`Authorizing Officer: ${adminName} (${adminEmail})`, pageWidth / 2 + 10, currentY + 12);
  doc.text(`Platform Infrastructure: PATHPROHORI Hyperlocal Transit Safety 2.0`, pageWidth / 2 + 10, currentY + 17);

  currentY += 30;

  // Executive Summary Metrics Cards
  const highSeverityCount = incidents.filter((i) => ['High Alert', 'Critical', 'Emergency'].includes(i.severity)).length;
  const totalUpvotes = incidents.reduce((acc, i) => acc + (i.upvotes?.length || i.votes || 0), 0);
  const uniqueAreas = new Set(incidents.map((i) => i.locationName?.split(',')[0]?.trim()).filter(Boolean));

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('EXECUTIVE THREAT METRICS SUMMARY', margin, currentY);
  currentY += 4;

  const cardWidth = (contentWidth - 8) / 3;

  // Card 1: Total Threats
  doc.setFillColor(254, 242, 242); // Rose-50
  doc.setDrawColor(254, 205, 211); // Rose-200
  doc.roundedRect(margin, currentY, cardWidth, 18, 2, 2, 'FD');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text(String(incidents.length), margin + 4, currentY + 9);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text('TOTAL VALIDATED THREATS', margin + 4, currentY + 14);

  // Card 2: High Severity Alerts
  doc.setFillColor(254, 243, 199); // Amber-50
  doc.setDrawColor(253, 230, 138); // Amber-200
  doc.roundedRect(margin + cardWidth + 4, currentY, cardWidth, 18, 2, 2, 'FD');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 119, 6); // Amber-600
  doc.text(String(highSeverityCount), margin + cardWidth + 8, currentY + 9);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text('HIGH SEVERITY / CRITICAL ALERTS', margin + cardWidth + 8, currentY + 14);

  // Card 3: Hotspots Affected
  doc.setFillColor(240, 253, 244); // Emerald-50
  doc.setDrawColor(187, 247, 208); // Emerald-200
  doc.roundedRect(margin + (cardWidth + 4) * 2, currentY, cardWidth, 18, 2, 2, 'FD');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105); // Emerald-600
  doc.text(String(uniqueAreas.size || 1), margin + (cardWidth + 4) * 2 + 4, currentY + 9);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text('NEIGHBORHOOD HOTSPOTS', margin + (cardWidth + 4) * 2 + 4, currentY + 14);

  currentY += 24;

  // Section: Structured Incident Master Table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('INCIDENT LOG & TELEMETRY MASTER TABLE', margin, currentY);
  currentY += 4;

  const tableData = incidents.map((item, index) => {
    const lat = item.latitude || item.location?.coordinates?.[1] || item.location?.latitude;
    const lng = item.longitude || item.location?.coordinates?.[0] || item.location?.longitude;
    const coordsStr = typeof lat === 'number' && typeof lng === 'number' ? `${lat.toFixed(4)}°, ${lng.toFixed(4)}°` : 'GPS Attached';
    const areaStr = item.locationName || item.address || 'Dhaka';
    const upvoteCount = item.upvotes?.length || item.votes || 0;
    const createdDate = item.createdAt ? new Date(item.createdAt) : null;
    const isValidDate = createdDate && !isNaN(createdDate.getTime());
    const createdStr = isValidDate
      ? createdDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Recent';

    return [
      `#${index + 1}`,
      `${item.title || item.type || 'Hazard Report'}\nID: ${(item._id || item.id || '').toString().slice(-6)}`,
      `${item.category || item.hazardType || 'General Hazard'}\n[${item.severity || 'High Alert'}]`,
      `${areaStr}\nGPS: ${coordsStr}`,
      `${createdStr}`,
      `Verified (${upvoteCount} votes)`,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Incident & ID', 'Category / Severity', 'Location & GPS Telemetry', 'Timestamp', 'Community Status']],
    body: tableData,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: darkColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, fontStyle: 'bold' },
      1: { cellWidth: 38 },
      2: { cellWidth: 35 },
      3: { cellWidth: 45 },
      4: { cellWidth: 26 },
      5: { cellWidth: 28, fontStyle: 'bold', textColor: [5, 150, 105] },
    },
    didDrawPage: (data) => {
      // Header for subsequent pages
      if (data.pageNumber > 1) {
        doc.setFillColor(...darkColor);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('PATHPROHORI LAW-ENFORCEMENT THREAT DOSSIER', margin, 8);
        doc.text(`REPORT ID: ${reportId}`, pageWidth - margin, 8, { align: 'right' });
      }
    },
  });

  // Position after table
  currentY = doc.lastAutoTable.finalY + 10;

  // Check page overflow for Detailed Dossier section
  if (currentY + 50 > pageHeight - 30) {
    doc.addPage();
    currentY = 20;
  }

  // Section: Detailed Incident Dossiers
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('DETAILED INCIDENT THREAT DOSSIERS & EVIDENCE NOTES', margin, currentY);
  currentY += 6;

  incidents.forEach((item, idx) => {
    // Check space remaining on page for each dossier box
    if (currentY + 42 > pageHeight - 35) {
      doc.addPage();
      currentY = 20;
    }

    const lat = item.latitude || item.location?.coordinates?.[1] || item.location?.latitude;
    const lng = item.longitude || item.location?.coordinates?.[0] || item.location?.longitude;
    const coordsText = typeof lat === 'number' && typeof lng === 'number' ? `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E` : 'Coordinates Attached';

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...borderLine);
    doc.roundedRect(margin, currentY, contentWidth, 38, 2, 2, 'FD');

    // Title bar inside card
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, contentWidth, 7, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(`CASE FILE #${idx + 1}: ${item.title || 'Community Threat Alert'}`, margin + 3, currentY + 5);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedColor);
    doc.text(`Severity: ${item.severity || 'High Alert'} | Category: ${item.category || item.hazardType || 'General'}`, pageWidth - margin - 3, currentY + 5, { align: 'right' });

    // Body content inside card
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    const descText = item.description || 'Community reported safety hazard requiring police awareness.';
    const splitDesc = doc.splitTextToSize(`Description: ${descText}`, contentWidth - 8);
    doc.text(splitDesc.slice(0, 2), margin + 3, currentY + 12);

    doc.setFont('helvetica', 'bold');
    doc.text(`Location Landmark: ${item.locationName || item.address || 'Dhaka'}`, margin + 3, currentY + 22);

    doc.setFont('helvetica', 'normal');
    doc.text(`Exact GPS Coordinates: ${coordsText}`, margin + 3, currentY + 27);

    if (item.imageUrl || item.photoUrl) {
      doc.setTextColor(2, 132, 199); // Sky-600
      doc.text(`Attached Photo Evidence URL: ${item.imageUrl || item.photoUrl}`, margin + 3, currentY + 32);
    } else {
      doc.setTextColor(...mutedColor);
      doc.text('Attached Photo Evidence: No image attached by reporter', margin + 3, currentY + 32);
    }

    currentY += 42;
  });

  // Check space for Official Police Handover Sign-off Block
  if (currentY + 45 > pageHeight - 20) {
    doc.addPage();
    currentY = 20;
  }

  // Section: Official Law Enforcement Handover Sign-off Block
  currentY += 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(148, 163, 184); // Slate-400
  doc.roundedRect(margin, currentY, contentWidth, 40, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('OFFICIAL LAW ENFORCEMENT RECEIPT & HANDOVER SIGN-OFF', margin + 4, currentY + 6);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text('This document contains verified community threat telemetry dispatched from PATHPROHORI Platform.', margin + 4, currentY + 11);

  // Line 1: Prepared by & Received by
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Prepared By (Admin Officer): ${adminName}`, margin + 4, currentY + 20);
  doc.text(`Received By (Police Officer Name): __________________________`, pageWidth / 2, currentY + 20);

  // Line 2: Station & Badge
  doc.text(`Police Precinct / Station: __________________________`, margin + 4, currentY + 28);
  doc.text(`Badge ID / Rank: __________________________`, pageWidth / 2, currentY + 28);

  // Line 3: Signature & Date
  doc.text(`Officer Signature: __________________________`, margin + 4, currentY + 35);
  doc.text(`Handover Date & Time: __________________________`, pageWidth / 2, currentY + 35);

  // Add Footers & Page Numbers across all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    doc.setDrawColor(...borderLine);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedColor);
    doc.text('PATHPROHORI Hyperlocal Transit Safety — Automatic Data Purge & Privacy Compliant', margin, pageHeight - 7);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 7);
  }

  // Trigger browser file download
  const filename = `PathProhori_Police_Threat_Report_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
};

export default {
  exportLawEnforcementPDF,
};
