// src/App.jsx
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
  ListIcon,
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
  // ── State ─────────────────────────────────────────────────────────────
  const [essayText, setEssayText] = useState("");
  const [rubricText, setRubricText] = useState("");
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

  // re-parse rubric whenever the text changes
  useEffect(() => {
    setParsedRubric(parseRubric(rubricText));
  }, [rubricText]);

  // ALWAYS prefer flat lines if present, else fall back to byGrade
  const rubricItems =
    parsedRubric.flat?.length > 0
      ? parsedRubric.flat
      : parsedRubric.byGrade
      ? Object.values(parsedRubric.byGrade).flat()
      : [];

  // ── File helpers ───────────────────────────────────────────────────────
  const readFile = (file, setter) => {
    const reader = new FileReader();
    reader.onload = () => setter(reader.result.toString());
    reader.readAsText(file);
  };
  const handleEssayUpload = (e) => {
    const f = e.target.files?.[0];
    if (f) readFile(f, setEssayText);
  };
  const handleRubricUpload = (e) => {
    const f = e.target.files?.[0];
    if (f) readFile(f, setRubricText);
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────
  const essayDrop = (e) => {
    e.preventDefault();
    setEssayDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) readFile(f, setEssayText);
  };
  const rubricDrop = (e) => {
    e.preventDefault();
    setRubricDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) readFile(f, setRubricText);
  };

  // ── Custom highlight tag ──────────────────────────────────────────────
  const HighlightTag = ({ children, highlightIndex, ...props }) => {
    const all = [...met, ...missing];
    const term = all[highlightIndex];
    const isMet = met.includes(term);
    return (
      <Text
        as="span"
        bg={isMet ? "green.200" : undefined}
        textDecoration={isMet ? undefined : "underline"}
        textDecorationColor={isMet ? undefined : "red.500"}
        {...props}
      >
        {children}
      </Text>
    );
  };

  // ── Main Analysis ─────────────────────────────────────────────────────
  const runAnalysis = async () => {
    setLoading(true);
    setSections([]);
    setMatches([]);
    setSemantic([]);
    setMet([]);
    setMissing([]);
    setSuggestions([]);

    // sanitize into a string[] for the API
    const rubricArray = rubricItems.map((t) => t.trim()).filter(Boolean);

    // bail if still empty
    if (rubricArray.length === 0) {
      alert(
        "Please provide at least one rubric criterion before running analysis."
      );
      setLoading(false);
      return;
    }

    try {
      // 1️⃣ Structure call
      let res = await fetch("/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: essayText }),
      });
      if (!res.ok) throw new Error("Structure failed");
      setSections(await res.json());

      // 2️⃣ Analyze call
      res = await fetch("/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: essayText, rubric: rubricArray }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error(
          "🛑 /analyze errors:\n",
          JSON.stringify(errBody, null, 2)
        );
        const msg = Array.isArray(errBody)
          ? errBody.map((e) => e.msg || JSON.stringify(e)).join("; ")
          : errBody.detail || res.status;
        throw new Error("Analyze failed: " + msg);
      }

      const analysis = await res.json();
      setMatches(analysis);

      // 3️⃣ Chart data
      setSemantic(
        analysis.map((m) => ({
          criterion: m.criterion,
          score: Math.round(m.score * 100),
        }))
      );

      // 4️⃣ Met vs missing
      const metTexts = analysis.map((m) => m.criterion);
      setMet(metTexts);
      setMissing(rubricArray.filter((t) => !metTexts.includes(t)));

      // 5️⃣ Suggestions
      setSuggestions(
        rubricArray
          .filter((t) => !metTexts.includes(t))
          .map((t) => `Consider adding **${t}**.`)
      );
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Progress bar ──────────────────────────────────────────────────────
  const pct = rubricItems.length
    ? Math.round((met.length / rubricItems.length) * 100)
    : 0;
  const colorScheme = pct < 50 ? "red" : pct < 80 ? "orange" : "green";
  const dragBorder = useColorModeValue("blue.300", "blue.600");

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
              accept=".txt"
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
            onDragEnter={(e) => (e.preventDefault(), setEssayDrag(true))}
            onDragLeave={(e) => (e.preventDefault(), setEssayDrag(false))}
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
              accept=".txt"
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
            onDragEnter={(e) => (e.preventDefault(), setRubricDrag(true))}
            onDragLeave={(e) => (e.preventDefault(), setRubricDrag(false))}
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

      <Tooltip
        label="Please add at least one criterion to your rubric"
        isDisabled={rubricItems.length > 0}
      >
        <Button
          colorScheme="blue"
          onClick={runAnalysis}
          isLoading={loading}
          mb={4}
          isDisabled={rubricItems.length === 0}
          leftIcon={rubricItems.length === 0 ? <InfoOutlineIcon /> : undefined}
        >
          Run Analysis
        </Button>
      </Tooltip>

      {/* Progress */}
      <Box mb={6}>
        <Progress value={pct} size="sm" colorScheme={colorScheme} />
        <Text fontSize="xs" mt={1}>
          {met.length} / {rubricItems.length} criteria met ({pct}%)
        </Text>
      </Box>

      {/* Results */}
      <Flex gap={6} align="flex-start">
        {/* Essay Preview */}
        <Box
          flex={2}
          p={4}
          bg="gray.50"
          borderRadius="md"
          minH="300px"
          overflow="auto"
          fontFamily="mono"
          whiteSpace="pre-wrap"
        >
          <Heading size="sm" mb={2}>
            Essay Preview
          </Heading>
          <Highlighter
            highlightTag={HighlightTag}
            searchWords={[...met, ...missing]}
            autoEscape
            textToHighlight={essayText || "Your essay appears here…"}
          />
        </Box>

        {/* Right Panels */}
        <VStack flex={1} spacing={4} align="stretch">
          {/* Sections */}
          <Box p={4} bg="gray.50" borderRadius="md">
            <Heading size="sm" mb={2}>
              Sections
            </Heading>
            <Accordion allowToggle>
              {sections.map((sec, i) => (
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
                    _expanded={{ bg: "green.100" }}
                    px={2}
                    py={1}
                    borderRadius="md"
                  >
                    <Box
                      flex="1"
                      textAlign="left"
                      display="flex"
                      alignItems="center"
                    >
                      <Icon as={CheckCircleIcon} color="green.500" mr={2} />
                      {m.criterion} — {Math.round(m.score * 100)}%
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pt={0} pb={2} pl={6}>
                    <Text fontSize="xs" color="gray.600" mb={1}>
                      Section: {m.section}
                    </Text>
                    <List spacing={1}>
                      {m.snippets.map((s, j) => (
                        <ListItem key={j}>
                          <Text as="i" fontSize="sm">
                            “{s.sentence.trim()}”
                          </Text>
                        </ListItem>
                      ))}
                    </List>
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
                <Bar dataKey="score" fill="#3182CE" />
              </BarChart>
            </ResponsiveContainer>
          </Box>

          {/* Met Criteria */}
          <Box p={4} bg="gray.50" borderRadius="md">
            <Heading size="sm" mb={2}>
              Met Criteria
            </Heading>
            <List spacing={1}>
              {met.map((c, i) => (
                <ListItem key={i}>
                  <ListIcon as={CheckCircleIcon} color="green.500" />
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
                  <ListIcon as={WarningIcon} color="red.500" />
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
            <List spacing={1} styleType="disc" pl={4}>
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
