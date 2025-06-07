import React, { useState, useEffect } from "react";
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
  Tooltip,
  Icon,
  useColorModeValue,
  CircularProgress,
  CircularProgressLabel,
  Card,
  CardBody,
  HStack,
  Badge,
  Center,
} from "@chakra-ui/react";
import {
  CheckCircleIcon,
  WarningIcon,
  InfoOutlineIcon,
  AttachmentIcon,
  EditIcon,
  StarIcon,
  AddIcon,
} from "@chakra-ui/icons";
import Highlighter from "react-highlight-words";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
  Area,
  AreaChart,
} from "recharts";

// Modern animations - CSS strings approach
const animations = {
  float: "float 6s ease-in-out infinite",
  pulse: "pulse 2s ease-in-out infinite",
  shimmer: "shimmer 1.5s infinite",
  slideInRight: "slideInRight 0.5s ease-out",
  bounceIn: "bounceIn 1s ease-out",
};

// Add CSS keyframes to document head
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes slideInRight {
      from { transform: translateX(20px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes bounceIn {
      0% { transform: scale(0.3); opacity: 0; }
      50% { transform: scale(1.05); }
      70% { transform: scale(0.9); }
      100% { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

// Enhanced Progress Ring Component
const ModernProgressRing = ({
  value,
  size = 120,
  thickness = 8,
  color = "blue.400",
  label,
  subtitle,
  centerContent,
}) => {
  const progressColor = useColorModeValue(color, color);
  const trackColor = useColorModeValue("gray.200", "gray.600");

  return (
    <Box position="relative" display="inline-block">
      <CircularProgress
        value={value}
        size={`${size}px`}
        thickness={`${thickness}px`}
        color={progressColor}
        trackColor={trackColor}
        capIsRound
        style={{
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))",
        }}
      >
        <CircularProgressLabel>
          {centerContent || (
            <VStack spacing={0}>
              <Text
                fontSize="2xl"
                fontWeight="900"
                color={useColorModeValue("gray.800", "white")}
              >
                {value}%
              </Text>
              {label && (
                <Text
                  fontSize="xs"
                  fontWeight="600"
                  color={useColorModeValue("gray.600", "gray.300")}
                >
                  {label}
                </Text>
              )}
              {subtitle && (
                <Text
                  fontSize="2xs"
                  color={useColorModeValue("gray.500", "gray.400")}
                >
                  {subtitle}
                </Text>
              )}
            </VStack>
          )}
        </CircularProgressLabel>
      </CircularProgress>
    </Box>
  );
};

// Enhanced Button Component with micro-animations
const AnimatedButton = ({ children, isLoading, onClick, ...props }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Button
      {...props}
      onClick={onClick}
      isLoading={isLoading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      transform={
        isPressed ? "scale(0.95)" : isHovered ? "translateY(-2px)" : "none"
      }
      boxShadow={
        isPressed
          ? "0 2px 8px rgba(0,0,0,0.2)"
          : isHovered
          ? "0 8px 25px rgba(0,0,0,0.15)"
          : "0 4px 12px rgba(0,0,0,0.1)"
      }
      transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      fontWeight="700"
      letterSpacing="0.5px"
      position="relative"
      overflow="hidden"
      _before={
        isLoading
          ? {
              content: '""',
              position: "absolute",
              top: 0,
              left: "-100%",
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
              animation: animations.shimmer,
            }
          : {}
      }
    >
      {children}
    </Button>
  );
};

// Enhanced Chart Component
const ModernChart = ({ data, type = "bar" }) => {
  const chartColors = ["#4299e1", "#48bb78", "#ed8936", "#f56565", "#9f7aea"];

  if (type === "pie") {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="score"
            label={({ name, value }) => `${name}: ${value}%`}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={chartColors[index % chartColors.length]}
              />
            ))}
          </Pie>
          <ReTooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
        >
          <XAxis dataKey="criterion" tick={{ fontSize: 12, fontWeight: 600 }} />
          <YAxis tick={{ fontSize: 12, fontWeight: 600 }} />
          <ReTooltip
            formatter={(value) => [`${value}%`, "Score"]}
            labelStyle={{ fontWeight: 600 }}
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              fontWeight: 500,
            }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#4299e1"
            strokeWidth={3}
            fill="url(#colorGradient)"
          />
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4299e1" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#4299e1" stopOpacity={0.1} />
            </linearGradient>
          </defs>
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <XAxis
          dataKey="criterion"
          tick={{ fontSize: 12, fontWeight: 600 }}
          tickLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          tick={{ fontSize: 12, fontWeight: 600 }}
          tickLine={{ stroke: "#e2e8f0" }}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <ReTooltip
          formatter={(value) => [`${value}%`, "Score"]}
          labelStyle={{ fontWeight: 600, color: "#2d3748" }}
          contentStyle={{
            borderRadius: "12px",
            border: "none",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            fontWeight: 500,
            backgroundColor: "white",
          }}
        />
        <Bar dataKey="score" radius={[6, 6, 0, 0]} fill="#4299e1">
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={
                entry.score >= 90
                  ? "#48bb78"
                  : entry.score >= 70
                  ? "#4299e1"
                  : entry.score >= 50
                  ? "#ed8936"
                  : "#f56565"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default function App() {
  // ——— State ——————————————————————————————————————————————————
  const [essayText, setEssayText] = useState("");
  const [rubricText, setRubricText] = useState("");
  const [essayFile, setEssayFile] = useState(null);
  const [rubricFile, setRubricFile] = useState(null);

  const [rubricId, setRubricId] = useState("");
  const [sections, setSections] = useState([]);
  const [matches, setMatches] = useState([]);
  const [semantic, setSemantic] = useState([]);
  const [met, setMet] = useState([]);
  const [missing, setMissing] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rubricProcessing, setRubricProcessing] = useState(false);

  const [essayDrag, setEssayDrag] = useState(false);
  const [rubricDrag, setRubricDrag] = useState(false);

  const chartColor = useColorModeValue("#3182CE", "#63B3ED");

  // ——— Whenever rubricText changes, call /parse_rubric —————————————————
  useEffect(() => {
    if (!rubricText.trim()) {
      console.log("Clearing rubricId because rubricText is empty");
      setRubricId("");
      setRubricProcessing(false);
      return;
    }

    console.log("Parsing rubric text:", rubricText.substring(0, 100) + "...");

    const timeoutId = setTimeout(() => {
      setRubricProcessing(true);

      fetch("/parse_rubric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rubric_text: rubricText }),
      })
        .then(async (res) => {
          console.log("Parse rubric response status:", res.status);

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errorText}`);
          }

          return res.json();
        })
        .then(({ rubric_id }) => {
          console.log("Successfully parsed rubric, ID:", rubric_id);
          setRubricId(rubric_id);
        })
        .catch((error) => {
          console.error("Rubric parsing failed:", error);
          alert(`Rubric parsing failed: ${error.message}`);
          setRubricId("");
        })
        .finally(() => {
          setRubricProcessing(false);
        });
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      setRubricProcessing(false);
    };
  }, [rubricText]);

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
      setRubricProcessing(true);

      const form = new FormData();
      form.append("file", f);
      fetch("/parse_rubric_pdf", {
        method: "POST",
        body: form,
      })
        .then(async (res) => {
          console.log("Parse rubric PDF response status:", res.status);

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errorText}`);
          }

          return res.json();
        })
        .then(({ rubric_id }) => {
          console.log("Successfully parsed rubric PDF, ID:", rubric_id);
          setRubricId(rubric_id);
        })
        .catch((error) => {
          console.error("Rubric PDF parsing failed:", error);
          alert(`Rubric PDF parsing failed: ${error.message}`);
          setRubricId("");
        })
        .finally(() => {
          setRubricProcessing(false);
        });
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
      setRubricProcessing(true);

      const form = new FormData();
      form.append("file", f);
      fetch("/parse_rubric_pdf", {
        method: "POST",
        body: form,
      })
        .then(async (res) => {
          console.log("Parse rubric PDF drop response status:", res.status);

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP ${res.status}: ${errorText}`);
          }

          return res.json();
        })
        .then(({ rubric_id }) => {
          console.log("Successfully parsed rubric PDF drop, ID:", rubric_id);
          setRubricId(rubric_id);
        })
        .catch((error) => {
          console.error("Rubric PDF drop parsing failed:", error);
          alert(`Rubric PDF drop parsing failed: ${error.message}`);
          setRubricId("");
        })
        .finally(() => {
          setRubricProcessing(false);
        });
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
    console.log("=== RUN ANALYSIS DEBUG ===");
    console.log("Current rubricId:", rubricId);
    console.log("Has essayText:", !!essayText, "Length:", essayText.length);
    console.log("Has rubricText:", !!rubricText, "Length:", rubricText.length);
    console.log("Has essayFile:", !!essayFile);
    console.log("Has rubricFile:", !!rubricFile);
    console.log("========================");

    if (!rubricId || !rubricText.trim()) {
      const missingParts = [];
      if (!rubricId) missingParts.push("rubric ID");
      if (!rubricText.trim()) missingParts.push("rubric text");

      alert(
        `Missing: ${missingParts.join(
          " and "
        )}. Please paste or upload a rubric and wait for it to be processed.`
      );
      return;
    }

    if (!essayText.trim() && !essayFile) {
      alert("Please upload or paste an essay first.");
      return;
    }

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
        console.log("Using PDF branch for analysis...");

        const form = new FormData();
        form.append("essay_file", essayFile);
        form.append("rubric_file", rubricFile);
        form.append("rubric_id", rubricId);

        console.log("Making structure_pdf request...");
        const secResponse = await fetch("/structure_pdf", {
          method: "POST",
          body: form,
        });
        if (!secResponse.ok) {
          const errorText = await secResponse.text();
          throw new Error(`PDF structure failed: ${errorText}`);
        }
        const pdfSections = await secResponse.json();
        setSections(pdfSections);

        console.log("Making score_essay_pdf request...");
        const matchResponse = await fetch("/score_essay_pdf", {
          method: "POST",
          body: form,
        });
        if (!matchResponse.ok) {
          const errorText = await matchResponse.text();
          throw new Error(`PDF scoring failed: ${errorText}`);
        }
        rawMatches = await matchResponse.json();

        setEssayText(extractTextFromSections(pdfSections));
      } else {
        console.log("Using text branch for analysis...");

        console.log("Making structure request...");

        const secRes = await fetch("/structure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: essayText }),
        });
        if (!secRes.ok) {
          const errorText = await secRes.text();
          throw new Error(`Structure failed: ${errorText}`);
        }
        setSections(await secRes.json());

        console.log("Making score_essay request...");

        const matchRes = await fetch("/score_essay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rubric_id: rubricId,
            essay_text: essayText,
          }),
        });
        if (!matchRes.ok) {
          const errorText = await matchRes.text();
          let errorDetail;
          try {
            const errorJson = JSON.parse(errorText);
            errorDetail = Array.isArray(errorJson)
              ? errorJson.map((e) => e.msg).join(";")
              : errorJson.detail || errorText;
          } catch {
            errorDetail = errorText;
          }
          throw new Error(`Scoring failed: ${errorDetail}`);
        }
        rawMatches = await matchRes.json();
      }

      console.log("Analysis successful, processing results...");

      const enriched = rawMatches.map((m) => ({
        ...m,
        met: m.score === m.max_score,
        partial: m.score > 0 && m.score < m.max_score,
      }));
      setMatches(enriched);

      setSemantic(
        enriched.map((m) => ({
          criterion: m.criterion,
          score:
            m.max_score > 0 ? Math.round((m.score / m.max_score) * 100) : 0,
        }))
      );

      const fullyMetList = enriched
        .filter((m) => m.met)
        .map((m) => m.criterion.trim());

      const partiallyMetList = enriched
        .filter((m) => m.partial)
        .map((m) => ({
          criterion: m.criterion.trim(),
          score: m.score,
          max_score: m.max_score,
        }));

      const missingMatches = enriched.filter((m) => m.score === 0);

      setMet(fullyMetList);
      setMissing(missingMatches.map((m) => m.criterion));

      const needsSuggestions = enriched.filter((m) => m.score < m.max_score);
      setSuggestions(
        needsSuggestions.map((m) => ({
          criterion: m.criterion,
          score: m.score,
          max_score: m.max_score,
          suggestion:
            m.suggestion ||
            `Consider improving ${m.criterion} to reach ${m.max_score} points.`,
          type: m.score === 0 ? "missing" : "partial",
        }))
      );
    } catch (err) {
      console.error("Analysis error:", err);
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ——— Progress & styling —————————————————————————————————————
  const totalPossiblePoints = matches.reduce((sum, m) => sum + m.max_score, 0);
  const earnedPoints = matches.reduce((sum, m) => sum + m.score, 0);
  const pct =
    totalPossiblePoints > 0
      ? Math.round((earnedPoints / totalPossiblePoints) * 100)
      : 0;
  const fullyMetCount = matches.filter((m) => m.score === m.max_score).length;
  const partiallyMetCount = matches.filter(
    (m) => m.score > 0 && m.score < m.max_score
  ).length;

  const colorScheme = pct < 50 ? "red" : pct < 80 ? "orange" : "green";
  const dragBorder = useColorModeValue("blue.300", "blue.600");

  // ——— Highlight tag ———————————————————————————————————————
  const HighlightTag = ({ children, ...props }) => (
    <Text as="span" bg="yellow.200" borderRadius="sm" px={1} {...props}>
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
    <Box
      p={6}
      bg={useColorModeValue("gray.50", "gray.900")}
      minH="100vh"
      mx="auto"
    >
      {/* Enhanced Header */}
      <VStack spacing={4} mb={8} textAlign="center">
        <Heading
          size="2xl"
          fontWeight="900"
          letterSpacing="tight"
          bgGradient="linear(to-r, blue.500, purple.600)"
          bgClip="text"
          animation={`${animations.bounceIn}`}
        >
          Rubric's Cube
        </Heading>
        <Text
          fontSize="lg"
          color={useColorModeValue("gray.600", "gray.300")}
          fontWeight="500"
          maxW="md"
        >
          Transform Rubrics into Actionable Writing Feedback
        </Text>
      </VStack>

      {/* Enhanced Status - Fixed Height */}
      <Box
        h="40px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        mb={3}
      >
        {rubricProcessing ? (
          <Badge
            colorScheme="blue"
            size="md"
            borderRadius="full"
            px={3}
            py={1}
            fontWeight="600"
            fontSize="xs"
            animation={animations.pulse}
          >
            🔄 Processing rubric...
          </Badge>
        ) : rubricId ? (
          <Badge
            colorScheme="green"
            size="md"
            borderRadius="full"
            px={3}
            py={1}
            fontWeight="600"
            fontSize="xs"
            animation={animations.slideInRight}
          >
            ✅ Rubric ready (ID: {rubricId})
          </Badge>
        ) : (
          <Box opacity={0}>
            {/* Invisible placeholder */}
            <Badge size="md" borderRadius="full" px={3} py={1} fontSize="xs">
              placeholder
            </Badge>
          </Box>
        )}
      </Box>

      {/* Enhanced Input Section - FIXED HEIGHT */}
      <Flex gap={6} mb={6} h="240px">
        {/* Essay Input Card */}
        <Card
          flex={1}
          boxShadow="xl"
          borderRadius="xl"
          overflow="hidden"
          h="100%"
        >
          <CardBody p={6} h="100%" display="flex" flexDirection="column">
            <VStack spacing={4} align="stretch" h="100%">
              <HStack justify="space-between" flexShrink={0}>
                <HStack>
                  <Icon as={EditIcon} color="blue.500" boxSize={5} />
                  <Heading
                    size="md"
                    fontWeight="800"
                    color={useColorModeValue("gray.800", "white")}
                  >
                    Essay Input
                  </Heading>
                </HStack>
                <AnimatedButton
                  size="sm"
                  leftIcon={<AttachmentIcon />}
                  colorScheme="blue"
                  variant="ghost"
                  as="label"
                  cursor="pointer"
                >
                  Upload File
                  <Input
                    type="file"
                    accept=".txt,.pdf"
                    onChange={handleEssayUpload}
                    display="none"
                  />
                </AnimatedButton>
              </HStack>

              <Box
                flex={1}
                border="3px dashed"
                borderColor={
                  essayDrag
                    ? "blue.400"
                    : useColorModeValue("gray.300", "gray.600")
                }
                borderRadius="xl"
                p={3}
                bg={
                  essayDrag
                    ? useColorModeValue("blue.50", "blue.900")
                    : "transparent"
                }
                transition="all 0.3s ease"
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setEssayDrag(true)}
                onDragLeave={() => setEssayDrag(false)}
                onDrop={essayDrop}
                display="flex"
                flexDirection="column"
              >
                <Textarea
                  flex={1}
                  placeholder="Drop or paste your essay here..."
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                  border="none"
                  resize="none"
                  fontSize="md"
                  fontWeight="500"
                  _focus={{ boxShadow: "none" }}
                />
              </Box>

              {essayFile && (
                <HStack
                  spacing={2}
                  animation={animations.slideInRight}
                  flexShrink={0}
                >
                  <Icon as={CheckCircleIcon} color="green.500" />
                  <Text fontSize="sm" fontWeight="600" color="green.600">
                    File loaded: {essayFile.name}
                  </Text>
                </HStack>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Rubric Input Card */}
        <Card
          flex={1}
          boxShadow="xl"
          borderRadius="xl"
          overflow="hidden"
          h="100%"
        >
          <CardBody p={6} h="100%" display="flex" flexDirection="column">
            <VStack spacing={4} align="stretch" h="100%">
              <HStack justify="space-between" flexShrink={0}>
                <HStack>
                  <Icon as={StarIcon} color="purple.500" boxSize={5} />
                  <Heading
                    size="md"
                    fontWeight="800"
                    color={useColorModeValue("gray.800", "white")}
                  >
                    Rubric Input
                  </Heading>
                </HStack>
                <AnimatedButton
                  size="sm"
                  leftIcon={<AttachmentIcon />}
                  colorScheme="purple"
                  variant="ghost"
                  as="label"
                  cursor="pointer"
                >
                  Upload File
                  <Input
                    type="file"
                    accept=".txt,.pdf"
                    onChange={handleRubricUpload}
                    display="none"
                  />
                </AnimatedButton>
              </HStack>

              <Box
                flex={1}
                border="3px dashed"
                borderColor={
                  rubricDrag
                    ? "purple.400"
                    : useColorModeValue("gray.300", "gray.600")
                }
                borderRadius="xl"
                p={3}
                bg={
                  rubricDrag
                    ? useColorModeValue("purple.50", "purple.900")
                    : "transparent"
                }
                transition="all 0.3s ease"
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setRubricDrag(true)}
                onDragLeave={() => setRubricDrag(false)}
                onDrop={rubricDrop}
                display="flex"
                flexDirection="column"
              >
                <Textarea
                  flex={1}
                  placeholder="Drop or paste your rubric here..."
                  value={rubricText}
                  onChange={(e) => setRubricText(e.target.value)}
                  border="none"
                  resize="none"
                  fontSize="md"
                  fontWeight="500"
                  _focus={{ boxShadow: "none" }}
                />
              </Box>

              {rubricFile && !rubricProcessing && (
                <HStack
                  spacing={2}
                  animation={animations.slideInRight}
                  flexShrink={0}
                >
                  <Icon as={CheckCircleIcon} color="green.500" />
                  <Text fontSize="sm" fontWeight="600" color="green.600">
                    File loaded: {rubricFile.name}
                  </Text>
                </HStack>
              )}
              {rubricProcessing && (
                <HStack spacing={2} animation={animations.pulse} flexShrink={0}>
                  <Text fontSize="sm" fontWeight="600" color="blue.500">
                    🔄 Processing rubric file...
                  </Text>
                </HStack>
              )}
            </VStack>
          </CardBody>
        </Card>
      </Flex>

      {/* Enhanced Analyze Button & Progress - Fixed Space */}
      <VStack spacing={4} mb={4} h="160px" justify="center">
        <Tooltip
          label={
            !(
              (essayFile && rubricFile) ||
              (essayText && rubricText && rubricId)
            )
              ? "Upload both PDF files or paste text. Make sure rubric is processed first."
              : ""
          }
          isDisabled={
            (essayFile && rubricFile) || (essayText && rubricText && rubricId)
          }
        >
          <AnimatedButton
            colorScheme="blue"
            size="md"
            px={8}
            py={4}
            fontSize="md"
            onClick={runAnalysis}
            isLoading={loading}
            isDisabled={
              !(
                (essayFile && rubricFile) ||
                (essayText && rubricText && rubricId)
              )
            }
            leftIcon={<Icon as={InfoOutlineIcon} boxSize={4} />}
            borderRadius="full"
            animation={
              (essayFile && rubricFile) || (essayText && rubricText && rubricId)
                ? animations.float
                : "none"
            }
          >
            {loading ? "Analyzing..." : "Run Analysis"}
          </AnimatedButton>
        </Tooltip>

        {/* Fixed Progress Section - Always Reserve Space */}
        <Box
          h="120px"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {matches.length > 0 ? (
            <HStack spacing={6}>
              <ModernProgressRing
                value={pct}
                size={120}
                thickness={8}
                color={
                  pct >= 80
                    ? "green.400"
                    : pct >= 60
                    ? "blue.400"
                    : pct >= 40
                    ? "orange.400"
                    : "red.400"
                }
                label="Score"
                subtitle={`${earnedPoints}/${totalPossiblePoints}`}
              />
              <VStack spacing={1} align="start">
                <Badge colorScheme="green" fontSize="xs" px={2}>
                  {fullyMetCount} fully met
                </Badge>
                <Badge colorScheme="yellow" fontSize="xs" px={2}>
                  {partiallyMetCount} partially met
                </Badge>
                <Badge colorScheme="red" fontSize="xs" px={2}>
                  {matches.length - fullyMetCount - partiallyMetCount} missing
                </Badge>
              </VStack>
            </HStack>
          ) : (
            <Box opacity={0}>
              {/* Invisible placeholder to maintain consistent spacing */}
              <HStack spacing={6}>
                <Box w="120px" h="120px" />
                <VStack spacing={1} align="start">
                  <Badge fontSize="xs" px={2} opacity={0}>
                    placeholder
                  </Badge>
                  <Badge fontSize="xs" px={2} opacity={0}>
                    placeholder
                  </Badge>
                  <Badge fontSize="xs" px={2} opacity={0}>
                    placeholder
                  </Badge>
                </VStack>
              </HStack>
            </Box>
          )}
        </Box>
      </VStack>

      {/* Dynamic Layout Container */}
      <Box
        display="grid"
        gridTemplateColumns="minmax(75vw, 1fr) 500px"
        gap={8}
        w="100%"
      >
        {/* Enhanced Essay Preview - Fixed Width */}
        <Card boxShadow="xl" borderRadius="xl" h="100%">
          <CardBody p={6} h="100%" display="flex" flexDirection="column">
            <Heading
              size="lg"
              mb={4}
              fontWeight="800"
              color={useColorModeValue("gray.800", "white")}
              flexShrink={0}
            >
              📝 Essay Preview
            </Heading>
            <Box
              flex={1}
              overflowY="auto"
              pr={2}
              minW="800px"
              css={{
                "&::-webkit-scrollbar": {
                  width: "6px",
                },
                "&::-webkit-scrollbar-track": {
                  width: "6px",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: useColorModeValue("#CBD5E0", "#4A5568"),
                  borderRadius: "3px",
                },
              }}
            >
              {displaySections.length > 0 ? (
                displaySections.map((sec, i) => (
                  <Box
                    key={i}
                    mb={6}
                    animation={`slideInRight ${0.5 + i * 0.1}s ease-out`}
                  >
                    <Heading size="sm" mb={3} fontWeight="700" color="blue.600">
                      {sec.name}
                    </Heading>
                    <Box
                      p={4}
                      bg={useColorModeValue("gray.50", "gray.700")}
                      borderRadius="lg"
                      borderLeft="4px solid"
                      borderLeftColor="blue.400"
                    >
                      <Highlighter
                        highlightTag={HighlightTag}
                        searchWords={snippetWords}
                        autoEscape
                        textToHighlight={sec.text || ""}
                      />
                    </Box>
                  </Box>
                ))
              ) : (
                <Center
                  h="100%"
                  color={useColorModeValue("gray.500", "gray.400")}
                >
                  <VStack>
                    <Text fontSize="lg" fontWeight="600">
                      No essay loaded yet
                    </Text>
                    <Text fontSize="sm">
                      Upload or paste an essay to see the preview
                    </Text>
                  </VStack>
                </Center>
              )}
            </Box>
          </CardBody>
        </Card>

        {/* Enhanced Sidebar - Dynamic Height */}
        <VStack spacing={4} align="stretch">
          {/* Enhanced Semantic Matches - Dynamic Height */}
          <Card boxShadow="lg" borderRadius="xl">
            <CardBody p={4}>
              <Heading
                size="md"
                mb={4}
                fontWeight="800"
                color={useColorModeValue("gray.800", "white")}
              >
                🎯 Semantic Matches
              </Heading>
              <Box maxH="300px" overflowY="auto">
                {matches.length > 0 ? (
                  <Box pb={2}>
                    <Accordion allowToggle>
                      {matches.map((m, i) => {
                        const fullyMet = m.score === m.max_score;
                        const partiallyMet =
                          m.score > 0 && m.score < m.max_score;
                        const iconComponent = fullyMet
                          ? CheckCircleIcon
                          : partiallyMet
                          ? InfoOutlineIcon
                          : WarningIcon;
                        const iconColor = fullyMet
                          ? "green.500"
                          : partiallyMet
                          ? "yellow.500"
                          : "red.500";
                        const expandedBg = fullyMet
                          ? "green.50"
                          : partiallyMet
                          ? "yellow.50"
                          : "red.50";
                        const statusSymbol = fullyMet
                          ? "✔️"
                          : partiallyMet
                          ? "➖"
                          : "❌";

                        return (
                          <AccordionItem key={i} border="none" mb={2}>
                            <AccordionButton
                              _expanded={{ bg: "transparent" }}
                              _focus={{ boxShadow: "none", outline: "none" }}
                              _active={{ bg: "transparent" }}
                              px={3}
                              py={2}
                              borderRadius="lg"
                              fontWeight="600"
                              fontSize="sm"
                              userSelect="none"
                              _hover={{
                                bg: useColorModeValue("gray.50", "gray.700"),
                              }}
                              transition="all 0.2s ease"
                              style={{
                                WebkitTapHighlightColor: "transparent",
                              }}
                            >
                              <Box
                                flex="1"
                                display="flex"
                                alignItems="center"
                                textAlign="left"
                              >
                                <Icon
                                  as={iconComponent}
                                  color={iconColor}
                                  mr={2}
                                  boxSize={4}
                                />
                                <Text noOfLines={1}>
                                  {m.criterion} — {m.score}/{m.max_score}{" "}
                                  {statusSymbol}
                                </Text>
                              </Box>
                              <AccordionIcon />
                            </AccordionButton>
                            <AccordionPanel pt={2} pb={3} pl={8} fontSize="sm">
                              {m.snippet ? (
                                <Box
                                  p={3}
                                  bg={useColorModeValue("gray.50", "gray.700")}
                                  borderRadius="md"
                                  borderLeft="3px solid"
                                  borderLeftColor={
                                    fullyMet
                                      ? "green.400"
                                      : partiallyMet
                                      ? "yellow.400"
                                      : "red.400"
                                  }
                                  maxH="100px"
                                  overflowY="auto"
                                >
                                  <Highlighter
                                    highlightTag={HighlightTag}
                                    searchWords={[m.snippet.trim()]}
                                    autoEscape
                                    textToHighlight={m.snippet.trim()}
                                  />
                                </Box>
                              ) : (
                                <Text
                                  fontSize="xs"
                                  color="gray.500"
                                  fontStyle="italic"
                                >
                                  No supporting snippet found.
                                </Text>
                              )}
                            </AccordionPanel>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </Box>
                ) : (
                  <Center
                    py={8}
                    color={useColorModeValue("gray.500", "gray.400")}
                  >
                    <Text fontSize="sm">No matches yet</Text>
                  </Center>
                )}
              </Box>
            </CardBody>
          </Card>

          {/* Enhanced Chart - Dynamic Height */}
          <Card boxShadow="lg" borderRadius="xl">
            <CardBody p={4}>
              <Heading
                size="md"
                mb={4}
                fontWeight="800"
                color={useColorModeValue("gray.800", "white")}
              >
                📊 Performance Chart
              </Heading>
              <Box h="200px">
                {semantic.length > 0 ? (
                  <ModernChart data={semantic} type="bar" />
                ) : (
                  <Center
                    h="200px"
                    color={useColorModeValue("gray.500", "gray.400")}
                  >
                    <Text fontSize="sm">Chart will appear after analysis</Text>
                  </Center>
                )}
              </Box>
            </CardBody>
          </Card>

          {/* Mini Progress Rings - Dynamic Height */}
          <Card boxShadow="lg" borderRadius="xl">
            <CardBody p={4}>
              <Heading
                size="md"
                mb={4}
                fontWeight="800"
                color={useColorModeValue("gray.800", "white")}
              >
                📋 Criteria Breakdown
              </Heading>
              <Box>
                {matches.length > 0 ? (
                  <Flex wrap="wrap" gap={2} justify="center" pb={4}>
                    {matches.map((m, i) => {
                      const percentage = Math.round(
                        (m.score / m.max_score) * 100
                      );
                      const color =
                        percentage >= 90
                          ? "green.400"
                          : percentage >= 70
                          ? "blue.400"
                          : percentage >= 50
                          ? "orange.400"
                          : "red.400";

                      return (
                        <VStack
                          key={i}
                          spacing={1}
                          animation={`bounceIn ${0.5 + i * 0.1}s ease-out`}
                        >
                          <ModernProgressRing
                            value={percentage}
                            size={85}
                            thickness={7}
                            color={color}
                            centerContent={
                              <VStack spacing={0}>
                                <Text
                                  fontSize="lg"
                                  fontWeight="900"
                                  color={useColorModeValue("gray.800", "white")}
                                >
                                  {m.score}
                                </Text>
                                <Text
                                  fontSize="xs"
                                  color={useColorModeValue(
                                    "gray.600",
                                    "gray.300"
                                  )}
                                >
                                  /{m.max_score}
                                </Text>
                              </VStack>
                            }
                          />
                          <Tooltip
                            label={m.criterion}
                            hasArrow
                            placement="top"
                            bg="gray.700"
                            color="white"
                            fontSize="sm"
                            px={3}
                            py={2}
                            borderRadius="md"
                          >
                            <Text
                              fontSize="xs"
                              fontWeight="600"
                              textAlign="center"
                              maxW="80px"
                              noOfLines={1}
                              cursor="default"
                              _hover={{ color: "blue.500" }}
                              transition="color 0.2s ease"
                            >
                              {m.criterion}
                            </Text>
                          </Tooltip>
                        </VStack>
                      );
                    })}
                  </Flex>
                ) : (
                  <Center
                    py={8}
                    color={useColorModeValue("gray.500", "gray.400")}
                  >
                    <Text fontSize="sm">
                      Progress rings will appear after analysis
                    </Text>
                  </Center>
                )}
              </Box>
            </CardBody>
          </Card>

          {/* Enhanced Suggestions - Dynamic Height */}
          <Card boxShadow="lg" borderRadius="xl">
            <CardBody p={4}>
              <Heading
                size="md"
                mb={4}
                fontWeight="800"
                color={useColorModeValue("gray.800", "white")}
              >
                💡 AI Suggestions
              </Heading>
              <Box maxH="250px" overflowY="auto">
                {suggestions.length > 0 ? (
                  <VStack spacing={3} align="stretch" pb={2}>
                    {suggestions.map((s, i) => (
                      <Box
                        key={i}
                        p={4}
                        borderLeft="4px solid"
                        borderLeftColor={
                          s.type === "missing" ? "red.400" : "yellow.400"
                        }
                        bg={useColorModeValue(
                          s.type === "missing" ? "red.50" : "yellow.50",
                          s.type === "missing" ? "red.900" : "yellow.900"
                        )}
                        borderRadius="lg"
                        animation={`slideInRight ${0.3 + i * 0.1}s ease-out`}
                      >
                        <HStack justify="space-between" mb={2}>
                          <Text
                            fontWeight="700"
                            fontSize="sm"
                            color={
                              s.type === "missing" ? "red.700" : "yellow.700"
                            }
                          >
                            {s.criterion}
                          </Text>
                          <Badge
                            colorScheme={
                              s.type === "missing" ? "red" : "yellow"
                            }
                            borderRadius="full"
                          >
                            {s.score}/{s.max_score}
                          </Badge>
                        </HStack>
                        <Text fontSize="sm" fontWeight="500" lineHeight="tall">
                          {s.suggestion}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                ) : matches.length > 0 ? (
                  <Box
                    p={4}
                    textAlign="center"
                    bg={useColorModeValue("green.50", "green.900")}
                    borderRadius="lg"
                    border="2px solid"
                    borderColor="green.200"
                    mb={2}
                  >
                    <Text
                      fontSize="md"
                      fontWeight="700"
                      color="green.600"
                      mb={1}
                    >
                      🎉 Perfect Score!
                    </Text>
                    <Text fontSize="xs" color="green.500" fontWeight="500">
                      All criteria fully met! Great work!
                    </Text>
                  </Box>
                ) : (
                  <Center
                    py={8}
                    color={useColorModeValue("gray.500", "gray.400")}
                  >
                    <Text fontSize="sm">
                      Suggestions will appear after analysis
                    </Text>
                  </Center>
                )}
              </Box>
            </CardBody>
          </Card>
        </VStack>
      </Box>
    </Box>
  );
}
