import { jsPDF } from "jspdf";

export type ExecutiveReportParticipant = {
  rank: number;
  name: string;
  branch: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number;
  submittedAt: string;
  passed: boolean;
};

export type ExecutiveReportQuestion = {
  id: string;
  order: number;
  prompt: string;
  correctOption: string;
  correctAnswer: string;
  totalResponses: number;
  answeredCount: number;
  unansweredCount: number;
  correctCount: number;
  correctPercentage: number;
  incorrectPercentage: number;
  mostCommonOption: string;
  mostCommonAnswer: string;
  mostCommonCount: number;
  mostCommonPercentage: number;
  options: Array<{
    key: string;
    text: string;
    count: number;
    percentage: number;
    isCorrect: boolean;
  }>;
};

export type ExecutiveReportData = {
  generatedAt: string;
  course: {
    id: string;
    title: string;
    description: string;
    category: string;
    passingScore: number;
    duration: number;
    status: string;
    questionCount: number;
  };
  summary: {
    submissions: number;
    uniqueParticipants: number;
    averageScore: number;
    medianScore: number;
    passRate: number;
    highestScore: number;
    lowestScore: number;
    averageDurationSeconds: number;
  };
  scoreDistribution: Array<{
    label: string;
    count: number;
    percentage: number;
  }>;
  participants: ExecutiveReportParticipant[];
  questions: ExecutiveReportQuestion[];
};

type RGB = [number, number, number];

const PAGE_WIDTH = 297;
const PAGE_HEIGHT = 210;
const MARGIN = 14;
const INK: RGB = [18, 19, 20];
const MUTED: RGB = [99, 104, 110];
const LINE: RGB = [224, 226, 229];
const PAPER: RGB = [247, 247, 245];
const RED: RGB = [228, 35, 43];
const ORANGE: RGB = [246, 118, 31];

function setText(doc: jsPDF, color: RGB, size: number, style: "normal" | "bold" = "normal") {
  doc.setTextColor(...color);
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
}

function safeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function durationLabel(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds || 0));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "evaluation";
}

function fitText(doc: jsPDF, value: string, maxWidth: number) {
  if (doc.getTextWidth(value) <= maxWidth) return value;
  let clipped = value;
  while (clipped.length > 1 && doc.getTextWidth(`${clipped}...`) > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped.trimEnd()}...`;
}

function drawBrand(doc: jsPDF, logoDataUrl?: string | null) {
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", MARGIN, 7.2, 67, 16.6, undefined, "FAST");
      return;
    } catch {
      // Text branding below keeps the report usable if a browser cannot rasterize the SVG.
    }
  }
  setText(doc, [255, 255, 255], 18, "bold");
  doc.text("CGV", MARGIN, 16.5);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.line(33, 9, 33, 21);
  setText(doc, [255, 255, 255], 8.5, "bold");
  doc.text("Knowledge Academy", 37, 16.2);
}

function drawPageHeader(doc: jsPDF, report: ExecutiveReportData, logoDataUrl?: string | null) {
  doc.setFillColor(...INK);
  doc.rect(0, 0, PAGE_WIDTH, 29, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(0, 28, PAGE_WIDTH / 2, 1, "F");
  doc.setFillColor(...RED);
  doc.rect(PAGE_WIDTH / 2, 28, PAGE_WIDTH / 2, 1, "F");
  drawBrand(doc, logoDataUrl);
  setText(doc, [255, 255, 255], 7.5, "bold");
  doc.text("EXECUTIVE PERFORMANCE REPORT", PAGE_WIDTH - MARGIN, 12, { align: "right" });
  setText(doc, [189, 191, 194], 6.8);
  doc.text(report.course.title, PAGE_WIDTH - MARGIN, 18.2, { align: "right", maxWidth: 115 });
}

function drawPageFooter(doc: jsPDF, pageNumber: number, pageCount: number, generatedAt: string) {
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.35);
  doc.line(MARGIN, PAGE_HEIGHT - 10.5, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10.5);
  setText(doc, MUTED, 6.4);
  doc.text(`Generated ${safeDate(generatedAt)} | Confidential - Internal use`, MARGIN, PAGE_HEIGHT - 6.4);
  doc.text(`Page ${pageNumber} of ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 6.4, { align: "right" });
}

function drawMetricCard(doc: jsPDF, x: number, y: number, width: number, label: string, value: string, detail: string) {
  doc.setFillColor(...PAPER);
  doc.setDrawColor(...LINE);
  doc.roundedRect(x, y, width, 24, 2.5, 2.5, "FD");
  setText(doc, MUTED, 6.4, "bold");
  doc.text(label.toUpperCase(), x + 4, y + 6);
  setText(doc, INK, 15, "bold");
  doc.text(value, x + 4, y + 15.2);
  setText(doc, MUTED, 5.8);
  doc.text(detail, x + 4, y + 20.3, { maxWidth: width - 8 });
}

function insightLines(report: ExecutiveReportData) {
  if (!report.summary.submissions) {
    return [
      "No submitted attempts are available yet.",
      "Question analytics will populate after the first completion.",
      `The current passing threshold is ${report.course.passingScore}%.`,
    ];
  }
  const ordered = [...report.questions].sort((a, b) => b.correctPercentage - a.correctPercentage);
  const strongest = ordered[0];
  const weakest = ordered.at(-1);
  return [
    `Average score is ${report.summary.averageScore}% against a ${report.course.passingScore}% passing threshold.`,
    `${report.summary.passRate}% of submitted attempts met or exceeded the passing score.`,
    strongest
      ? `Strongest item: Q${strongest.order} at ${strongest.correctPercentage}% correct.`
      : "Question-level results are not available.",
    weakest
      ? `Priority review: Q${weakest.order} at ${weakest.correctPercentage}% correct.`
      : "No priority review item is available.",
  ];
}

function drawCover(doc: jsPDF, report: ExecutiveReportData, logoDataUrl?: string | null) {
  drawPageHeader(doc, report, logoDataUrl);
  setText(doc, RED, 7, "bold");
  doc.text("LEARNING PERFORMANCE", MARGIN, 41);
  setText(doc, INK, 20, "bold");
  const title = doc.splitTextToSize(report.course.title, 186).slice(0, 2);
  doc.text(title, MARGIN, 49);
  setText(doc, MUTED, 7.5);
  doc.text(
    `${report.course.category} | ${report.course.questionCount} questions | ${report.course.duration} minutes | ${report.course.status}`,
    MARGIN,
    59,
  );
  setText(doc, MUTED, 6.8);
  doc.text(`Report generated ${safeDate(report.generatedAt)}`, PAGE_WIDTH - MARGIN, 49, { align: "right" });

  const gap = 3;
  const cardWidth = (PAGE_WIDTH - MARGIN * 2 - gap * 5) / 6;
  const metrics = [
    ["Submissions", String(report.summary.submissions), `${report.summary.uniqueParticipants} participants`],
    ["Average score", `${report.summary.averageScore}%`, `Median ${report.summary.medianScore}%`],
    ["Pass rate", `${report.summary.passRate}%`, `Threshold ${report.course.passingScore}%`],
    ["Highest score", `${report.summary.highestScore}%`, "Best submitted attempt"],
    ["Lowest score", `${report.summary.lowestScore}%`, "Lowest submitted attempt"],
    ["Average time", durationLabel(report.summary.averageDurationSeconds), "Per submitted attempt"],
  ];
  metrics.forEach(([label, value, detail], index) => {
    drawMetricCard(doc, MARGIN + index * (cardWidth + gap), 67, cardWidth, label, value, detail);
  });

  const panelY = 98;
  const panelWidth = (PAGE_WIDTH - MARGIN * 2 - 8) / 2;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...LINE);
  doc.roundedRect(MARGIN, panelY, panelWidth, 83, 3, 3, "FD");
  setText(doc, INK, 9, "bold");
  doc.text("Score distribution", MARGIN + 6, panelY + 10);
  setText(doc, MUTED, 6.2);
  doc.text("Share of all submitted attempts", MARGIN + 6, panelY + 16);

  report.scoreDistribution.forEach((band, index) => {
    const y = panelY + 27 + index * 8.2;
    setText(doc, MUTED, 6.2, "bold");
    doc.text(band.label, MARGIN + 6, y);
    const barX = MARGIN + 34;
    const barWidth = panelWidth - 57;
    doc.setFillColor(235, 236, 237);
    doc.roundedRect(barX, y - 3.4, barWidth, 4, 1.7, 1.7, "F");
    if (band.percentage > 0) {
      doc.setFillColor(...(index < 2 ? RED : ORANGE));
      doc.roundedRect(barX, y - 3.4, Math.max(1.5, barWidth * band.percentage / 100), 4, 1.7, 1.7, "F");
    }
    setText(doc, INK, 6.2, "bold");
    doc.text(`${band.count} (${band.percentage}%)`, MARGIN + panelWidth - 6, y, { align: "right" });
  });

  const insightX = MARGIN + panelWidth + 8;
  doc.setFillColor(...INK);
  doc.setDrawColor(...INK);
  doc.roundedRect(insightX, panelY, panelWidth, 83, 3, 3, "FD");
  setText(doc, [255, 255, 255], 9, "bold");
  doc.text("Executive observations", insightX + 7, panelY + 11);
  setText(doc, [188, 190, 193], 6.3);
  doc.text("Key signals for learning and content owners", insightX + 7, panelY + 17);
  insightLines(report).forEach((line, index) => {
    const y = panelY + 30 + index * 12.5;
    doc.setFillColor(index % 2 ? RED[0] : ORANGE[0], index % 2 ? RED[1] : ORANGE[1], index % 2 ? RED[2] : ORANGE[2]);
    doc.circle(insightX + 8.5, y - 1.3, 1.4, "F");
    setText(doc, [239, 239, 237], 7);
    doc.text(doc.splitTextToSize(line, panelWidth - 22).slice(0, 2), insightX + 13, y);
  });
}

function drawParticipantSection(doc: jsPDF, report: ExecutiveReportData, logoDataUrl?: string | null) {
  const columns = [
    { label: "Rank", width: 14 },
    { label: "Participant", width: 49 },
    { label: "Branch", width: 39 },
    { label: "Score", width: 22 },
    { label: "Result", width: 25 },
    { label: "Correct", width: 23 },
    { label: "Time", width: 25 },
    { label: "Submitted", width: 72 },
  ];
  const rows = report.participants.length
    ? report.participants.map((participant) => [
        `#${participant.rank}`,
        participant.name,
        participant.branch || "-",
        `${participant.score}%`,
        participant.passed ? "Passed" : "Review",
        `${participant.correctCount}/${participant.totalQuestions}`,
        durationLabel(participant.durationSeconds),
        safeDate(participant.submittedAt),
      ])
    : [["-", "No submitted attempts", "-", "-", "-", "-", "-", "-"]];
  const pageSize = 14;
  for (let offset = 0; offset < rows.length; offset += pageSize) {
    doc.addPage("a4", "landscape");
    drawPageHeader(doc, report, logoDataUrl);
    setText(doc, RED, 7, "bold");
    doc.text("ATTEMPT DETAIL", MARGIN, 40);
    setText(doc, INK, 15, "bold");
    doc.text(offset ? "Participant results - continued" : "Participant results", MARGIN, 48);
    setText(doc, MUTED, 6.8);
    doc.text("Sorted by score, then completion time. Every completed attempt is included.", MARGIN, 54);

    let x = MARGIN;
    const headerY = 60;
    const headerHeight = 9;
    columns.forEach((column) => {
      doc.setFillColor(...INK);
      doc.setDrawColor(...LINE);
      doc.rect(x, headerY, column.width, headerHeight, "FD");
      setText(doc, [255, 255, 255], 6.5, "bold");
      doc.text(column.label, x + 3, headerY + 5.8);
      x += column.width;
    });

    rows.slice(offset, offset + pageSize).forEach((row, rowIndex) => {
      x = MARGIN;
      const y = headerY + headerHeight + rowIndex * 8.5;
      columns.forEach((column, columnIndex) => {
        doc.setFillColor(...(rowIndex % 2 ? [255, 255, 255] as RGB : PAPER));
        doc.setDrawColor(...LINE);
        doc.rect(x, y, column.width, 8.5, "FD");
        setText(doc, INK, 6.35, columnIndex === 3 ? "bold" : "normal");
        doc.text(fitText(doc, row[columnIndex], column.width - 6), x + 3, y + 5.4);
        x += column.width;
      });
    });
  }
}

function drawQuestionHeading(doc: jsPDF) {
  setText(doc, RED, 7, "bold");
  doc.text("QUESTION ANALYSIS", MARGIN, 40);
  setText(doc, INK, 15, "bold");
  doc.text("Response patterns and item performance", MARGIN, 48);
}

function drawQuestionBlock(doc: jsPDF, question: ExecutiveReportQuestion, startY: number) {
  const promptLines = doc.splitTextToSize(question.prompt, 258).slice(0, 3);
  setText(doc, ORANGE, 7, "bold");
  doc.text(`QUESTION ${String(question.order).padStart(2, "0")}`, MARGIN, startY);
  setText(doc, INK, 9.5, "bold");
  doc.text(promptLines, MARGIN, startY + 7);
  const promptHeight = promptLines.length * 4.2;
  const detailY = startY + 10 + promptHeight;
  setText(doc, MUTED, 6.5);
  doc.text(`Correct answer: ${question.correctOption}. ${question.correctAnswer}`, MARGIN, detailY, { maxWidth: 150 });
  setText(doc, INK, 6.5, "bold");
  doc.text(
    `${question.correctPercentage}% correct | ${question.incorrectPercentage}% incorrect | ${question.unansweredCount} unanswered`,
    PAGE_WIDTH - MARGIN,
    detailY,
    { align: "right" },
  );
  setText(doc, MUTED, 6.2);
  const common = question.mostCommonOption
    ? `Most selected: ${question.mostCommonOption}. ${question.mostCommonAnswer} (${question.mostCommonCount}, ${question.mostCommonPercentage}%)`
    : "Most selected: no responses yet";
  doc.text(common, MARGIN, detailY + 5.5, { maxWidth: PAGE_WIDTH - MARGIN * 2 });

  const optionRows = question.options.map((option) => ({
    key: option.key,
    answer: option.text,
    responses: String(option.count),
    share: `${option.percentage}%`,
    status: option.isCorrect ? "Correct answer" : "",
  }));
  if (question.unansweredCount) {
    const unansweredPercentage = question.totalResponses
      ? Math.round(question.unansweredCount / question.totalResponses * 100)
      : 0;
    optionRows.push({
      key: "-",
      answer: "No answer",
      responses: String(question.unansweredCount),
      share: `${unansweredPercentage}%`,
      status: "",
    });
  }
  const columns = [
    { label: "Option", key: "key" as const, width: 17 },
    { label: "Answer", key: "answer" as const, width: 170 },
    { label: "Responses", key: "responses" as const, width: 26 },
    { label: "Share", key: "share" as const, width: 22 },
    { label: "Key", key: "status" as const, width: 34 },
  ];
  let x = MARGIN;
  let tableY = detailY + 9;
  columns.forEach((column) => {
    doc.setFillColor(42, 43, 44);
    doc.setDrawColor(...LINE);
    doc.rect(x, tableY, column.width, 8, "FD");
    setText(doc, [255, 255, 255], 6.4, "bold");
    doc.text(column.label, x + 2.5, tableY + 5.2);
    x += column.width;
  });
  tableY += 8;
  optionRows.forEach((row, rowIndex) => {
    const answerLines = doc.splitTextToSize(row.answer, 164).slice(0, 2);
    const rowHeight = Math.max(9, answerLines.length * 3.4 + 3.5);
    x = MARGIN;
    columns.forEach((column, columnIndex) => {
      doc.setFillColor(...(rowIndex % 2 ? [255, 255, 255] as RGB : PAPER));
      doc.setDrawColor(...LINE);
      doc.rect(x, tableY, column.width, rowHeight, "FD");
      const value = row[column.key];
      const color = column.key === "status" && value ? RED : INK;
      setText(doc, color, 6.35, column.key === "key" || column.key === "share" || column.key === "status" ? "bold" : "normal");
      if (column.key === "answer") {
        doc.text(answerLines, x + 2.5, tableY + 5.2);
      } else if (columnIndex === 2 || columnIndex === 3) {
        doc.text(value, x + column.width - 2.5, tableY + 5.2, { align: "right" });
      } else {
        doc.text(fitText(doc, value, column.width - 5), x + 2.5, tableY + 5.2);
      }
      x += column.width;
    });
    tableY += rowHeight;
  });
  return tableY;
}

function drawQuestionSections(doc: jsPDF, report: ExecutiveReportData, logoDataUrl?: string | null) {
  if (!report.questions.length) return;
  report.questions.forEach((question) => {
    doc.addPage("a4", "landscape");
    drawPageHeader(doc, report, logoDataUrl);
    drawQuestionHeading(doc);
    drawQuestionBlock(doc, question, 61);
  });
}

function drawReportNotes(doc: jsPDF, report: ExecutiveReportData) {
  doc.addPage("a4", "landscape");
  doc.setFillColor(...RED);
  doc.rect(MARGIN, 45, 2, 104, "F");
  setText(doc, RED, 7, "bold");
  doc.text("REPORT NOTES", 22, 52);
  setText(doc, INK, 18, "bold");
  doc.text("How to read this analysis", 22, 63);
  setText(doc, MUTED, 7.2);
  doc.text(
    "This report is designed for content owners, operational leaders, and learning teams.",
    22,
    72,
  );

  const notes = [
    "Submissions include every completed attempt. Repeat attempts are listed separately, while the unique participant metric counts each account once.",
    "Scores are calculated by the secure evaluation backend using the question answer key and configured point values.",
    "Question percentages use all submitted attempts as the denominator. Unanswered attempts are reported separately from incorrect answers.",
    "Percentages are rounded to whole numbers, so displayed shares may differ from 100% by one percentage point.",
  ];
  notes.forEach((note, index) => {
    const y = 86 + index * 17;
    doc.setFillColor(...(index % 2 ? RED : ORANGE));
    doc.circle(25, y - 1.5, 2.1, "F");
    setText(doc, [255, 255, 255], 6.5, "bold");
    doc.text(String(index + 1), 25, y + 0.6, { align: "center" });
    setText(doc, INK, 7.3);
    doc.text(doc.splitTextToSize(note, 194).slice(0, 2), 32, y);
  });

  doc.setFillColor(...PAPER);
  doc.setDrawColor(...LINE);
  doc.roundedRect(224, 50, 58, 82, 3, 3, "FD");
  setText(doc, MUTED, 6.2, "bold");
  doc.text("REPORT REFERENCE", 230, 60);
  setText(doc, INK, 8.2, "bold");
  doc.text(doc.splitTextToSize(report.course.title, 46).slice(0, 3), 230, 69);
  setText(doc, MUTED, 6.2);
  doc.text(`Course ID: ${fitText(doc, report.course.id, 45)}`, 230, 89);
  doc.text(`Passing score: ${report.course.passingScore}%`, 230, 97);
  doc.text(`Questions: ${report.course.questionCount}`, 230, 105);
  doc.text(`Generated: ${safeDate(report.generatedAt)}`, 230, 113, { maxWidth: 44 });
  setText(doc, INK, 7, "bold");
  doc.text("CGV Knowledge Academy", 22, 164);
  setText(doc, MUTED, 6.2);
  doc.text("Confidential - Internal use", 22, 171);
}

export function createExecutiveReportPdf(report: ExecutiveReportData, logoDataUrl?: string | null) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: false });
  doc.setProperties({
    title: `${report.course.title} - Executive Performance Report`,
    subject: "CGV Knowledge Academy evaluation performance analysis",
    author: "CGV Knowledge Academy",
    creator: "CGV Knowledge Academy Evaluation Portal",
  });
  drawCover(doc, report, logoDataUrl);
  drawParticipantSection(doc, report, logoDataUrl);
  drawQuestionSections(doc, report, logoDataUrl);
  drawReportNotes(doc, report);

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    if (page < pageCount) {
      drawPageHeader(doc, report, logoDataUrl);
      drawPageFooter(doc, page, pageCount, report.generatedAt);
    } else {
      setText(doc, MUTED, 6.2);
      doc.text(`Page ${page} of ${pageCount}`, 22, 190);
    }
  }
  doc.setPage(1);
  return doc;
}

export async function loadExecutiveReportLogo(source: string): Promise<string | null> {
  if (typeof document === "undefined" || typeof Image === "undefined") return null;
  const response = await fetch(source, { cache: "force-cache" });
  if (!response.ok) return null;
  const svg = await response.text();
  const objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("The report logo could not be loaded."));
      element.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 725;
    canvas.height = 180;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png", 0.92);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function downloadExecutiveReportPdf(report: ExecutiveReportData, logoDataUrl?: string | null) {
  const doc = createExecutiveReportPdf(report, logoDataUrl);
  const filename = `cgv-knowledge-academy-${slugify(report.course.title)}-executive-report.pdf`;
  doc.save(filename);
  return filename;
}
