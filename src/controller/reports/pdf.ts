import PDFDocument from "pdfkit";
import { Response } from "express";

export type PdfRow = Record<string, string | number | null | undefined>;

export const streamTablePdf = (
  res: Response,
  title: string,
  columns: string[],
  rows: PdfRow[]
) => {
  const doc = new PDFDocument({ margin: 36, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${title}.pdf"`);

  doc.pipe(res);

  // Header
  doc.fontSize(18).text(title, { align: "center" }).moveDown(0.5);
  doc
    .fontSize(10)
    .fillColor("#666")
    .text(new Date().toLocaleString(), { align: "center" });
  doc.moveDown();

  // Table
  const colWidths = columns.map(() => (doc.page.width - 72) / columns.length);
  const startX = 36;
  let y = doc.y + 10;

  // header row
  doc.fontSize(11).fillColor("#111").font("Helvetica-Bold");
  columns.forEach((c, i) =>
    doc.text(c, startX + colWidths[i] * i, y, { width: colWidths[i] })
  );
  y += 18;
  doc
    .moveTo(36, y)
    .lineTo(doc.page.width - 36, y)
    .strokeColor("#ddd")
    .stroke();
  y += 6;

  // body
  doc.font("Helvetica").fillColor("#111").fontSize(10);
  rows.forEach((r) => {
    columns.forEach((c, i) => {
      const v = r[c] ?? "";
      doc.text(String(v), startX + colWidths[i] * i, y, {
        width: colWidths[i],
      });
    });
    y += 16;
    if (y > doc.page.height - 72) {
      doc.addPage();
      y = 60;
    }
  });

  doc.end();
};
