import React, { useState, useRef, createRef } from "react";
import Highlighter from "react-highlight-words";

function App() {
  // ─── State ───────────────────────────────────────────────────────────
  const [essayText, setEssayText] = useState("");
  const [rubricText, setRubricText] = useState("");
  const [sections, setSections] = useState([]);
  const [semanticMatches, setSemanticMatches] = useState([]);
  const [met, setMet] = useState([]);
  const [missing, setMissing] = useState([]);
  const [suggestions, setSuggestions] = useState("");
  const [loading, setLoading] = useState(false);

  // refs for each section to enable scrolling
  const sectionRefs = useRef({});

  // ─── File → Text Helper ──────────────────────────────────────────────
  const readFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });

  // ─── Main Analysis ────────────────────────────────────────────────────
  const runAnalysis = async () => {
    setLoading(true);
    setSections([]);
    setSemanticMatches([]);
    setMet([]);
    setMissing([]);
    setSuggestions("");

    // build rubric array
    const rubricList = rubricText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    // fetch sections
    try {
      const respS = await fetch("http://127.0.0.1:8001/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: essayText }),
      });
      setSections(await respS.json());
    } catch (err) {
      console.error("Structure error:", err);
      setSections([]);
    }

    // fetch semantic matches
    try {
      const respA = await fetch("http://127.0.0.1:8001/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: essayText, rubric: rubricList }),
      });
      const matches = await respA.json();
      setSemanticMatches(matches);

      // derive met / missing
      const metArr = matches.map((m) => m.criterion);
      const missArr = rubricList.filter((c) => !metArr.includes(c));
      setMet(metArr);
      setMissing(missArr);

      // rule-based suggestions for gaps
      if (missArr.length) {
        const bullets = missArr.map(
          (c) => `- Try adding a sentence that explicitly addresses **${c}**.`
        );
        setSuggestions(bullets.join("\n"));
      }
    } catch (err) {
      console.error("Analyze error:", err);
    }

    setLoading(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Rubric Analyzer</h1>

      {/* Essay upload + paste */}
      <div className="flex gap-4">
        <input
          type="file"
          accept=".txt"
          className="border p-2 flex-1"
          onChange={(e) =>
            e.target.files[0] && readFile(e.target.files[0]).then(setEssayText)
          }
        />
      </div>
      <textarea
        rows={8}
        className="w-full border p-2"
        placeholder="Or paste essay here…"
        value={essayText}
        onChange={(e) => setEssayText(e.target.value)}
      />

      {/* Rubric upload + paste */}
      <div className="flex gap-4">
        <input
          type="file"
          accept=".txt"
          className="border p-2 flex-1"
          onChange={(e) =>
            e.target.files[0] && readFile(e.target.files[0]).then(setRubricText)
          }
        />
      </div>
      <textarea
        rows={6}
        className="w-full border p-2"
        placeholder="Or paste rubric (one per line)…"
        value={rubricText}
        onChange={(e) => setRubricText(e.target.value)}
      />

      {/* Run Analysis */}
      <button
        onClick={runAnalysis}
        disabled={loading}
        className="bg-blue-600 text-white px-5 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Analyzing…" : "Run Analysis"}
      </button>

      {/* Highlighted Essay Pane */}
      <div className="relative w-full border p-2 h-48 overflow-auto">
        {/* Invisible base layer to preserve layout */}
        <pre className="invisible whitespace-pre-wrap">{essayText}</pre>

        {/* Red underline for missing */}
        <Highlighter
          highlightClassName="red-underline"
          searchWords={missing}
          autoEscape={true}
          textToHighlight={essayText}
          className="absolute inset-0"
        />

        {/* Green clickable highlights for met */}
        <Highlighter
          highlightClassName="bg-green-200 cursor-pointer"
          searchWords={met}
          autoEscape={true}
          textToHighlight={essayText}
          className="absolute inset-0"
          highlightTag={(chunks) => {
            const criterion = chunks.children;
            const match = semanticMatches.find(
              (m) => m.criterion === criterion
            );
            const secName = match?.section;
            return (
              <mark
                onClick={() => {
                  const ref = sectionRefs.current[secName];
                  if (ref?.current) {
                    ref.current.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }
                }}
              >
                {criterion}
              </mark>
            );
          }}
        />
      </div>

      {/* Results */}
      <div className="space-y-6">
        {/* Sections */}
        {sections.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold">📑 Sections</h2>
            {sections.map((sec, i) => {
              if (!sectionRefs.current[sec.name]) {
                sectionRefs.current[sec.name] = createRef();
              }
              return (
                <div
                  key={i}
                  ref={sectionRefs.current[sec.name]}
                  className="border-l-4 pl-3 mb-3"
                >
                  <strong>{sec.name}:</strong>
                  <p className="whitespace-pre-wrap">{sec.text}</p>
                </div>
              );
            })}
          </section>
        )}

        {/* Semantic Matches */}
        {semanticMatches.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold">🔍 Semantic Matches</h2>
            <ul className="list-decimal list-inside">
              {semanticMatches.map((m, i) => (
                <li key={i}>
                  {m.criterion} — {m.score.toFixed(2)} in <em>{m.section}</em>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Met & Missing */}
        <section>
          <h2 className="text-2xl font-semibold">✅ Met ({met.length})</h2>
          <ul className="list-disc list-inside">
            {met.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">
            ❌ Missing ({missing.length})
          </h2>
          <ul className="list-disc list-inside">
            {missing.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>

        {/* Suggestions */}
        {suggestions && (
          <section>
            <h2 className="text-2xl font-semibold">💡 Suggestions</h2>
            <pre className="whitespace-pre-wrap bg-gray-100 p-3 rounded">
              {suggestions}
            </pre>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
