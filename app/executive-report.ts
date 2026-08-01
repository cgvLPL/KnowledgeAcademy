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

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const INK: RGB = [18, 19, 20];
const MUTED: RGB = [99, 104, 110];
const LINE: RGB = [224, 226, 229];
const PAPER: RGB = [247, 247, 245];
const RED: RGB = [228, 35, 43];
const ORANGE: RGB = [246, 118, 31];
const TOTAL_PAGES_TOKEN = "{total_pages_count_string}";

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

function safeShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

function drawBrand(doc: jsPDF, logoDataUrl?: string | null, x = MARGIN, y = 7.3) {
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", x, y, 27, 16.2, undefined, "FAST");
    } catch {
      // Text branding keeps the report usable if the browser cannot rasterize the mark.
      setText(doc, RED, 17, "bold");
      doc.text("CGV", x, y + 10.6);
    }
  } else {
    setText(doc, RED, 17, "bold");
    doc.text("CGV", x, y + 10.6);
  }
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.42);
  doc.line(x + 30.7, y + 1.1, x + 30.7, y + 14.7);
  setText(doc, INK, 8.4, "bold");
  doc.text("Knowledge Academy", x + 35, y + 10.2);
}

function drawPageHeader(doc: jsPDF, report: ExecutiveReportData, logoDataUrl?: string | null) {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_WIDTH, 31, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(0, 30, PAGE_WIDTH / 2, 1, "F");
  doc.setFillColor(...RED);
  doc.rect(PAGE_WIDTH / 2, 30, PAGE_WIDTH / 2, 1, "F");
  drawBrand(doc, logoDataUrl);
  setText(doc, INK, 7, "bold");
  doc.text("EXECUTIVE PERFORMANCE REPORT", PAGE_WIDTH - MARGIN, 11.5, { align: "right" });
  setText(doc, MUTED, 6.2);
  doc.text(report.course.title, PAGE_WIDTH - MARGIN, 18.1, { align: "right", maxWidth: 70 });
}

function drawPageFooter(doc: jsPDF, pageNumber: number, pageCount: number | string, generatedAt: string) {
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
  doc.roundedRect(x, y, width, 26, 2.5, 2.5, "FD");
  setText(doc, MUTED, 6.4, "bold");
  doc.text(label.toUpperCase(), x + 4, y + 6);
  setText(doc, INK, 13.5, "bold");
  doc.text(value, x + 4, y + 15.2);
  setText(doc, MUTED, 5.8);
  doc.text(detail, x + 4, y + 21.7, { maxWidth: width - 8 });
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
  doc.text("LEARNING PERFORMANCE", MARGIN, 43);
  setText(doc, INK, 18, "bold");
  const title = doc.splitTextToSize(report.course.title, PAGE_WIDTH - MARGIN * 2).slice(0, 3);
  doc.text(title, MARGIN, 51);
  const titleBottom = 51 + Math.max(0, title.length - 1) * 7.2;
  setText(doc, MUTED, 7.5);
  const courseDetails = doc.splitTextToSize(
    `${report.course.category} | ${report.course.questionCount} questions | ${report.course.duration} minutes | ${report.course.status}`,
    PAGE_WIDTH - MARGIN * 2,
  ).slice(0, 2);
  doc.text(courseDetails, MARGIN, titleBottom + 8);
  setText(doc, MUTED, 6.8);
  const detailBottom = titleBottom + 8 + Math.max(0, courseDetails.length - 1) * 3.6;
  doc.text(`Report generated ${safeDate(report.generatedAt)}`, MARGIN, detailBottom + 6);

  const gap = 5;
  const cardWidth = (PAGE_WIDTH - MARGIN * 2 - gap) / 2;
  const metricsY = detailBottom + 12;
  const metrics = [
    ["Submissions", String(report.summary.submissions), `${report.summary.uniqueParticipants} participants`],
    ["Average score", `${report.summary.averageScore}%`, `Median ${report.summary.medianScore}%`],
    ["Pass rate", `${report.summary.passRate}%`, `Threshold ${report.course.passingScore}%`],
    ["Highest score", `${report.summary.highestScore}%`, "Best submitted attempt"],
    ["Lowest score", `${report.summary.lowestScore}%`, "Lowest submitted attempt"],
    ["Average time", durationLabel(report.summary.averageDurationSeconds), "Per submitted attempt"],
  ];
  metrics.forEach(([label, value, detail], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    drawMetricCard(doc, MARGIN + column * (cardWidth + gap), metricsY + row * 30, cardWidth, label, value, detail);
  });

  const panelY = metricsY + 94;
  const panelGap = 6;
  const panelWidth = (PAGE_WIDTH - MARGIN * 2 - panelGap) / 2;
  const panelHeight = Math.min(88, PAGE_HEIGHT - panelY - 22);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...LINE);
  doc.roundedRect(MARGIN, panelY, panelWidth, panelHeight, 3, 3, "FD");
  setText(doc, INK, 9, "bold");
  doc.text("Score distribution", MARGIN + 6, panelY + 10);
  setText(doc, MUTED, 6.2);
  doc.text("Share of all submitted attempts", MARGIN + 6, panelY + 16);

  report.scoreDistribution.forEach((band, index) => {
    const y = panelY + 28 + index * 10.2;
    setText(doc, MUTED, 6.2, "bold");
    doc.text(band.label, MARGIN + 6, y);
    const barX = MARGIN + 31;
    const barWidth = panelWidth - 53;
    doc.setFillColor(235, 236, 237);
    doc.roundedRect(barX, y - 3.4, barWidth, 4, 1.7, 1.7, "F");
    if (band.percentage > 0) {
      doc.setFillColor(...(index < 2 ? RED : ORANGE));
      doc.roundedRect(barX, y - 3.4, Math.max(1.5, barWidth * band.percentage / 100), 4, 1.7, 1.7, "F");
    }
    setText(doc, INK, 6.2, "bold");
    doc.text(`${band.count} (${band.percentage}%)`, MARGIN + panelWidth - 6, y, { align: "right" });
  });

  const insightX = MARGIN + panelWidth + panelGap;
  doc.setFillColor(...INK);
  doc.setDrawColor(...INK);
  doc.roundedRect(insightX, panelY, panelWidth, panelHeight, 3, 3, "FD");
  setText(doc, [255, 255, 255], 9, "bold");
  doc.text("Executive observations", insightX + 7, panelY + 11);
  setText(doc, [188, 190, 193], 6.3);
  doc.text("Key signals for learning and content owners", insightX + 7, panelY + 17);
  insightLines(report).forEach((line, index) => {
    const y = panelY + 30 + index * 13.5;
    doc.setFillColor(index % 2 ? RED[0] : ORANGE[0], index % 2 ? RED[1] : ORANGE[1], index % 2 ? RED[2] : ORANGE[2]);
    doc.circle(insightX + 8.5, y - 1.3, 1.4, "F");
    setText(doc, [239, 239, 237], 6.4);
    doc.text(doc.splitTextToSize(line, panelWidth - 21).slice(0, 3), insightX + 13, y);
  });
  drawPageFooter(doc, 1, TOTAL_PAGES_TOKEN, report.generatedAt);
}

function drawParticipantSection(doc: jsPDF, report: ExecutiveReportData, logoDataUrl?: string | null) {
  const columns = [
    { label: "#", width: 11 },
    { label: "Participant", width: 35 },
    { label: "Branch", width: 27 },
    { label: "Score", width: 18 },
    { label: "Result", width: 20 },
    { label: "Correct", width: 18 },
    { label: "Time", width: 19 },
    { label: "Submitted", width: 34 },
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
        safeShortDate(participant.submittedAt),
      ])
    : [["-", "No submitted attempts", "-", "-", "-", "-", "-", "-"]];
  const pageSize = 20;
  for (let offset = 0; offset < rows.length; offset += pageSize) {
    doc.addPage("a4", "portrait");
    const pageNumber = doc.getNumberOfPages();
    drawPageHeader(doc, report, logoDataUrl);
    setText(doc, RED, 7, "bold");
    doc.text("ATTEMPT DETAIL", MARGIN, 43);
    setText(doc, INK, 15, "bold");
    doc.text(offset ? "Participant results - continued" : "Participant results", MARGIN, 51);
    setText(doc, MUTED, 6.8);
    doc.text("Sorted by score, then completion time. Every completed attempt is included.", MARGIN, 57);

    let x = MARGIN;
    const headerY = 64;
    const headerHeight = 9;
    columns.forEach((column) => {
      doc.setFillColor(...INK);
      doc.setDrawColor(...LINE);
      doc.rect(x, headerY, column.width, headerHeight, "FD");
      setText(doc, [255, 255, 255], 5.4, "bold");
      doc.text(column.label, x + 3, headerY + 5.8);
      x += column.width;
    });

    rows.slice(offset, offset + pageSize).forEach((row, rowIndex) => {
      x = MARGIN;
      const rowHeight = 9.4;
      const y = headerY + headerHeight + rowIndex * rowHeight;
      columns.forEach((column, columnIndex) => {
        doc.setFillColor(...(rowIndex % 2 ? [255, 255, 255] as RGB : PAPER));
        doc.setDrawColor(...LINE);
        doc.rect(x, y, column.width, rowHeight, "FD");
        setText(doc, INK, 5.4, columnIndex === 3 ? "bold" : "normal");
        doc.text(fitText(doc, row[columnIndex], column.width - 5), x + 2.5, y + 5.9);
        x += column.width;
      });
    });
    drawPageFooter(doc, pageNumber, TOTAL_PAGES_TOKEN, report.generatedAt);
  }
}

function drawQuestionHeading(doc: jsPDF) {
  setText(doc, RED, 7, "bold");
  doc.text("QUESTION ANALYSIS", MARGIN, 43);
  setText(doc, INK, 15, "bold");
  doc.text("Response patterns and item performance", MARGIN, 51);
}

function drawQuestionBlock(doc: jsPDF, question: ExecutiveReportQuestion, startY: number) {
  const promptLines = doc.splitTextToSize(question.prompt, PAGE_WIDTH - MARGIN * 2).slice(0, 4);
  setText(doc, ORANGE, 7, "bold");
  doc.text(`QUESTION ${String(question.order).padStart(2, "0")}`, MARGIN, startY);
  setText(doc, INK, 9.5, "bold");
  doc.text(promptLines, MARGIN, startY + 7);
  const promptHeight = promptLines.length * 4.2;
  const detailY = startY + 10 + promptHeight;
  setText(doc, MUTED, 6.5);
  const correctLines = doc.splitTextToSize(
    `Correct answer: ${question.correctOption}. ${question.correctAnswer}`,
    PAGE_WIDTH - MARGIN * 2,
  ).slice(0, 2);
  doc.text(correctLines, MARGIN, detailY);
  const statsY = detailY + correctLines.length * 3.8 + 2;
  setText(doc, INK, 6.5, "bold");
  doc.text(
    `${question.correctPercentage}% correct | ${question.incorrectPercentage}% incorrect | ${question.unansweredCount} unanswered`,
    MARGIN,
    statsY,
  );
  setText(doc, MUTED, 6.2);
  const common = question.mostCommonOption
    ? `Most selected: ${question.mostCommonOption}. ${question.mostCommonAnswer} (${question.mostCommonCount}, ${question.mostCommonPercentage}%)`
    : "Most selected: no responses yet";
  const commonLines = doc.splitTextToSize(common, PAGE_WIDTH - MARGIN * 2).slice(0, 2);
  const commonY = statsY + 5.5;
  doc.text(commonLines, MARGIN, commonY);

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
    { label: "Option", key: "key" as const, width: 15 },
    { label: "Answer", key: "answer" as const, width: 102 },
    { label: "Responses", key: "responses" as const, width: 23 },
    { label: "Share", key: "share" as const, width: 18 },
    { label: "Key", key: "status" as const, width: 24 },
  ];
  let x = MARGIN;
  let tableY = commonY + commonLines.length * 3.6 + 4;
  columns.forEach((column) => {
    doc.setFillColor(42, 43, 44);
    doc.setDrawColor(...LINE);
    doc.rect(x, tableY, column.width, 8, "FD");
    setText(doc, [255, 255, 255], 5.6, "bold");
    doc.text(column.label, x + 2.5, tableY + 5.2);
    x += column.width;
  });
  tableY += 8;
  optionRows.forEach((row, rowIndex) => {
    const answerLines = doc.splitTextToSize(row.answer, 96).slice(0, 3);
    const rowHeight = Math.max(9, answerLines.length * 3.4 + 3.5);
    x = MARGIN;
    columns.forEach((column, columnIndex) => {
      doc.setFillColor(...(rowIndex % 2 ? [255, 255, 255] as RGB : PAPER));
      doc.setDrawColor(...LINE);
      doc.rect(x, tableY, column.width, rowHeight, "FD");
      const value = row[column.key];
      const color = column.key === "status" && value ? RED : INK;
      setText(doc, color, 5.7, column.key === "key" || column.key === "share" || column.key === "status" ? "bold" : "normal");
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
    doc.addPage("a4", "portrait");
    const pageNumber = doc.getNumberOfPages();
    drawPageHeader(doc, report, logoDataUrl);
    drawQuestionHeading(doc);
    drawQuestionBlock(doc, question, 65);
    drawPageFooter(doc, pageNumber, TOTAL_PAGES_TOKEN, report.generatedAt);
  });
}

function drawReportNotes(doc: jsPDF, report: ExecutiveReportData, logoDataUrl?: string | null) {
  doc.addPage("a4", "portrait");
  doc.setFillColor(...RED);
  doc.rect(MARGIN, 48, 2, 178, "F");
  setText(doc, RED, 7, "bold");
  doc.text("REPORT NOTES", 22, 52);
  setText(doc, INK, 18, "bold");
  doc.text("How to read this analysis", 22, 64);
  setText(doc, MUTED, 7.2);
  doc.text(
    "This report is designed for content owners, operational leaders, and learning teams.",
    22,
    75,
    { maxWidth: 166 },
  );

  const notes = [
    "Submissions include every completed attempt. Repeat attempts are listed separately, while the unique participant metric counts each account once.",
    "Scores are calculated by the secure evaluation backend using the question answer key and configured point values.",
    "Question percentages use all submitted attempts as the denominator. Unanswered attempts are reported separately from incorrect answers.",
    "Percentages are rounded to whole numbers, so displayed shares may differ from 100% by one percentage point.",
  ];
  notes.forEach((note, index) => {
    const y = 94 + index * 30;
    doc.setFillColor(...(index % 2 ? RED : ORANGE));
    doc.circle(25, y - 1.5, 2.1, "F");
    setText(doc, [255, 255, 255], 6.5, "bold");
    doc.text(String(index + 1), 25, y + 0.6, { align: "center" });
    setText(doc, INK, 7.3);
    doc.text(doc.splitTextToSize(note, 154).slice(0, 3), 32, y);
  });

  doc.setFillColor(...PAPER);
  doc.setDrawColor(...LINE);
  doc.roundedRect(22, 214, 166, 38, 3, 3, "FD");
  setText(doc, MUTED, 6.2, "bold");
  doc.text("REPORT REFERENCE", 28, 224);
  setText(doc, INK, 8.2, "bold");
  doc.text(doc.splitTextToSize(report.course.title, 91).slice(0, 2), 28, 233);
  setText(doc, MUTED, 6.2);
  doc.text(`Course ID: ${fitText(doc, report.course.id, 48)}`, 128, 226);
  doc.text(`Passing score: ${report.course.passingScore}%`, 128, 234);
  doc.text(`Questions: ${report.course.questionCount}`, 128, 242);
  doc.text(`Generated: ${safeShortDate(report.generatedAt)}`, 128, 248);
  drawBrand(doc, logoDataUrl, 22, 260);
  setText(doc, MUTED, 6.2);
  doc.text("Confidential - Internal use", 22, 282);
  doc.text(`Page ${doc.getNumberOfPages()} of ${TOTAL_PAGES_TOKEN}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 6.4, { align: "right" });
}

export function createExecutiveReportPdf(report: ExecutiveReportData, logoDataUrl?: string | null) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: false });
  doc.setProperties({
    title: `${report.course.title} - Executive Performance Report`,
    subject: "CGV Knowledge Academy evaluation performance analysis",
    author: "CGV Knowledge Academy",
    creator: "CGV Knowledge Academy Evaluation Portal",
  });
  drawCover(doc, report, logoDataUrl);
  drawParticipantSection(doc, report, logoDataUrl);
  drawQuestionSections(doc, report, logoDataUrl);
  drawReportNotes(doc, report, logoDataUrl);
  doc.putTotalPages(TOTAL_PAGES_TOKEN);
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
    canvas.width = 600;
    canvas.height = 360;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, 1450, 360);
    context.globalCompositeOperation = "source-in";
    context.fillStyle = "#e6322f";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = "source-over";
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
