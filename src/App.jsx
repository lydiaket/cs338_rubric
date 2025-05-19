import React, { useState, useEffect } from "react";
import { parseRubric } from "./utils/parseRubric";
import {
  Box,
  Text,
  Flex,
  Textarea,
  Button,
  Heading,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  List,
  ListItem,
  VStack,
  Input,
  Progress,
  Tooltip,
  Icon,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  CheckCircleIcon,
  WarningIcon,
  InfoOutlineIcon,
} from "@chakra-ui/icons";
import Highlighter from "react-highlight-words";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
} from "recharts";

export default function App() {
  // ——— State ——————————————————————————————————————————————————
  const [essayText, setEssayText] = useState("");
  const [rubricText, setRubricText] = useState("");
  const [essayFile, setEssayFile] = useState(null);
  const [rubricFile, setRubricFile] = useState(null);

  const [parsedRubric, setParsedRubric] = useState({ flat: [], byGrade: {} });
  const [sections, setSections] = useState([]);
  const [matches, setMatches] = useState([]);
  const [semantic, setSemantic] = useState([]);
  const [met, setMet] = useState([]);
  const [missing, setMissing] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [essayDrag, setEssayDrag] = useState(false);
  const [rubricDrag, setRubricDrag] = useState(false);

  // ——— Parse rubric whenever rubricText changes —————————————————————
  useEffect(() => {
    setParsedRubric(parseRubric(rubricText));
  }, [rubricText]);

  // flatten rubric items for sending to backend
  const rubricItems =
    parsedRubric.flat?.length > 0
      ? parsedRubric.flat
      : parsedRubric.byGrade
      ? Object.values(parsedRubric.byGrade).flat()
      : [];
  const chartColor = useColorModeValue("#3182CE", "#63B3ED");

  // ——— File upload handlers ———————————————————————————————————————
  const handleEssayUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type === "application/pdf") {
      setEssayFile(f);
      setEssayText("");
    } else {
      setEssayFile(null);
      const reader = new FileReader();
      reader.onload = () => setEssayText(reader.result.toString());
      reader.readAsText(f);
    }
  };

  const handleRubricUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type === "application/pdf") {
      setRubricFile(f);
      setRubricText("");
    } else {
      setRubricFile(null);
      const reader = new FileReader();
      reader.onload = () => setRubricText(reader.result.toString());
      reader.readAsText(f);
    }
  };

  // ——— Drag & drop handlers —————————————————————————————————————
  const essayDrop = (e) => {
    e.preventDefault();
    setEssayDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (f.type === "application/pdf") {
      setEssayFile(f);
      setEssayText("");
    } else {
      setEssayFile(null);
      const reader = new FileReader();
      reader.onload = () => setEssayText(reader.result.toString());
      reader.readAsText(f);
    }
  };

  const rubricDrop = (e) => {
    e.preventDefault();
    setRubricDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (f.type === "application/pdf") {
      setRubricFile(f);
      setRubricText("");
    } else {
      setRubricFile(null);
      const reader = new FileReader();
      reader.onload = () => setRubricText(reader.result.toString());
      reader.readAsText(f);
    }
  };

  // ——— Function to split a single section into intro/body/conclusion ———
  const splitIntoThree = (text) => {
    const paras = text.split(/\n\s*\n/).filter((p) => p.trim());
    if (paras.length >= 3) {
      const intro = paras[0];
      const conclusion = paras[paras.length - 1];
      const body = paras.slice(1, -1).join("\n\n");
      return [
        { name: "Introduction", text: intro },
        { name: "Body", text: body },
        { name: "Conclusion", text: conclusion },
      ];
    }
    const sentences = text.split(/(?<=[.!?])\s+/);
    const n = sentences.length;
    const oneThird = Math.floor(n / 3);
    const intro = sentences.slice(0, oneThird).join(" ");
    const body = sentences.slice(oneThird, n - oneThird).join(" ");
    const conclusion = sentences.slice(n - oneThird).join(" ");
    return [
      { name: "Introduction", text: intro },
      { name: "Body", text: body },
      { name: "Conclusion", text: conclusion },
    ];
  };

  // ——— Utility to join section text for preview after PDF parse —————
  const extractTextFromSections = (secs) => secs.map((s) => s.text).join("\n");

  // ——— Main analysis function —————————————————————————————————————
  const runAnalysis = async () => {
    setLoading(true);
    setSections([]);
    setMatches([]);
    setSemantic([]);
    setMet([]);
    setMissing([]);
    setSuggestions([]);

    try {
      let rawMatches = [];

      if (essayFile && rubricFile) {
        const form = new FormData();
        form.append("essay_file", essayFile);
        form.append("rubric_file", rubricFile);

        const secResponse = await fetch("/structure_pdf", {
          method: "POST",
          body: form,
        });
        if (!secResponse.ok) throw new Error("PDF structure failed");
        const pdfSections = await secResponse.json();
        setSections(pdfSections);

        const matchResponse = await fetch("/analyze_pdf", {
          method: "POST",
          body: form,
        });
        if (!matchResponse.ok) throw new Error("PDF analysis failed");
        rawMatches = await matchResponse.json();

        setEssayText(extractTextFromSections(pdfSections));
      } else {
        const secRes = await fetch("/structure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: essayText }),
        });
        if (!secRes.ok) throw new Error("Structure failed");
        setSections(await secRes.json());

        const matchRes = await fetch("/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: essayText,
            rubric: rubricItems.map((t) => t.trim()).filter(Boolean),
          }),
        });
        if (!matchRes.ok) {
          const err = await matchRes.json().catch(() => ({}));
          throw new Error(
            Array.isArray(err)
              ? err.map((e) => e.msg).join(";")
              : err.detail || matchRes.status
          );
        }
        rawMatches = await matchRes.json();
      }

      const enriched = rawMatches.map((m) => ({ ...m, met: m.score > 0 }));
      setMatches(enriched);

      setSemantic(
        enriched.map((m) => ({
          criterion: m.criterion,
          score:
            m.max_score > 0 ? Math.round((m.score / m.max_score) * 100) : 0,
        }))
      );

      const metList = enriched
        .filter((m) => m.met)
        .map((m) => m.criterion.trim());
      const missingMatches = enriched.filter((m) => !m.met);
      setMet(metList);
      setMissing(missingMatches.map((m) => m.criterion));
      setSuggestions(
        missingMatches.map(
          (m) => m.suggestion || `Consider adding ${m.criterion}.`
        )
      );
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ——— Progress & styling —————————————————————————————————————
  const pct = matches.length
    ? Math.round((met.length / matches.length) * 100)
    : 0;
  const colorScheme = pct < 50 ? "red" : pct < 80 ? "orange" : "green";
  const dragBorder = useColorModeValue("blue.300", "blue.600");

  // ——— Highlight tag ———————————————————————————————————————
  const HighlightTag = ({ children, ...props }) => (
    <Text as="span" bg="yellow.200" {...props}>
      {children}
    </Text>
  );

  // ——— Build list of snippet texts to highlight —————————————————————
  const snippetWords = matches.map((m) => m.snippet?.trim()).filter(Boolean);

  // ——— Determine display sections —————————————————————————————————
  const displaySections =
    sections.length === 1
      ? splitIntoThree(sections[0].text)
      : sections.map((sec) => ({ name: sec.name, text: sec.text }));

  // ——— Render —————————————————————————————————————————————————————
  return (
    <Box p={6}>
      <Heading mb={6}>Rubric Analyzer</Heading>

      {/* Inputs */}
      <Flex gap={4} mb={4}>
        {/* Essay Input */}
        <Box flex={1}>
          <Flex justify="space-between" mb={2}>
            <Heading size="sm">Essay Input</Heading>
            <Input
              type="file"
              accept=".txt,.pdf"
              size="sm"
              onChange={handleEssayUpload}
            />
          </Flex>
          <Box
            p={2}
            mb={2}
            border="2px dashed"
            borderColor={essayDrag ? dragBorder : "transparent"}
            borderRadius="md"
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => setEssayDrag(true)}
            onDragLeave={() => setEssayDrag(false)}
            onDrop={essayDrop}
          >
            <Textarea
              rows={6}
              placeholder="Drop or paste essay…"
              value={essayText}
              onChange={(e) => setEssayText(e.target.value)}
            />
          </Box>
        </Box>

        {/* Rubric Input */}
        <Box flex={1}>
          <Flex justify="space-between" mb={2}>
            <Heading size="sm">Rubric Input</Heading>
            <Input
              type="file"
              accept=".txt,.pdf"
              size="sm"
              onChange={handleRubricUpload}
            />
          </Flex>
          <Box
            p={2}
            mb={2}
            border="2px dashed"
            borderColor={rubricDrag ? dragBorder : "transparent"}
            borderRadius="md"
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => setRubricDrag(true)}
            onDragLeave={() => setRubricDrag(false)}
            onDrop={rubricDrop}
          >
            <Textarea
              rows={6}
              placeholder="Drop or paste rubric…"
              value={rubricText}
              onChange={(e) => setRubricText(e.target.value)}
            />
          </Box>
        </Box>
      </Flex>

      {/* Analyze Button */}
      <Tooltip
        label="Upload both PDF files or paste text"
        isDisabled={(essayFile && rubricFile) || (essayText && rubricText)}
      >
        <Button
          colorScheme="blue"
          onClick={runAnalysis}
          isLoading={loading}
          mb={4}
          isDisabled={!((essayFile && rubricFile) || (essayText && rubricText))}
          leftIcon={<InfoOutlineIcon />}
        >
          Run Analysis
        </Button>
      </Tooltip>

      {/* Progress Bar */}
      <Box mb={6}>
        <Progress value={pct} size="sm" colorScheme={colorScheme} />
        <Text fontSize="xs" mt={1}>
          {met.length} / {matches.length} criteria met ({pct}%)
        </Text>
      </Box>

      <Flex gap={6} align="flex-start">
        {/* Essay Preview with highlighted snippets */}
        <Box
          flex={2}
          p={4}
          bg="gray.50"
          borderRadius="md"
          minH="300px"
          overflow="auto"
        >
          <Heading size="sm" mb={2}>
            Essay Preview
          </Heading>
          {displaySections.map((sec, i) => (
            <Box key={i} mb={4}>
              <Heading size="xs" mb={1}>
                {sec.name}
              </Heading>
              <Highlighter
                highlightTag={HighlightTag}
                searchWords={snippetWords}
                autoEscape
                textToHighlight={sec.text || ""}
              />
            </Box>
          ))}
        </Box>

        {/* Sidebar */}
        <VStack flex={1} spacing={4} align="stretch">
          {/* Sections Accordion */}
          <Box p={4} bg="gray.50" borderRadius="md">
            <Heading size="sm" mb={2}>
              Sections
            </Heading>
            <Accordion allowToggle>
              {displaySections.map((sec, i) => (
                <AccordionItem key={i}>
                  <AccordionButton>
                    <Box flex="1" textAlign="left">
                      {sec.name}
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel whiteSpace="pre-wrap">
                    {sec.text}
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </Box>

          {/* Semantic Matches */}
          <Box p={4} bg="gray.50" borderRadius="md">
            <Heading size="sm" mb={2}>
              Semantic Matches
            </Heading>
            <Accordion allowToggle>
              {matches.map((m, i) => (
                <AccordionItem key={i} border="none">
                  <AccordionButton
                    _expanded={{ bg: m.met ? "green.100" : "orange.100" }}
                    px={2}
                    py={1}
                    borderRadius="md"
                  >
                    <Box flex="1" display="flex" alignItems="center">
                      <Icon
                        as={m.met ? CheckCircleIcon : WarningIcon}
                        color={m.met ? "green.500" : "red.500"}
                        mr={2}
                      />
                      {m.criterion} — {m.score}/{m.max_score}{" "}
                      {m.met ? "✔️" : "❌"}
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pt={0} pb={2} pl={6}>
                    {m.snippet ? (
                      <Highlighter
                        highlightTag={HighlightTag}
                        searchWords={[m.snippet.trim()]}
                        autoEscape
                        textToHighlight={m.snippet.trim()}
                      />
                    ) : (
                      <Text fontSize="sm" color="gray.500">
                        No supporting snippet found.
                      </Text>
                    )}
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </Box>

          {/* Match Score Chart */}
          <Box p={4} bg="gray.50" borderRadius="md">
            <Heading size="sm" mb={2}>
              Match Score Chart
            </Heading>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={semantic}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <XAxis dataKey="criterion" tick={{ fontSize: 12 }} />
                <YAxis />
                <ReTooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="score" fill={chartColor} />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          {/* Score Details */}
          <Box p={4} bg="gray.50" borderRadius="md">
            <Heading size="sm" mb={2}>
              Score Details
            </Heading>
            <List spacing={1}>
              {matches.map((m, i) => (
                <ListItem key={i}>
                  {m.criterion}: {m.score}/{m.max_score}
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Met Criteria */}
          <Box p={4} bg="gray.50" borderRadius="md">
            <Heading size="sm" mb={2}>
              Met Criteria
            </Heading>
            <List spacing={1}>
              {met.map((c, i) => (
                <ListItem key={i}>
                  <Icon as={CheckCircleIcon} color="green.500" mr={2} />
                  {c}
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Missing Criteria */}
          <Box p={4} bg="gray.50" borderRadius="md">
            <Heading size="sm" mb={2}>
              Missing Criteria
            </Heading>
            <List spacing={1}>
              {missing.map((c, i) => (
                <ListItem key={i}>
                  <Icon as={WarningIcon} color="red.500" mr={2} />
                  {c}
                </ListItem>
              ))}
            </List>
          </Box>

          {/* Suggestions */}
          <Box p={4} bg="gray.50" borderRadius="md">
            <Heading size="sm" mb={2}>
              Suggestions
            </Heading>
            <List spacing={1} pl={4}>
              {suggestions.map((s, i) => (
                <ListItem key={i}>{s}</ListItem>
              ))}
            </List>
          </Box>
        </VStack>
      </Flex>
    </Box>
  );
}
