export function parseRubric(rubricText) {
  const lines = rubricText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // only treat a line as a “grade heading” if it’s exactly A–F or A. B) etc.
  const headingRe = /^([A-F])\.?\)?$/i;

  let currentGrade = null;
  const rubric = { flat: [], byGrade: {} };

  for (let raw of lines) {
    let line = raw.replace(/^[-*]\s*/, ""); // strip bullets
    if (line.includes(":")) {
      line = line.split(":")[0].trim(); // drop anything after a colon
    }

    const h = line.match(headingRe);
    if (h) {
      // a real letter‐grade heading
      currentGrade = h[1].toUpperCase();
      rubric.byGrade[currentGrade] = [];
    } else if (currentGrade) {
      rubric.byGrade[currentGrade].push(line);
    } else {
      rubric.flat.push(line);
    }
  }

  // if we never actually collected any grades, toss the empty `byGrade`
  if (
    Object.keys(rubric.byGrade).every((g) => rubric.byGrade[g].length === 0)
  ) {
    delete rubric.byGrade;
  }

  return rubric;
}
