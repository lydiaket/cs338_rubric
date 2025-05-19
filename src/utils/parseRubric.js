// src/utils/parseRubric.js
export function parseRubric(rubricText) {
  const lines = rubricText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const headingRe = /^([A-F])\.?\)?$/i;
  let currentGrade = null;
  const rubric = { flat: [], byGrade: {} };

  for (let raw of lines) {
    let line = raw.replace(/^[-*]\s*/, ""); // strip bullets
    if (line.includes(":")) {
      line = line.split(":")[0].trim();
    }

    const h = line.match(headingRe);
    if (h) {
      currentGrade = h[1].toUpperCase();
      rubric.byGrade[currentGrade] = [];
    } else if (currentGrade) {
      rubric.byGrade[currentGrade].push(line);
    } else {
      rubric.flat.push(line);
    }
  }

  // Remove empty byGrade if nothing was grouped
  if (
    Object.keys(rubric.byGrade).every((g) => rubric.byGrade[g].length === 0)
  ) {
    delete rubric.byGrade;
  }

  return rubric;
}
