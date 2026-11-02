import { AnimatePresence, LayoutGroup, MotionConfig, motion, Reorder } from "framer-motion";
import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Code2,
  Download,
  FileText,
  Github,
  GraduationCap,
  GripVertical,
  Instagram,
  Layers3,
  Link2,
  Linkedin,
  Mail,
  MapPin,
  Moon,
  Palette,
  Plus,
  Printer,
  RotateCcw,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  UserRound,
  WandSparkles,
  Youtube,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { categories, findTemplate, templates } from "./templates";
import type { Template } from "./templates";
import { addUniqueSkills, getSkillBrands, splitSkillInput } from "./skills";
import type { SkillBrand } from "./skills";
import { useProfileEnrichment } from "./useProfileEnrichment";
import type { EnrichedProfile } from "./useProfileEnrichment";
import type { UnifiedCVData } from "../lib/normalizer";

type ResumeSection = {
  id: string;
  title: string;
  visible: boolean;
  kind: "experience" | "projects" | "education" | "skills" | "certifications" | "awards" | "custom";
  description: string;
  content?: string;
};

type Experience = {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  summary: string;
  bullets: string;
};

type Project = {
  id: string;
  name: string;
  description: string;
  url: string;
  language: string;
  stars?: number;
  commits?: number;
};

type Education = {
  id: string;
  degree: string;
  school: string;
  location: string;
  startDate: string;
  endDate: string;
  details: string;
};

type Credential = {
  id: string;
  name: string;
  organization: string;
  date: string;
};

type ResumeData = {
  name: string;
  title: string;
  email: string;
  phone: string;
  city: string;
  permanentAddress: string;
  github: string;
  linkedin: string;
  portfolio: string;
  twitter: string;
  summary: string;
  avatar: string;
  experiences: Experience[];
  projects: Project[];
  education: Education[];
  skills: string[];
  certifications: Credential[];
  awards: Credential[];
};

const sampleResume: ResumeData = {
  name: "Alex Morgan",
  title: "Product designer & frontend developer",
  email: "alex.morgan@email.com",
  phone: "+1 (415) 555-0138",
  city: "San Francisco, CA",
  permanentAddress: "",
  github: "github.com/alexmorgan",
  linkedin: "linkedin.com/in/alexmorgan",
  portfolio: "alexmorgan.design",
  twitter: "",
  summary:
    "Design-minded engineer building thoughtful digital products. I bring ideas to life through careful interaction design, accessible interfaces, and clean, dependable code.",
  avatar: "",
  experiences: [
    {
      id: "experience-1",
      title: "Senior Product Designer",
      company: "Northstar Studio",
      location: "San Francisco, CA",
      startDate: "2022",
      endDate: "Present",
      summary: "Led product design across a suite of tools used by 40k+ teams. Shipped an onboarding redesign that improved activation by 28%.",
      bullets: "Partnered with engineering to build an accessible component library.\nTurned customer insights into clear, measurable product improvements.",
    },
    {
      id: "experience-2",
      title: "Product Designer",
      company: "Common Thread",
      location: "Remote",
      startDate: "2019",
      endDate: "2022",
      summary: "Designed end-to-end experiences for early-stage teams, from first sketches to polished, production-ready interfaces.",
      bullets: "",
    },
  ],
  projects: [
    { id: "project-1", name: "interface-kit", description: "A tiny, thoughtful component library for the web.", url: "", language: "TypeScript" },
    { id: "project-2", name: "motion-notes", description: "Small experiments in motion and interaction.", url: "", language: "TypeScript" },
  ],
  education: [
    { id: "education-1", degree: "BFA, Interaction Design", school: "California College of the Arts", location: "San Francisco", startDate: "2015", endDate: "2019", details: "" },
  ],
  skills: ["Product design", "React & TypeScript", "Design systems", "Prototyping", "Accessibility", "Figma"],
  certifications: [
    { id: "certification-1", name: "Professional Certificate in UX Design", organization: "Interaction Design Foundation", date: "2023" },
  ],
  awards: [
    { id: "award-1", name: "Emerging Designer — Shortlist", organization: "Awwwards", date: "2022" },
  ],
};

const initialResume: ResumeData = {
  name: "",
  title: "",
  email: "",
  phone: "",
  city: "",
  permanentAddress: "",
  github: "",
  linkedin: "",
  portfolio: "",
  twitter: "",
  summary: "",
  avatar: "",
  experiences: [],
  projects: [],
  education: [],
  skills: [],
  certifications: [],
  awards: [],
};

const initialSections: ResumeSection[] = [
  { id: "experience", title: "Experience", visible: true, kind: "experience", description: "Selected work and impact" },
  { id: "projects", title: "Selected projects", visible: true, kind: "projects", description: "Side projects & open source" },
  { id: "education", title: "Education", visible: true, kind: "education", description: "Learning & qualifications" },
  { id: "skills", title: "Skills", visible: true, kind: "skills", description: "Tools & capabilities" },
  { id: "certifications", title: "Certifications", visible: false, kind: "certifications", description: "Credentials & courses" },
  { id: "awards", title: "Awards", visible: false, kind: "awards", description: "Recognition & honors" },
];

const defaultTemplate = findTemplate("modern-profile") ?? templates[0];

function isSafeAvatarDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 7 * 1024 * 1024 &&
    /^data:image\/(?:png|jpeg|webp|gif|avif);base64,[a-z\d+/]+=*$/i.test(value)
  );
}

type WorkspaceSnapshot = {
  data: ResumeData;
  sections: ResumeSection[];
  templateId: string;
  accent: string;
  fontStyle: "sans" | "serif" | "mono";
  spacing: "compact" | "normal" | "relaxed";
  photoShape: "circle" | "rounded" | "hexagon";
  showPhoto: boolean;
};

const storageKey = "folio.resume.workspace.v2";
const sectionKinds = ["experience", "projects", "education", "skills", "certifications", "awards", "custom"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringEntries<T>(
  value: unknown,
  keys: Array<keyof T>,
): T[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  const entries: T[] = [];
  for (const item of value) {
    if (!isRecord(item) || keys.some((key) => typeof item[key as string] !== "string" || (item[key as string] as string).length > 20_000)) {
      return null;
    }
    entries.push(item as T);
  }
  return entries;
}

function parseWorkspace(value: unknown): WorkspaceSnapshot | null {
  if (!isRecord(value) || !isRecord(value.data) || !Array.isArray(value.sections)) return null;
  const source = value.data;
  const stringFields: Array<keyof ResumeData> = [
    "name", "title", "email", "phone", "city", "permanentAddress", "github", "linkedin", "portfolio", "twitter", "summary",
  ];
  if (
    stringFields.some((key) => typeof source[key] !== "string" || (source[key] as string).length > 20_000) ||
    (typeof source.avatar !== "string" && source.avatar !== undefined)
  ) return null;

  const experiences = source.experiences === undefined
    ? initialResume.experiences
    : readStringEntries<Experience>(source.experiences, ["id", "title", "company", "location", "startDate", "endDate", "summary", "bullets"]);
  const projects = source.projects === undefined
    ? initialResume.projects
    : readStringEntries<Project>(source.projects, ["id", "name", "description", "url", "language"]);
  const education = source.education === undefined
    ? initialResume.education
    : readStringEntries<Education>(source.education, ["id", "degree", "school", "location", "startDate", "endDate", "details"]);
  const certifications = source.certifications === undefined
    ? initialResume.certifications
    : readStringEntries<Credential>(source.certifications, ["id", "name", "organization", "date"]);
  const awards = source.awards === undefined
    ? initialResume.awards
    : readStringEntries<Credential>(source.awards, ["id", "name", "organization", "date"]);
  if (!experiences || !projects || !education || !certifications || !awards) return null;
  if (
    projects.some((project) => (project.stars !== undefined && (!Number.isFinite(project.stars) || project.stars < 0)) ||
      (project.commits !== undefined && (!Number.isFinite(project.commits) || project.commits < 0))) ||
    (source.skills !== undefined && (!Array.isArray(source.skills) || source.skills.length > 100 || source.skills.some((skill) => typeof skill !== "string" || skill.length > 200)))
  ) return null;

  if (value.sections.length > 30) return null;
  const sections: ResumeSection[] = [];
  const seenIds = new Set<string>();
  for (const section of value.sections) {
    if (
      !isRecord(section) ||
      typeof section.id !== "string" ||
      typeof section.title !== "string" ||
      typeof section.description !== "string" ||
      typeof section.visible !== "boolean" ||
      !sectionKinds.includes(section.kind as (typeof sectionKinds)[number]) ||
      (section.content !== undefined && typeof section.content !== "string") ||
      seenIds.has(section.id)
    ) return null;
    seenIds.add(section.id);
    sections.push({
      id: section.id,
      title: section.title.slice(0, 100),
      description: section.description.slice(0, 200),
      visible: section.visible,
      kind: section.kind as ResumeSection["kind"],
      ...(typeof section.content === "string" ? { content: section.content.slice(0, 20_000) } : {}),
    });
  }
  const data: ResumeData = {
    name: source.name as string,
    title: source.title as string,
    email: source.email as string,
    phone: source.phone as string,
    city: source.city as string,
    permanentAddress: source.permanentAddress as string,
    github: source.github as string,
    linkedin: source.linkedin as string,
    portfolio: source.portfolio as string,
    twitter: source.twitter as string,
    summary: source.summary as string,
    experiences,
    projects,
    education,
    skills: Array.isArray(source.skills) ? source.skills.filter((skill): skill is string => typeof skill === "string").slice(0, 100) : initialResume.skills,
    certifications,
    awards,
    avatar: isSafeAvatarDataUrl(source.avatar) ? source.avatar : "",
  };
  const selectedTemplate = typeof value.templateId === "string" ? findTemplate(value.templateId) : undefined;
  const accent = typeof value.accent === "string" && /^#[\da-f]{6}$/i.test(value.accent) ? value.accent : "#6b72d6";
  const fontStyle = ["sans", "serif", "mono"].includes(String(value.fontStyle)) ? value.fontStyle as WorkspaceSnapshot["fontStyle"] : "sans";
  const spacing = ["compact", "normal", "relaxed"].includes(String(value.spacing)) ? value.spacing as WorkspaceSnapshot["spacing"] : "normal";
  const photoShape = ["circle", "rounded", "hexagon"].includes(String(value.photoShape)) ? value.photoShape as WorkspaceSnapshot["photoShape"] : "circle";
  return {
    data,
    sections,
    templateId: selectedTemplate?.id ?? defaultTemplate.id,
    accent,
    fontStyle,
    spacing,
    photoShape,
    showPhoto: typeof value.showPhoto === "boolean" ? value.showPhoto : true,
  };
}

function readSavedWorkspace(): { workspace?: WorkspaceSnapshot; message?: string } {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return {};
    const workspace = parseWorkspace(JSON.parse(saved) as unknown);
    return workspace
      ? { workspace }
      : { message: "Saved resume data could not be read; start a fresh resume or import a backup." };
  } catch {
    return { message: "Local storage is unavailable; export a JSON backup to keep your changes." };
  }
}

type Tab = "content" | "sections" | "templates" | "style";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function App() {
  const [showIntro, setShowIntro] = useState(false);
  const introStartHandled = useRef(false);
  const [restoreResult] = useState(readSavedWorkspace);
  const restored = restoreResult.workspace;
  const [data, setData] = useState(restored?.data ?? initialResume);
  const [sections, setSections] = useState(restored?.sections ?? initialSections);
  const [template, setTemplate] = useState(() => findTemplate(restored?.templateId) ?? defaultTemplate);
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [tab, setTab] = useState<Tab>("content");
  const editorTabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    content: null,
    sections: null,
    templates: null,
    style: null,
  });
  const [dark, setDark] = useState(false);
  const [accent, setAccent] = useState(restored?.accent ?? "#6b72d6");
  const [fontStyle, setFontStyle] = useState<"sans" | "serif" | "mono">(restored?.fontStyle ?? "sans");
  const [spacing, setSpacing] = useState<"compact" | "normal" | "relaxed">(restored?.spacing ?? "normal");
  const [photoShape, setPhotoShape] = useState<"circle" | "rounded" | "hexagon">(restored?.photoShape ?? "circle");
  const [showPhoto, setShowPhoto] = useState(restored?.showPhoto ?? true);
  const [zoom, setZoom] = useState(100);
  const [saveStatus, setSaveStatus] = useState(restoreResult.message ?? (restored ? "Restored from this device" : "Saved on this device"));
  const [linkedinInput, setLinkedinInput] = useState("");
  const [showEnrichment, setShowEnrichment] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [profileApiAvailable, setProfileApiAvailable] = useState(false);
  const [githubInput, setGithubInput] = useState("");
  const [customName, setCustomName] = useState("");
  const [toast, setToast] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const linkedInImportRef = useRef<HTMLInputElement>(null);
  const oauthCallbackHandled = useRef(false);
  const toastTimeoutRef = useRef<number | null>(null);
  const {
    profile,
    loading,
    error,
    generatingSummary,
    fetchGitHub,
    fetchPublicGitHub,
    fetchLinkedIn,
    importLinkedInFile,
    generateSummary,
    parseLinkedIn,
  } = useProfileEnrichment();
  const visibleTemplates = useMemo(
    () => templates.filter((item) => category === "All" || item.category === category),
    [category],
  );
  const enabledSections = sections.filter((section) => section.visible);
  const personalDetailsCompleted = [
    data.name,
    data.title,
    data.email,
    data.phone,
    data.city,
    data.summary,
  ].filter((value) => value.trim()).length;
  const profileCompleteness = Math.round(
    [
      data.name.trim(),
      data.title.trim(),
      data.email.trim(),
      data.phone.trim(),
      data.city.trim(),
      data.summary.trim(),
      data.experiences.some((entry) => entry.title.trim() || entry.company.trim() || entry.summary.trim() || entry.bullets.trim()),
      data.education.some((entry) => entry.degree.trim() || entry.school.trim() || entry.details.trim()),
      data.projects.some((entry) => entry.name.trim() || entry.description.trim()),
      data.skills.some((skill) => skill.trim()),
    ]
      .filter(Boolean).length * 10,
  );
  const strengthLabel = profileCompleteness >= 80 ? "Looking strong" : profileCompleteness >= 50 ? "Good start" : "Needs a few details";

  useLayoutEffect(() => {
    if (introStartHandled.current) return;
    introStartHandled.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (window.sessionStorage.getItem("folio-intro-seen") === "true") return;
      window.sessionStorage.setItem("folio-intro-seen", "true");
      setShowIntro(true);
    } catch {
      setShowIntro(false);
    }
  }, []);

  useEffect(() => {
    if (!showIntro) return;
    const timeout = window.setTimeout(() => setShowIntro(false), 3150);
    return () => window.clearTimeout(timeout);
  }, [showIntro]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({
          version: 2,
          data,
          sections,
          templateId: template.id,
          accent,
          fontStyle,
          spacing,
          photoShape,
          showPhoto,
        }));
        setSaveStatus("Saved on this device");
      } catch {
        setSaveStatus("Could not save — export a JSON backup");
      }
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [data, sections, template, accent, fontStyle, spacing, photoShape, showPhoto]);

  function updateField<K extends keyof ResumeData>(key: K, value: ResumeData[K]) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function notify(message: string) {
    setToast(message);
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToast(""), 2600);
  }

  function chooseTemplate(next: Template) {
    setTemplate(next);
    setAccent(next.accent);
    setFontStyle(next.font);
  }

  function loadSampleResume() {
    setData(sampleResume);
    setSections(initialSections);
    setTemplate(defaultTemplate);
    setAccent(defaultTemplate.accent);
    setFontStyle(defaultTemplate.font);
    setSpacing("normal");
    setPhotoShape("circle");
    setShowPhoto(true);
    notify("Sample resume loaded — replace the example details");
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, current: Tab) {
    const tabOrder: Tab[] = ["content", "sections", "templates", "style"];
    const currentIndex = tabOrder.indexOf(current);
    const nextIndex = event.key === "ArrowRight"
      ? (currentIndex + 1) % tabOrder.length
      : event.key === "ArrowLeft"
        ? (currentIndex - 1 + tabOrder.length) % tabOrder.length
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? tabOrder.length - 1
            : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const next = tabOrder[nextIndex];
    setTab(next);
    editorTabRefs.current[next]?.focus();
  }

  function applyImportedProfile(
    selectedProjects: UnifiedCVData["projects"],
    selectedExperience: UnifiedCVData["experience"],
  ) {
    if (!profile) return;
    setData((current) => {
      const personal = profile.personal;
      const additions = selectedProjects
        .filter((project) => !current.projects.some((existing) =>
          existing.url && project.githubUrl
            ? existing.url.replace(/\/+$/, "").toLowerCase() === project.githubUrl.replace(/\/+$/, "").toLowerCase()
            : existing.name.trim().toLowerCase() === project.title.toLowerCase(),
        ))
        .map((project, index) => ({
          id: `imported-${Date.now()}-${index}`,
          name: project.title,
          description: project.description,
          url: project.liveUrl || project.githubUrl || "",
          language: project.techStack.join(", "),
          stars: project.stars,
        }));
      const existingExperience = current.experiences;
      const importedExperience = selectedExperience
        .filter((entry) => !existingExperience.some((existing) =>
          existing.title.trim().toLowerCase() === entry.role.toLowerCase() &&
          existing.company.trim().toLowerCase() === entry.company.toLowerCase(),
        ))
        .map((entry, index) => ({
          id: `linkedin-${Date.now()}-${index}`,
          title: entry.role,
          company: entry.company,
          location: "",
          startDate: entry.startDate,
          endDate: entry.endDate,
          summary: "",
          bullets: entry.highlights.join("\n"),
        }));
      return {
        ...current,
        name: personal.name || current.name,
        title: personal.title || current.title,
        email: personal.email || current.email,
        avatar: personal.avatar || current.avatar,
        github: personal.github?.replace(/^https?:\/\//, "") || current.github,
        linkedin: personal.linkedInUrl?.replace(/^https?:\/\//, "") || current.linkedin,
        city: personal.location || current.city,
        summary: personal.bio || current.summary,
        projects: [...current.projects, ...additions],
        experiences: [...current.experiences, ...importedExperience],
        skills: [...new Set([...current.skills, ...profile.skills])],
      };
    });
    setSections((current) => current.map((section) =>
      section.id === "projects" && selectedProjects.length
        ? { ...section, visible: true }
        : section.id === "experience" && selectedExperience.length
          ? { ...section, visible: true }
          : section,
    ));
    notify("Selected profile details added to your resume");
  }

  function applyLinkedIn() {
    const result = parseLinkedIn(linkedinInput);
    if (result?.linkedInUrl) {
      updateField("linkedin", result.linkedInUrl.replace(/^https?:\/\//, ""));
      notify("LinkedIn URL added — profile details stay yours to edit");
    }
  }

  async function importPublicGitHub(value: string) {
    const result = await fetchPublicGitHub(value);
    if (result) notify("GitHub profile is ready to review");
    return result;
  }

  function handleLinkedInFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    void importLinkedInFile(file).then((result) => {
      if (!result) return;
      setShowEnrichment(true);
      notify("LinkedIn profile file is ready to review");
    });
  }

  async function summarizeExperience(index: number) {
    const experience = data.experiences[index];
    if (!experience) return;
    const source = [experience.title, experience.company, experience.summary, experience.bullets]
      .filter(Boolean)
      .join("\n");
    const summary = await generateSummary(source);
    if (!summary) {
      notify("Could not generate a summary. Check the AI and rate-limit configuration.");
      return;
    }
    setData((current) => ({
      ...current,
      experiences: current.experiences.map((entry) =>
        entry.id === experience.id ? { ...entry, summary } : entry,
      ),
    }));
    notify("AI summary drafted — review it before exporting");
  }

  function connectGitHub() {
    window.location.assign("/api/oauth/github/start");
  }

  function connectLinkedIn() {
    window.location.assign("/api/oauth/linkedin/start");
  }

  async function disconnectProviders() {
    try {
      const response = await fetch("/api/oauth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(`Disconnect failed (${response.status}).`);
      setGithubConnected(false);
      setLinkedinConnected(false);
      notify("Connected accounts disconnected");
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Could not disconnect accounts.");
    }
  }

  useEffect(() => {
    void fetch("/api/oauth/status", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Account status check failed (${response.status}).`);
        const status: unknown = await response.json();
        if (typeof status !== "object" || status === null || !("github" in status) || !("linkedin" in status) ||
          typeof status.github !== "boolean" || typeof status.linkedin !== "boolean") {
          throw new Error("The account status service returned invalid data.");
        }
        setGithubConnected(status.github);
        setLinkedinConnected(status.linkedin);
        setProfileApiAvailable(true);
      })
      .catch(() => setProfileApiAvailable(false));
    if (oauthCallbackHandled.current) return;
    const query = new URLSearchParams(window.location.search);
    const connected = query.get("connected");
    const oauthError = query.get("oauthError");
    if (!connected && !oauthError) return;
    oauthCallbackHandled.current = true;
    window.history.replaceState({}, "", window.location.pathname);
    setShowEnrichment(true);
    if (oauthError) {
      notify(oauthError === "configuration"
        ? "OAuth is not configured for this deployment."
        : "Profile sign-in did not finish. Please try again.");
      return;
    }
    if (connected === "github") {
      setGithubConnected(true);
      void fetchGitHub().then((result) => {
        if (result) notify("GitHub profile is ready to review");
      });
    } else if (connected === "linkedin") {
      setLinkedinConnected(true);
      void fetchLinkedIn().then((result) => {
        if (result) notify("LinkedIn identity is ready to review");
      });
    }
  }, []);

  function toggleSection(id: string) {
    setSections((current) => current.map((section) => (section.id === id ? { ...section, visible: !section.visible } : section)));
  }

  function moveSection(id: string, offset: number) {
    setSections((current) => {
      const currentIndex = current.findIndex((section) => section.id === id);
      const nextIndex = currentIndex + offset;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [section] = next.splice(currentIndex, 1);
      next.splice(nextIndex, 0, section);
      return next;
    });
  }

  function addSection() {
    const title = customName.trim();
    if (!title) return;
    setSections((current) => [...current, { id: `custom-${Date.now()}`, title, visible: true, kind: "custom", description: "Your own section" }]);
    setCustomName("");
  }

  function saveJson() {
    const blob = new Blob([JSON.stringify({
      version: 2,
      data,
      sections,
      templateId: template.id,
      accent,
      fontStyle,
      spacing,
      photoShape,
      showPhoto,
    }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "resume"}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Resume data exported");
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      notify("Choose a resume export smaller than 12 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as unknown;
        const remoteAvatarRemoved = isRecord(parsed) && isRecord(parsed.data) &&
          typeof parsed.data.avatar === "string" && Boolean(parsed.data.avatar) && !isSafeAvatarDataUrl(parsed.data.avatar);
        const workspace = parseWorkspace(parsed);
        if (!workspace) throw new Error("This file is not a valid folio resume export.");
        setData(workspace.data);
        setSections(workspace.sections);
        setTemplate(findTemplate(workspace.templateId) ?? defaultTemplate);
        setAccent(workspace.accent);
        setFontStyle(workspace.fontStyle);
        setSpacing(workspace.spacing);
        setPhotoShape(workspace.photoShape);
        setShowPhoto(workspace.showPhoto);
        notify(remoteAvatarRemoved ? "Resume imported; remote photo removed for privacy" : "Resume imported");
      } catch (reason) {
        notify(reason instanceof Error ? reason.message : "Could not read this resume file");
      }
      event.target.value = "";
    };
    reader.onerror = () => {
      notify("Could not read this resume file");
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  async function copyHtml() {
    const element = document.getElementById("resume-paper");
    if (!element) return;
    try {
      const css = Array.from(document.styleSheets)
        .flatMap((sheet) => Array.from(sheet.cssRules, (rule) => rule.cssText))
        .join("\n");
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(data.name || "Resume")}</title><style>${css}\nbody{margin:0;background:#fff}.resume-paper{box-shadow:none!important;margin:0 auto}</style></head><body>${element.outerHTML}</body></html>`;
      await navigator.clipboard.writeText(html);
      notify("Resume HTML copied");
    } catch {
      notify("Clipboard access unavailable — use the print option instead");
    }
  }

  function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(?:png|jpeg|webp|gif|avif)$/i.test(file.type)) {
      notify("Choose a PNG, JPEG, WebP, GIF, or AVIF image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify("Choose an image under 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateField("avatar", String(reader.result));
    reader.onerror = () => notify("Could not read that image");
    reader.readAsDataURL(file);
  }

  return (
    <MotionConfig reducedMotion="user">
    <LayoutGroup>
    <main className={`${dark ? "app dark" : "app"}${showIntro ? " intro-pending" : ""}`}>
      <AnimatePresence>
        {showIntro && (
          <motion.div
            className="intro-splash"
            role="status"
            aria-label="folio resume studio loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.08, filter: "blur(18px)" }}
            transition={{ duration: 0.38, ease: "easeInOut" }}
          >
            <div className="intro-grid" aria-hidden="true" />
            <div className="intro-orbit intro-orbit-one" aria-hidden="true" />
            <div className="intro-orbit intro-orbit-two" aria-hidden="true" />
            <motion.div className="intro-brand" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.35, duration: 0.55 }}>
              <motion.span layoutId="folio-brand-mark" className="brand-mark intro-logo-mark"><FolioLogo instance="intro" /></motion.span>
              <span className="intro-wordmark">folio<span>.</span></span>
              <span className="intro-caption">RESUME STUDIO</span>
            </motion.div>
            <span className="intro-loader" aria-hidden="true" />
            <span className="intro-sweep" aria-hidden="true" />
            <button type="button" className="intro-skip" onClick={() => setShowIntro(false)}>Skip intro</button>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="topbar">
        <a className="brand" href="#" aria-label="folio home">
          <motion.span layoutId="folio-brand-mark" className="brand-mark"><FolioLogo instance="header" /></motion.span>
          <span>folio<span className="brand-period">.</span></span>
          <span className="brand-divider" />
          <span className="brand-context">RESUME STUDIO</span>
        </a>
        <div className="topbar-center">
          <span className="document-dot" />
          <span>Untitled resume</span>
          <span className={saveStatus.startsWith("Could not") || saveStatus.startsWith("Local storage") ? "saved-state save-error" : "saved-state"}><Check size={12} /> {saveStatus}</span>
        </div>
        <div className="topbar-actions">
          <button className="icon-button theme-toggle" aria-label="Toggle color theme" onClick={() => setDark(!dark)}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="button button-outline top-export" onClick={saveJson}><Download size={15} /> Export JSON</button>
          <button className="button button-primary top-pdf" onClick={() => window.print()}><Printer size={15} /> Download PDF</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="left-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">YOUR WORKSPACE</span>
              <h1>Resume editor</h1>
            </div>
            <button className="icon-button quiet reset-button" title="Clear resume" aria-label="Clear resume" onClick={() => { setData(initialResume); setSections(initialSections); setTemplate(defaultTemplate); setAccent(defaultTemplate.accent); setFontStyle(defaultTemplate.font); setSpacing("normal"); setPhotoShape("circle"); setShowPhoto(true); }}>
              <RotateCcw size={15} />
            </button>
          </div>
          <div className="progress-card">
            <div className="progress-row">
              <div><span className="progress-label">Profile strength</span><strong>{strengthLabel}</strong></div>
              <span className="progress-percent">{profileCompleteness}%</span>
            </div>
            <div className="progress-track"><span style={{ width: `${profileCompleteness}%` }} /></div>
            <p>{profileCompleteness === 100 ? "Your core details are filled in." : "Complete more details to strengthen your profile."}</p>
          </div>

          <div className="tab-bar" role="tablist" aria-label="Resume editor panels">
            {([
              ["content", "Content"],
              ["sections", "Sections"],
              ["templates", "Templates"],
              ["style", "Style"],
            ] as Array<[Tab, string]>).map(([id, label]) => (
              <button
                key={id}
                ref={(element) => { editorTabRefs.current[id] = element; }}
                id={`editor-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={tab === id}
                aria-controls={`editor-panel-${id}`}
                tabIndex={tab === id ? 0 : -1}
                className={tab === id ? "tab active" : "tab"}
                onKeyDown={(event) => handleTabKeyDown(event, id)}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="editor-scroll">
            <motion.div key={tab} id={`editor-panel-${tab}`} role="tabpanel" aria-labelledby={`editor-tab-${tab}`} tabIndex={0} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="tab-content">
                {tab === "content" && (
                  <ContentEditor
                    data={data}
                    updateField={updateField}
                    sections={sections}
                    setSections={setSections}
                    personalDetailsCompleted={personalDetailsCompleted}
                    onLoadSample={loadSampleResume}
                    onEnrichment={() => setShowEnrichment(true)}
                    onImport={() => importRef.current?.click()}
                    onUploadPhoto={() => photoRef.current?.click()}
                    onRemovePhoto={() => updateField("avatar", "")}
                    onSummarizeExperience={summarizeExperience}
                    summaryGenerating={generatingSummary}
                    hasPhoto={Boolean(data.avatar)}
                  />
                )}
                {tab === "sections" && (
                  <SectionsEditor
                    sections={sections}
                    setSections={setSections}
                    toggleSection={toggleSection}
                    moveSection={moveSection}
                    customName={customName}
                    setCustomName={setCustomName}
                    addSection={addSection}
                  />
                )}
                {tab === "templates" && (
                  <TemplateManager
                    category={category}
                    setCategory={setCategory}
                    visibleTemplates={visibleTemplates}
                    template={template}
                    setTemplate={chooseTemplate}
                  />
                )}
                {tab === "style" && (
                  <StyleEditor
                    accent={accent}
                    setAccent={setAccent}
                    fontStyle={fontStyle}
                    setFontStyle={setFontStyle}
                    spacing={spacing}
                    setSpacing={setSpacing}
                    photoShape={photoShape}
                    setPhotoShape={setPhotoShape}
                    showPhoto={showPhoto}
                    setShowPhoto={setShowPhoto}
                    onUpload={() => photoRef.current?.click()}
                    hasPhoto={Boolean(data.avatar)}
                  />
                )}
            </motion.div>
          </div>

          <div className="privacy-note"><span className="privacy-icon"><Check size={12} /></span><span><strong>Private by design</strong><br />Your resume stays on this device.</span><CircleHelp size={14} className="privacy-help" /></div>
        </aside>

        <section className="canvas-area" aria-label="Live resume preview">
          <div className="canvas-toolbar">
            <div className="canvas-breadcrumb"><span>My resumes</span><span className="crumb-slash">/</span><strong>Untitled resume</strong></div>
            <div className="canvas-actions">
              <span className="autosave"><span /> Live preview</span>
              <span className="toolbar-divider" />
              <button className="icon-button canvas-icon" title="Import JSON" onClick={() => importRef.current?.click()}><Upload size={15} /></button>
              <button className="icon-button canvas-icon" title="Copy resume HTML" onClick={() => void copyHtml()}><Code2 size={16} /></button>
              <button className="icon-button canvas-icon" title="Print or save as PDF" onClick={() => window.print()}><Printer size={15} /></button>
            </div>
          </div>
          <div className="canvas-scroll">
            <div className="paper-stage">
              <div className="paper-meta"><span><span className="meta-live-dot" /> LIVE CANVAS</span><span>{template.name} · {template.number.toString().padStart(2, "0")}</span></div>
              <div className="paper-zoom" style={{ zoom: zoom / 100 }}>
                <LiveCanvas
                  data={data}
                  sections={enabledSections}
                  template={template}
                  accent={accent}
                  fontStyle={fontStyle}
                  spacing={spacing}
                  showPhoto={showPhoto}
                  photoShape={photoShape}
                />
              </div>
              <div className="canvas-hint"><Sparkles size={13} /> Edits update your resume instantly</div>
            </div>
          </div>
          <div className="canvas-footer"><span><kbd>⌘</kbd> <kbd>P</kbd> to export</span><span>A4 · 210 × 297 mm</span><span className="zoom-control"><button aria-label="Zoom out" disabled={zoom <= 70} onClick={() => setZoom((value) => Math.max(70, value - 10))}>−</button><span>{zoom}%</span><button aria-label="Zoom in" disabled={zoom >= 120} onClick={() => setZoom((value) => Math.min(120, value + 10))}>+</button></span></div>
        </section>

        <aside className="right-panel">
          <div className="right-heading"><span className="eyebrow">QUICK CUSTOMIZE</span><button className="icon-button quiet" onClick={() => setTab("style")} aria-label="Open style options"><Palette size={16} /></button></div>
          <div className="right-block">
            <div className="right-label"><span>Active template</span><button className="text-button" onClick={() => setTab("templates")}>Browse all <ArrowRight size={12} /></button></div>
            <button className="active-template" onClick={() => setTab("templates")}>
              <TemplateMiniature template={template} />
              <span className="active-template-info"><strong>{template.name}</strong><small>{template.category} · #{template.number.toString().padStart(2, "0")}</small></span>
              <ChevronDown size={14} />
            </button>
          </div>
          <div className="right-block">
            <div className="right-label"><span>Accent color</span><span className="hex-label">{accent.toUpperCase()}</span></div>
            <div className="swatch-row">
              {["#6b72d6", "#567b69", "#d06a51", "#bf9253", "#3f7890", "#202320"].map((color) => (
                <button key={color} className={accent === color ? "swatch selected" : "swatch"} style={{ "--swatch": color } as React.CSSProperties} aria-label={`Set accent ${color}`} onClick={() => setAccent(color)} />
              ))}
              <label className="custom-swatch" title="Choose custom accent"><Plus size={14} /><input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} aria-label="Choose custom accent color" /></label>
            </div>
          </div>
          <div className="right-block">
            <div className="right-label"><span>On this page</span><span className="section-count">{enabledSections.length} sections</span></div>
            <div className="outline-list">
              {enabledSections.map((section, index) => (
                <button
                  className="outline-item"
                  key={section.id}
                  onClick={() => document.getElementById(`resume-section-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                >
                  <span className="outline-index">{String(index + 1).padStart(2, "0")}</span><span>{section.title}</span><span className="outline-status" />
                </button>
              ))}
              <button className="outline-add" onClick={() => setTab("sections")}><Plus size={13} /> Add a section</button>
            </div>
          </div>
          <div className="right-tip"><div className="tip-icon"><WandSparkles size={15} /></div><div><strong>A little tip</strong><p>Keep your experience concise. Three to five bullet points per role is the sweet spot.</p>          <button onClick={() => setTab("content")}>Edit resume content <ArrowRight size={12} /></button></div></div>
          <div className="right-bottom"><span>BUILT FOR WHAT'S NEXT</span><span>✳</span></div>
        </aside>
      </div>

      <input ref={importRef} className="visually-hidden" type="file" accept=".json,application/json" onChange={importJson} />
      <input ref={photoRef} className="visually-hidden" type="file" accept="image/*" onChange={uploadPhoto} />
      <input ref={linkedInImportRef} className="visually-hidden" type="file" accept=".pdf,.json,application/pdf,application/json" onChange={handleLinkedInFile} />
      <AnimatePresence>
        {showEnrichment && (
          <EnrichmentModal
            linkedinInput={linkedinInput}
            setLinkedinInput={setLinkedinInput}
            githubInput={githubInput}
            setGithubInput={setGithubInput}
            loading={loading}
            error={error}
            profile={profile}
            profileApiAvailable={profileApiAvailable}
            githubConnected={githubConnected}
            linkedinConnected={linkedinConnected}
            onConnectGitHub={connectGitHub}
            onConnectLinkedIn={connectLinkedIn}
            onGithub={fetchGitHub}
            onPublicGitHub={importPublicGitHub}
            onLinkedin={applyLinkedIn}
            onFetchLinkedIn={fetchLinkedIn}
            onImportFile={() => linkedInImportRef.current?.click()}
            onApplyProfile={applyImportedProfile}
            onDisconnect={disconnectProviders}
            onClose={() => setShowEnrichment(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>{toast && <motion.div className="toast" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><Check size={14} />{toast}</motion.div>}</AnimatePresence>
    </main>
    </LayoutGroup>
    </MotionConfig>
  );
}

function ContentEditor({
  data,
  updateField,
  sections,
  setSections,
  personalDetailsCompleted,
  onLoadSample,
  onEnrichment,
  onImport,
  onUploadPhoto,
  onRemovePhoto,
  onSummarizeExperience,
  summaryGenerating,
  hasPhoto,
}: {
  data: ResumeData;
  updateField: <K extends keyof ResumeData>(key: K, value: ResumeData[K]) => void;
  sections: ResumeSection[];
  setSections: (sections: ResumeSection[]) => void;
  personalDetailsCompleted: number;
  onLoadSample: () => void;
  onEnrichment: () => void;
  onImport: () => void;
  onUploadPhoto: () => void;
  onRemovePhoto: () => void;
  onSummarizeExperience: (index: number) => void;
  summaryGenerating: boolean;
  hasPhoto: boolean;
}) {
  function updateExperience(index: number, patch: Partial<Experience>) {
    updateField("experiences", data.experiences.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry));
  }
  function updateProject(index: number, patch: Partial<Project>) {
    updateField("projects", data.projects.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry));
  }
  function updateEducation(index: number, patch: Partial<Education>) {
    updateField("education", data.education.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry));
  }
  function updateCredential(kind: "certifications" | "awards", index: number, patch: Partial<Credential>) {
    updateField(kind, data[kind].map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry));
  }
  return (
    <>
      <div className="editor-section-head"><div><span className="editor-icon"><UserRound size={15} /></span><strong>Personal details</strong></div><span className="completion-tag">{personalDetailsCompleted}/6</span></div>
      <p className="editor-intro">The essentials. Make it easy for the right people to reach you.</p>
      <button className="sample-data-button" onClick={onLoadSample}><Sparkles size={13} /> Load an example resume</button>
      <div className="photo-import-card">
        {hasPhoto ? <img src={data.avatar} alt="Uploaded profile portrait" /> : <span className="photo-import-placeholder"><UserRound size={18} /></span>}
        <span className="photo-import-copy"><strong>{hasPhoto ? "Profile photo added" : "Add a profile photo"}</strong><small>JPG, PNG, WebP · up to 5 MB</small></span>
        <button type="button" className="button button-outline" onClick={onUploadPhoto}>{hasPhoto ? "Replace" : "Upload"}</button>
        {hasPhoto && <button type="button" className="icon-button photo-remove" aria-label="Remove profile photo" onClick={onRemovePhoto}><X size={14} /></button>}
      </div>
      <div className="form-grid">
        <Field label="Full name" value={data.name} onChange={(value) => updateField("name", value)} />
        <Field label="Professional title" value={data.title} onChange={(value) => updateField("title", value)} />
        <Field label="Email address" type="email" value={data.email} onChange={(value) => updateField("email", value)} />
        <Field label="Phone number" type="tel" value={data.phone} onChange={(value) => updateField("phone", value)} />
        <Field label="Current residence" value={data.city} onChange={(value) => updateField("city", value)} />
        <Field label="Permanent residence" value={data.permanentAddress} onChange={(value) => updateField("permanentAddress", value)} placeholder="Optional" />
      </div>
      <div className="editor-subhead"><span>Online presence</span><span className="subhead-rule" /></div>
      <div className="form-grid">
        <Field label="GitHub" value={data.github} onChange={(value) => updateField("github", value)} prefix={<Github size={13} />} placeholder="github.com/you" />
        <Field label="LinkedIn" value={data.linkedin} onChange={(value) => updateField("linkedin", value)} prefix={<Linkedin size={13} />} placeholder="linkedin.com/in/you" />
        <Field label="Portfolio" value={data.portfolio} onChange={(value) => updateField("portfolio", value)} prefix={<Link2 size={13} />} placeholder="yourportfolio.com" />
        <Field label="X / Twitter" value={data.twitter} onChange={(value) => updateField("twitter", value)} placeholder="Optional" />
      </div>
      <div className="editor-subhead"><span>About you</span><span className="subhead-rule" /></div>
      <label className="field full-field"><span>Professional summary</span><textarea rows={4} value={data.summary} onChange={(event) => updateField("summary", event.target.value)} placeholder="A short introduction to what you do best..." /></label>
      <div className="editor-subhead"><span>Experience</span><span className="subhead-rule" /></div>
      {data.experiences.map((entry, index) => (
        <article className="editor-entry" key={entry.id}>
          <div className="editor-entry-heading"><strong>Role {index + 1}</strong><button className="remove-section" aria-label={`Remove experience ${index + 1}`} onClick={() => updateField("experiences", data.experiences.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={13} /></button></div>
          <div className="form-grid">
            <Field label="Job title" value={entry.title} onChange={(value) => updateExperience(index, { title: value })} />
            <Field label="Company" value={entry.company} onChange={(value) => updateExperience(index, { company: value })} />
            <Field label="Location" value={entry.location} onChange={(value) => updateExperience(index, { location: value })} />
            <Field label="Start date" value={entry.startDate} onChange={(value) => updateExperience(index, { startDate: value })} placeholder="2022" />
            <Field label="End date" value={entry.endDate} onChange={(value) => updateExperience(index, { endDate: value })} placeholder="Present" />
          </div>
          <label className="field entry-textarea"><span>Role summary</span><textarea value={entry.summary} onChange={(event) => updateExperience(index, { summary: event.target.value })} rows={3} /></label>
          <label className="field entry-textarea"><span>Achievements (one per line)</span><textarea value={entry.bullets} onChange={(event) => updateExperience(index, { bullets: event.target.value })} rows={3} /></label>
          <div className="ai-summary-action"><button type="button" className="button button-outline" disabled={summaryGenerating || !(entry.bullets.trim() || entry.summary.trim())} onClick={() => onSummarizeExperience(index)}>{summaryGenerating ? "Drafting…" : "Draft summary with AI"}</button><small>Sends this role's text to OpenAI. Review the draft; omit sensitive information.</small></div>
        </article>
      ))}
      <button className="add-entry-button" onClick={() => updateField("experiences", [...data.experiences, { id: crypto.randomUUID(), title: "", company: "", location: "", startDate: "", endDate: "", summary: "", bullets: "" }])}><Plus size={14} /> Add experience</button>

      <div className="editor-subhead"><span>Projects</span><span className="subhead-rule" /></div>
      {data.projects.map((entry, index) => (
        <article className="editor-entry" key={entry.id}>
          <div className="editor-entry-heading"><strong>Project {index + 1}</strong><button className="remove-section" aria-label={`Remove project ${index + 1}`} onClick={() => updateField("projects", data.projects.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={13} /></button></div>
          <div className="form-grid">
            <Field label="Project name" value={entry.name} onChange={(value) => updateProject(index, { name: value })} />
            <Field label="Technology" value={entry.language} onChange={(value) => updateProject(index, { language: value })} />
            <Field label="Project URL" value={entry.url} onChange={(value) => updateProject(index, { url: value })} placeholder="https://..." />
          </div>
          <label className="field entry-textarea"><span>Description</span><textarea value={entry.description} onChange={(event) => updateProject(index, { description: event.target.value })} rows={3} /></label>
        </article>
      ))}
      <button className="add-entry-button" onClick={() => updateField("projects", [...data.projects, { id: crypto.randomUUID(), name: "", description: "", url: "", language: "" }])}><Plus size={14} /> Add project</button>

      <div className="editor-subhead"><span>Education</span><span className="subhead-rule" /></div>
      {data.education.map((entry, index) => (
        <article className="editor-entry" key={entry.id}>
          <div className="editor-entry-heading"><strong>Education {index + 1}</strong><button className="remove-section" aria-label={`Remove education ${index + 1}`} onClick={() => updateField("education", data.education.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={13} /></button></div>
          <div className="form-grid">
            <Field label="Degree / qualification" value={entry.degree} onChange={(value) => updateEducation(index, { degree: value })} />
            <Field label="School" value={entry.school} onChange={(value) => updateEducation(index, { school: value })} />
            <Field label="Location" value={entry.location} onChange={(value) => updateEducation(index, { location: value })} />
            <Field label="Start date" value={entry.startDate} onChange={(value) => updateEducation(index, { startDate: value })} />
            <Field label="End date" value={entry.endDate} onChange={(value) => updateEducation(index, { endDate: value })} />
          </div>
          <label className="field entry-textarea"><span>Details</span><textarea value={entry.details} onChange={(event) => updateEducation(index, { details: event.target.value })} rows={2} /></label>
        </article>
      ))}
      <button className="add-entry-button" onClick={() => updateField("education", [...data.education, { id: crypto.randomUUID(), degree: "", school: "", location: "", startDate: "", endDate: "", details: "" }])}><Plus size={14} /> Add education</button>

      <div className="editor-subhead"><span>Skills</span><span className="subhead-rule" /></div>
      <SkillEditor skills={data.skills} onChange={(skills) => updateField("skills", skills)} />
      <CredentialEditor title="Certifications" entries={data.certifications} onChange={(index, patch) => updateCredential("certifications", index, patch)} onAdd={() => updateField("certifications", [...data.certifications, { id: crypto.randomUUID(), name: "", organization: "", date: "" }])} onRemove={(index) => updateField("certifications", data.certifications.filter((_, itemIndex) => itemIndex !== index))} />
      <CredentialEditor title="Awards" entries={data.awards} onChange={(index, patch) => updateCredential("awards", index, patch)} onAdd={() => updateField("awards", [...data.awards, { id: crypto.randomUUID(), name: "", organization: "", date: "" }])} onRemove={(index) => updateField("awards", data.awards.filter((_, itemIndex) => itemIndex !== index))} />
      {sections.filter((section) => section.kind === "custom").map((section) => (
        <label className="field custom-content-field" key={section.id}><span>{section.title}</span><textarea rows={3} value={section.content ?? ""} placeholder={`Add your ${section.title.toLowerCase()}...`} onChange={(event) => setSections(sections.map((item) => item.id === section.id ? { ...item, content: event.target.value } : item))} /></label>
      ))}
      <button className="enrichment-cta" onClick={onEnrichment}><span className="enrichment-icon"><Sparkles size={14} /></span><span><strong>Import from a profile</strong><small>Start with GitHub · LinkedIn URL support</small></span><ArrowRight size={15} /></button>
      <button className="import-link" onClick={onImport}><Upload size={13} /> Import an existing folio JSON</button>
    </>
  );
}

function SkillEditor({ skills, onChange }: { skills: string[]; onChange: (skills: string[]) => void }) {
  const [draft, setDraft] = useState("");

  function addSkills(values: string[]) {
    onChange(addUniqueSkills(skills, values));
    setDraft("");
  }

  function handleChange(value: string) {
    const parsed = splitSkillInput(value);
    if (parsed.skills.length) onChange(addUniqueSkills(skills, parsed.skills));
    setDraft(parsed.draft);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      const parsed = splitSkillInput(draft);
      addSkills([...parsed.skills, parsed.draft]);
    } else if (event.key === "Backspace" && !draft && skills.length) {
      onChange(skills.slice(0, -1));
    }
  }

  return (
    <div className="skill-editor">
      <label className="field">
        <span>Skills and tools <small>Press Enter or comma to add each one</small></span>
        <input
          aria-label="Add a skill or tool"
          value={draft}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => draft.trim() && addSkills(draft.split(",").map((skill) => skill.trim()))}
          placeholder="e.g. React, Figma, Python"
        />
      </label>
      <div className="skill-editor-list" aria-label="Added skills">
        {skills.map((skill, index) => (
          <span className="skill-editor-chip" key={`${skill}-${index}`}>
            <SkillMark skill={skill} />
            {skill}
            <button type="button" aria-label={`Remove ${skill}`} onMouseDown={(event) => event.preventDefault()} onClick={() => onChange(skills.filter((_, itemIndex) => itemIndex !== index))}><X size={12} /></button>
          </span>
        ))}
        {!skills.length && <span className="skill-editor-empty">Add skills to show them in your toolkit.</span>}
      </div>
      <div className="skill-suggestions" aria-label="Popular skills">
        {["React", "TypeScript", "Python", "Figma", "Git", "Docker"].filter((skill) => !skills.some((item) => item.toLowerCase() === skill.toLowerCase())).map((skill) => (
          <button type="button" key={skill} onMouseDown={(event) => event.preventDefault()} onClick={() => addSkills([skill])}><Plus size={11} /> {skill}</button>
        ))}
      </div>
    </div>
  );
}

const skillBrandLabels: Partial<Record<SkillBrand, string>> = {
  typescript: "TS",
  javascript: "JS",
  python: "Py",
  figma: "F",
  github: "GH",
  git: "Git",
  node: "JS",
  docker: "D",
  aws: "AWS",
  html: "5",
  css: "3",
  java: "J",
  go: "Go",
  rust: "Rs",
};

function SkillMark({ skill }: { skill: string }) {
  const brands = getSkillBrands(skill);
  if (!brands.length) return <Sparkles className="skill-mark skill-mark-generic" size={13} aria-hidden="true" />;
  return (
    <span className="skill-mark-group" aria-hidden="true">
      {brands.slice(0, 3).map((brand) => (
        <span className={`skill-mark skill-mark-${brand}`} key={brand} title={brand}>
          {brand === "react"
            ? <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2" /><ellipse cx="12" cy="12" rx="10" ry="4" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" /></svg>
            : brand === "figma"
              ? <svg viewBox="0 0 24 24"><circle cx="8" cy="5" r="4" /><circle cx="16" cy="5" r="4" /><circle cx="8" cy="12" r="4" /><circle cx="16" cy="12" r="4" /><circle cx="8" cy="19" r="4" /></svg>
              : brand === "github"
                ? <Github size={13} />
                : <span>{skillBrandLabels[brand] ?? brand.slice(0, 2).toUpperCase()}</span>}
        </span>
      ))}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  prefix,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: React.ReactNode;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className={prefix ? "input-wrap has-prefix" : "input-wrap"}>{prefix && <i>{prefix}</i>}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>
    </label>
  );
}

function CredentialEditor({
  title,
  entries,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  entries: Credential[];
  onChange: (index: number, patch: Partial<Credential>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <>
      <div className="editor-subhead"><span>{title}</span><span className="subhead-rule" /></div>
      {entries.map((entry, index) => (
        <article className="editor-entry" key={entry.id}>
          <div className="editor-entry-heading"><strong>{title.slice(0, -1)} {index + 1}</strong><button className="remove-section" aria-label={`Remove ${title.toLowerCase()} ${index + 1}`} onClick={() => onRemove(index)}><Trash2 size={13} /></button></div>
          <div className="form-grid">
            <Field label="Name" value={entry.name} onChange={(value) => onChange(index, { name: value })} />
            <Field label="Organization" value={entry.organization} onChange={(value) => onChange(index, { organization: value })} />
            <Field label="Date" value={entry.date} onChange={(value) => onChange(index, { date: value })} />
          </div>
        </article>
      ))}
      <button className="add-entry-button" onClick={onAdd}><Plus size={14} /> Add {title.toLowerCase().replace(/s$/, "")}</button>
    </>
  );
}

function SectionsEditor({
  sections,
  setSections,
  toggleSection,
  moveSection,
  customName,
  setCustomName,
  addSection,
}: {
  sections: ResumeSection[];
  setSections: (sections: ResumeSection[]) => void;
  toggleSection: (id: string) => void;
  moveSection: (id: string, offset: number) => void;
  customName: string;
  setCustomName: (name: string) => void;
  addSection: () => void;
}) {
  const icons = {
    experience: BriefcaseBusiness,
    projects: Code2,
    education: GraduationCap,
    skills: Sparkles,
    certifications: Award,
    awards: Award,
    custom: FileText,
  };
  return (
    <>
      <div className="editor-section-head"><div><span className="editor-icon"><Layers3 size={15} /></span><strong>Resume sections</strong></div><span className="completion-tag">{sections.filter((item) => item.visible).length} active</span></div>
      <p className="editor-intro">Drag to reorder sections. Toggle each one on or off for this template.</p>
      <Reorder.Group axis="y" values={sections} onReorder={setSections} className="section-reorder">
        {sections.map((section, index) => {
          const Icon = icons[section.kind];
          return (
            <Reorder.Item key={section.id} value={section} className={section.visible ? "section-row" : "section-row is-off"} whileDrag={{ scale: 1.02, boxShadow: "0 8px 24px #2222", zIndex: 2 }}>
              <GripVertical size={15} className="grip" />
              <span className="section-row-icon"><Icon size={15} /></span>
              <span className="section-row-copy"><strong>{section.title}</strong><small>{section.description}</small></span>
              <span className="section-order-controls">
                <button className="section-order-button" aria-label={`Move ${section.title} up`} disabled={index === 0} onPointerDown={(event) => event.stopPropagation()} onClick={() => moveSection(section.id, -1)}><ChevronUp size={13} /></button>
                <button className="section-order-button" aria-label={`Move ${section.title} down`} disabled={index === sections.length - 1} onPointerDown={(event) => event.stopPropagation()} onClick={() => moveSection(section.id, 1)}><ChevronDown size={13} /></button>
              </span>
              <button className={section.visible ? "switch on" : "switch"} aria-label={`${section.visible ? "Hide" : "Show"} ${section.title}`} aria-pressed={section.visible} onPointerDown={(event) => event.stopPropagation()} onClick={() => toggleSection(section.id)}><span /></button>
              {section.kind === "custom" && <button className="remove-section" title={`Remove ${section.title}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => setSections(sections.filter((item) => item.id !== section.id))}><Trash2 size={13} /></button>}
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
      <div className="add-section-box"><label htmlFor="custom-section">Create a custom section</label><div className="add-section-input"><input id="custom-section" value={customName} onChange={(event) => setCustomName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addSection()} placeholder="e.g. Publications" /><button onClick={addSection} disabled={!customName.trim()}><Plus size={15} /> Add</button></div></div>
      <p className="drag-note"><GripVertical size={13} /> Drag sections to change their order</p>
    </>
  );
}

function TemplateManager({
  category,
  setCategory,
  visibleTemplates,
  template,
  setTemplate,
}: {
  category: (typeof categories)[number];
  setCategory: (category: (typeof categories)[number]) => void;
  visibleTemplates: Template[];
  template: Template;
  setTemplate: (template: Template) => void;
}) {
  return (
    <>
      <div className="editor-section-head"><div><span className="editor-icon"><FileText size={15} /></span><strong>Template library</strong></div><span className="completion-tag">{templates.length} designs</span></div>
      <p className="editor-intro">50 field-aware designs. Choose a visual approach; your content stays yours.</p>
      <div className="category-pills">
        {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={category === item ? "category-pill selected" : "category-pill"}>{item}</button>)}
      </div>
      <div className="template-grid">
        {visibleTemplates.map((item) => (
          <button key={item.id} className={template.id === item.id ? "template-card selected" : "template-card"} onClick={() => setTemplate(item)}>
            <TemplateMiniature template={item} />
            <span className="template-card-copy"><strong>{item.name}</strong><small>{item.description}</small><small className="template-best-for">For {item.bestFor}</small></span>
            {template.id === item.id && <span className="template-check"><Check size={11} /></span>}
          </button>
        ))}
      </div>
    </>
  );
}

function TemplateMiniature({ template }: { template: Template }) {
  return <span className={`template-mini mini-${template.layout}`} style={{ "--mini-accent": template.accent } as React.CSSProperties}>
    {["sidebar", "clinical", "boardroom", "hr", "policy", "nonprofit", "nursing", "success", "public-health"].includes(template.layout) && <i className="mini-sidebar" />}
    {["modern", "banner", "global", "executive", "university"].includes(template.layout) && <i className="mini-banner" />}
    {["timeline", "emergency"].includes(template.layout) && <i className="mini-timeline-rail" />}
    {["compact", "dense", "matrix", "compliance", "commerce", "health-admin", "supply-chain"].includes(template.layout) && <i className="mini-vertical-rule" />}
    {["bento", "dashboard", "founder", "revenue"].includes(template.layout) && <i className="mini-bento-feature" />}
    {["terminal", "ide"].includes(template.layout) && <i className="mini-status-bar" />}
    <i className="mini-head" /><i className="mini-subhead" /><i className="mini-contact" />
    <i className="mini-rule" /><i className="mini-line line-a" /><i className="mini-line line-b" /><i className="mini-line line-c" />
    <i className="mini-rule mini-rule-secondary" /><i className="mini-line line-d" /><i className="mini-line line-e" /><i className="mini-line line-f" />
  </span>;
}

function StyleEditor({
  accent,
  setAccent,
  fontStyle,
  setFontStyle,
  spacing,
  setSpacing,
  photoShape,
  setPhotoShape,
  showPhoto,
  setShowPhoto,
  onUpload,
  hasPhoto,
}: {
  accent: string;
  setAccent: (color: string) => void;
  fontStyle: "sans" | "serif" | "mono";
  setFontStyle: (font: "sans" | "serif" | "mono") => void;
  spacing: "compact" | "normal" | "relaxed";
  setSpacing: (spacing: "compact" | "normal" | "relaxed") => void;
  photoShape: "circle" | "rounded" | "hexagon";
  setPhotoShape: (shape: "circle" | "rounded" | "hexagon") => void;
  showPhoto: boolean;
  setShowPhoto: (show: boolean) => void;
  onUpload: () => void;
  hasPhoto: boolean;
}) {
  return (
    <>
      <div className="editor-section-head"><div><span className="editor-icon"><Palette size={15} /></span><strong>Visual identity</strong></div><span className="completion-tag">Your style</span></div>
      <p className="editor-intro">Small details, a more personal point of view.</p>
      <div className="style-control">
        <div className="style-control-heading"><span>Accent color</span><span className="hex-label">{accent.toUpperCase()}</span></div>
        <div className="swatch-row style-swatches">
          {["#6b72d6", "#567b69", "#d06a51", "#bf9253", "#3f7890", "#202320"].map((color) => <button key={color} className={accent === color ? "swatch selected" : "swatch"} style={{ "--swatch": color } as React.CSSProperties} onClick={() => setAccent(color)} aria-label={`Set accent ${color}`} />)}
          <label className="custom-swatch"><Plus size={14} /><input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} aria-label="Choose custom accent color" /></label>
        </div>
      </div>
      <div className="style-control"><div className="style-control-heading"><span>Typography</span></div><div className="segmented font-options">
        {(["sans", "serif", "mono"] as const).map((font) => <button key={font} className={fontStyle === font ? "selected" : ""} onClick={() => setFontStyle(font)}><span className={`font-sample ${font}`}>Ag</span>{font === "sans" ? "Sans" : font === "serif" ? "Serif" : "Mono"}</button>)}
      </div></div>
      <div className="style-control"><div className="style-control-heading"><span>Page spacing</span></div><div className="segmented">
        {(["compact", "normal", "relaxed"] as const).map((option) => <button key={option} className={spacing === option ? "selected" : ""} onClick={() => setSpacing(option)}>{option.charAt(0).toUpperCase() + option.slice(1)}</button>)}
      </div></div>
      <div className="style-control"><div className="style-control-heading"><span>Profile photo</span><button className={showPhoto ? "switch on" : "switch"} aria-label="Toggle profile photo" aria-pressed={showPhoto} onClick={() => setShowPhoto(!showPhoto)}><span /></button></div>
        {showPhoto && <><button className="upload-photo" onClick={onUpload}>{hasPhoto ? <Check size={15} /> : <Upload size={15} />}<span>{hasPhoto ? "Photo added" : "Upload a profile photo"}</span><span className="upload-size">MAX 5 MB</span></button><div className="avatar-shapes">{(["circle", "rounded", "hexagon"] as const).map((shape) => <button key={shape} className={photoShape === shape ? "shape-option selected" : "shape-option"} onClick={() => setPhotoShape(shape)}><span className={`shape-preview ${shape}`} />{shape}</button>)}</div></>}
      </div>
      <div className="style-footer"><Sparkles size={14} /><span>Your style settings update the live preview as you go.</span></div>
    </>
  );
}

function safeExternalHref(value: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function FolioLogo({ instance }: { instance: "intro" | "header" }) {
  const gradientId = `folio-logo-gradient-${instance}`;
  return (
    <svg className="folio-logo" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00f2fe" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path className="folio-logo-path" stroke={`url(#${gradientId})`} d="M32 5 54 18v27L32 58 10 45V18L32 5Z" />
      <path className="folio-logo-path folio-logo-inner" stroke={`url(#${gradientId})`} d="m32 18 11 6.5v13L32 44l-11-6.5v-13L32 18Z" />
      <path className="folio-logo-path folio-logo-trace" stroke={`url(#${gradientId})`} d="M32 5v13m22 0L43 24.5M54 45 43 37.5M32 58V44M10 45l11-7.5M10 18l11 6.5" />
      <circle className="folio-logo-node" cx="32" cy="5" r="2" />
      <circle className="folio-logo-node" cx="54" cy="18" r="2" />
      <circle className="folio-logo-node" cx="54" cy="45" r="2" />
      <circle className="folio-logo-node" cx="32" cy="58" r="2" />
      <circle className="folio-logo-node" cx="10" cy="45" r="2" />
      <circle className="folio-logo-node" cx="10" cy="18" r="2" />
      <circle className="folio-logo-core" cx="32" cy="31" r="3" />
    </svg>
  );
}

function SocialIcon({ value }: { value: string }) {
  let host = "";
  try {
    host = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
  if (host === "github.com") return <Github aria-hidden="true" />;
  if (host === "linkedin.com") return <Linkedin aria-hidden="true" />;
  if (host === "x.com" || host === "twitter.com") return <X aria-hidden="true" />;
  if (host === "youtube.com" || host === "youtu.be") return <Youtube aria-hidden="true" />;
  if (host === "instagram.com") return <Instagram aria-hidden="true" />;
  return null;
}

function LiveCanvas({
  data,
  sections,
  template,
  accent,
  fontStyle,
  spacing,
  showPhoto,
  photoShape,
}: {
  data: ResumeData;
  sections: ResumeSection[];
  template: Template;
  accent: string;
  fontStyle: "sans" | "serif" | "mono";
  spacing: "compact" | "normal" | "relaxed";
  showPhoto: boolean;
  photoShape: "circle" | "rounded" | "hexagon";
}) {
  const split = ["sidebar", "split", "clinical", "boardroom", "policy", "hr", "nonprofit", "nursing", "health-admin", "biotech", "faculty", "teacher", "instructional", "university", "civic", "diplomacy", "community", "success", "public-health"].includes(template.layout);
  const bento = ["bento", "dashboard", "founder", "revenue"].includes(template.layout);
  const contacts = [
    { value: data.email, href: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ? `mailto:${data.email}` : undefined },
    { value: data.phone, href: data.phone ? `tel:${data.phone.replace(/[^\d+]/g, "")}` : undefined },
    { value: data.city },
    { value: data.portfolio, href: data.portfolio ? safeExternalHref(data.portfolio) : undefined },
    { value: data.github, href: data.github ? safeExternalHref(data.github) : undefined },
    { value: data.linkedin, href: data.linkedin ? safeExternalHref(data.linkedin) : undefined },
    { value: data.twitter, href: data.twitter ? safeExternalHref(data.twitter) : undefined },
  ].filter((contact) => contact.value);

  function renderContact(value: string, href: string | undefined, index: number) {
    if (!href) return <span key={`${value}-${index}`}>{value}</span>;
    const external = href.startsWith("http");
    const socialIcon = external ? <SocialIcon value={value} /> : null;
    return <a className={socialIcon ? "social-contact" : undefined} key={`${value}-${index}`} href={href} aria-label={`${external ? "Open" : "Contact"} ${value}`} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{socialIcon}{value}</a>;
  }

  function renderSection(section: ResumeSection) {
    return (
      <motion.section id={`resume-section-${section.id}`} className={`resume-section resume-${section.kind}`} key={section.id} layout transition={{ duration: 0.28 }}>
        <h3>{section.title}</h3>
        {section.kind === "experience" && (data.experiences.length > 0
          ? data.experiences.map((entry) => <div className="resume-entry" key={entry.id}><div className="entry-heading"><strong>{entry.title || "Role title"}</strong><span>{[entry.startDate, entry.endDate].filter(Boolean).join(" — ")}</span></div><div className="entry-subheading">{entry.company}{entry.location && <> <span>·</span> {entry.location}</>}</div>{entry.summary && <p>{entry.summary}</p>}{entry.bullets.split("\n").filter((bullet) => bullet.trim()).length > 0 && <ul>{entry.bullets.split("\n").filter((bullet) => bullet.trim()).map((bullet, index) => <li key={`${entry.id}-bullet-${index}`}>{bullet}</li>)}</ul>}</div>)
          : <p className="placeholder-note">Add your experience in the Content tab.</p>)}
        {section.kind === "projects" && (data.projects.length > 0
          ? <div className="project-preview-grid">{data.projects.map((project) => {
            const projectHref = project.url ? safeExternalHref(project.url) : undefined;
            return <div className="resume-project" key={project.id}>
              <div className="project-title"><strong>{project.name || "Project name"}</strong>{project.stars !== undefined && <span>✳ {project.stars}</span>}</div>
              {project.description && <p>{project.description}</p>}
              {(project.language || project.commits !== undefined) && <small>{[project.language, project.commits !== undefined ? `${project.commits} commits` : ""].filter(Boolean).join(" · ")}</small>}
              {projectHref && <a className="project-link" href={projectHref} target="_blank" rel="noopener noreferrer"><Link2 size={11} /> <span>View project</span></a>}
            </div>;
          })}</div>
          : <p className="placeholder-note">Add selected projects in the Content tab.</p>)}
        {section.kind === "education" && (data.education.length > 0
          ? data.education.map((entry) => <div className="resume-entry" key={entry.id}><div className="entry-heading"><strong>{entry.degree || "Qualification"}</strong><span>{[entry.startDate, entry.endDate].filter(Boolean).join(" — ")}</span></div><div className="entry-subheading">{entry.school}{entry.location && <> <span>·</span> {entry.location}</>}</div>{entry.details && <p>{entry.details}</p>}</div>)
          : <p className="placeholder-note">Add your education in the Content tab.</p>)}
        {section.kind === "skills" && (data.skills.length > 0 ? <div className="skill-list">{data.skills.map((skill, index) => <span className="skill-tag" key={`${skill}-${index}`}><SkillMark skill={skill} /><span className="skill-tag-label">{skill}</span></span>)}</div> : <p className="placeholder-note">Add skills in the Content tab.</p>)}
        {section.kind === "certifications" && (data.certifications.length > 0 ? data.certifications.map((entry) => <div className="resume-entry" key={entry.id}><div className="entry-heading"><strong>{entry.name || "Certification"}</strong><span>{entry.date}</span></div><div className="entry-subheading">{entry.organization}</div></div>) : <p className="placeholder-note">Add certifications in the Content tab.</p>)}
        {section.kind === "awards" && (data.awards.length > 0 ? data.awards.map((entry) => <div className="resume-entry" key={entry.id}><div className="entry-heading"><strong>{entry.name || "Award"}</strong><span>{entry.date}</span></div><div className="entry-subheading">{entry.organization}</div></div>) : <p className="placeholder-note">Add awards in the Content tab.</p>)}
        {section.kind === "custom" && (section.content ? <p className="custom-resume-content">{section.content}</p> : <p className="placeholder-note">Add your {section.title.toLowerCase()} details in the Content tab.</p>)}
      </motion.section>
    );
  }

  return (
    <motion.article
      id="resume-paper"
      className={`resume-paper layout-${template.layout} ${bento ? "layout-bento" : ""} template-${template.id} ${split ? "split-layout" : ""} font-${fontStyle} spacing-${spacing}`}
      style={{ "--resume-accent": accent } as React.CSSProperties}
      key={template.id}
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.27, ease: "easeOut" }}
    >
      {bento && <header className="bento-hero bento-card">
        {showPhoto && <Avatar data={data} photoShape={photoShape} />}
        <div className="bento-hero-copy">
          <span className="bento-kicker">PROFILE / {data.city || "OPEN TO OPPORTUNITY"}</span>
          <h2>{data.name || <span className="preview-placeholder">Your name</span>}</h2>
          <p className="resume-title">{data.title || <span className="preview-placeholder">Your professional title</span>}</p>
          {data.summary && <p className="bento-summary">{data.summary}</p>}
          <div className="bento-contact">{contacts.map((contact, index) => renderContact(contact.value, contact.href, index))}</div>
        </div>
      </header>}
      {bento && <div className="bento-metrics">
        {[
          { value: data.experiences.filter((entry) => entry.title || entry.company).length, label: "Roles" },
          { value: data.projects.filter((project) => project.name).length, label: "Projects" },
          { value: data.skills.filter(Boolean).length, label: "Skills" },
        ].map((metric) => <div className="bento-card bento-metric" key={metric.label}><strong>{metric.value}</strong><span>{metric.label}</span></div>)}
      </div>}
      {split && <div className="resume-sidebar">
        {showPhoto && <Avatar data={data} photoShape={photoShape} />}
        <h2>{data.name || <span className="preview-placeholder">Your name</span>}</h2><p className="resume-title">{data.title || <span className="preview-placeholder">Your professional title</span>}</p>
        <div className="sidebar-rule" />
        <div className="sidebar-contact">{contacts.map((contact, index) => renderContact(contact.value, contact.href, index))}</div>
        {data.summary && <p className="sidebar-summary">{data.summary}</p>}
        {data.skills.length > 0 && <div className="sidebar-skills"><h3>TOOLKIT</h3>{data.skills.map((skill, index) => <span className="toolkit-chip" key={`${skill}-${index}`}><SkillMark skill={skill} />{skill}</span>)}</div>}
        {data.projects.some((project) => project.stars !== undefined) ? <div className="sidebar-skills"><h3>GITHUB</h3>{data.projects.filter((project) => project.stars !== undefined).slice(0, 3).map((project) => <span key={project.id}>{project.name} · ★ {project.stars}</span>)}</div> : null}
      </div>}
      <div className="resume-main">
        {!split && !bento && <header className={`resume-header ${template.layout === "editorial" ? "editorial-header" : ""} ${template.layout === "executive" ? "executive-header" : ""} ${template.layout === "academic" ? "academic-header" : ""}`}>
          <div className="resume-header-copy"><h2>{data.name || <span className="preview-placeholder">Your name</span>}</h2><p className="resume-title">{data.title || <span className="preview-placeholder">Your professional title</span>}</p></div>
          {showPhoto && <Avatar data={data} photoShape={photoShape} />}
        </header>}
        {!split && !bento && <div className="resume-contact">{contacts.map((contact, index) => <span key={`${contact.value}-${index}`}>{index === 0 ? <Mail size={10} /> : index === 2 ? <MapPin size={10} /> : null}{renderContact(contact.value, contact.href, index)}</span>)}</div>}
        {!split && !bento && data.summary && <p className="resume-summary">{data.summary}</p>}
        <div className="resume-body">
          {sections.map(renderSection)}
        </div>
        {(data.permanentAddress || data.city || data.name) && <footer className="resume-footer"><span>{data.permanentAddress || data.city}</span><span>{data.name} <span className="footer-dot">·</span> 01</span></footer>}
      </div>
    </motion.article>
  );
}

function Avatar({ data, photoShape }: { data: ResumeData; photoShape: "circle" | "rounded" | "hexagon" }) {
  return <span className={`resume-avatar ${photoShape}`}>{data.avatar ? <img src={data.avatar} alt={`${data.name || "Profile"} portrait`} /> : <span>{data.name ? data.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase() : "?"}</span>}</span>;
}

function EnrichmentModal({
  linkedinInput,
  setLinkedinInput,
  githubInput,
  setGithubInput,
  loading,
  error,
  profile,
  profileApiAvailable,
  githubConnected,
  linkedinConnected,
  onConnectGitHub,
  onConnectLinkedIn,
  onGithub,
  onPublicGitHub,
  onLinkedin,
  onFetchLinkedIn,
  onImportFile,
  onApplyProfile,
  onDisconnect,
  onClose,
}: {
  linkedinInput: string;
  setLinkedinInput: (value: string) => void;
  githubInput: string;
  setGithubInput: (value: string) => void;
  loading: boolean;
  error: string | null;
  profile: EnrichedProfile | null;
  profileApiAvailable: boolean;
  githubConnected: boolean;
  linkedinConnected: boolean;
  onConnectGitHub: () => void;
  onConnectLinkedIn: () => void;
  onGithub: (includeForks: boolean) => Promise<EnrichedProfile | null>;
  onPublicGitHub: (value: string) => Promise<EnrichedProfile | null>;
  onLinkedin: () => void;
  onFetchLinkedIn: () => Promise<EnrichedProfile | null>;
  onImportFile: () => void;
  onApplyProfile: (projects: UnifiedCVData["projects"], experience: UnifiedCVData["experience"]) => void;
  onDisconnect: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<number[]>([]);
  const [includeForks, setIncludeForks] = useState(false);

  function importPublicProfile() {
    void onPublicGitHub(githubInput);
  }

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => previousFocus?.focus();
  }, []);

  useEffect(() => {
    setSelectedProjects(profile?.projects.slice(0, 3).map((project) => project.githubUrl || project.title) ?? []);
    setSelectedExperience(profile?.experience.slice(0, 3).map((_, index) => index) ?? []);
  }, [profile]);

  function applySelection() {
    if (!profile) return;
    onApplyProfile(
      profile.projects.filter((project) => selectedProjects.includes(project.githubUrl || project.title)),
      profile.experience.filter((_, index) => selectedExperience.includes(index)),
    );
    onClose();
  }

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
    )).filter((element) => element.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.div ref={dialogRef} className="enrichment-modal" role="dialog" aria-modal="true" aria-labelledby="enrichment-title" onKeyDown={handleDialogKeyDown} initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.99 }}>
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={17} /></button>
        <span className="modal-spark"><Sparkles size={18} /></span>
        <span className="eyebrow">A HEAD START, NOT A SHORTCUT</span>
        <h2 id="enrichment-title">Bring your work<br />into your resume.</h2>
        <p className="modal-description">Connect official accounts or import a LinkedIn profile PDF. Review every field before adding it to your resume.</p>
        <div className="modal-provider"><span className="provider-icon github-provider"><Github size={16} /></span><div className="provider-copy"><strong>GitHub</strong><small>Public profile & top repositories</small></div><span className="provider-status">LIVE IMPORT</span></div>
        <div className="provider-action-row">
          <button className="button button-primary" disabled={loading || !profileApiAvailable} onClick={githubConnected ? () => void onGithub(includeForks) : onConnectGitHub}>
            {loading ? <span className="spinner" /> : <Github size={15} />}{githubConnected ? " Fetch top projects" : " Connect GitHub with OAuth"}
          </button>
          {githubConnected && <span className="provider-connected"><Check size={12} /> Connected</span>}
        </div>
        {!profileApiAvailable && <p className="profile-source-note">OAuth sign-in is unavailable on this static deployment. Public GitHub import and local profile files still work.</p>}
        <div className="linkedin-row github-profile-row">
          <div className="input-wrap has-prefix"><i><Github size={14} /></i><input aria-label="GitHub username or profile URL" value={githubInput} onChange={(event) => setGithubInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && importPublicProfile()} placeholder="github.com/username" /></div>
          <button className="button button-outline" disabled={loading || !githubInput.trim()} onClick={importPublicProfile}>{loading ? "Fetching…" : "Import public profile"}</button>
        </div>
        <p className="profile-source-note">Public GitHub profiles work without sign-in. OAuth adds pinned projects and higher API limits.</p>
        <label className="fork-option"><input type="checkbox" checked={includeForks} onChange={(event) => setIncludeForks(event.target.checked)} /> Include forked repositories</label>
        {profile?.projects.length ? <div className="repo-import-preview"><strong>Review top GitHub projects</strong>{profile.projects.map((project) => {
          const key = project.githubUrl || project.title;
          return <label className="import-choice" key={key}><input type="checkbox" checked={selectedProjects.includes(key)} onChange={() => setSelectedProjects((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key])} /><span><Code2 size={12} /> {project.title}{project.pinned && <small className="pinned-label">Pinned repository</small>}<small>{project.stars} stars · {project.techStack.join(", ")}</small></span></label>;
        })}</div> : null}
        <div className="modal-divider"><span>LINKEDIN PROFILE</span></div>
        <div className="provider-action-row">
          <button className="button button-outline" disabled={loading || !profileApiAvailable} onClick={linkedinConnected ? () => void onFetchLinkedIn() : onConnectLinkedIn}>
            <Linkedin size={15} />{linkedinConnected ? " Fetch LinkedIn identity" : " Connect LinkedIn"}
          </button>
          {linkedinConnected && <span className="provider-connected"><Check size={12} /> Connected</span>}
        </div>
        <div className="linkedin-row"><div className="input-wrap has-prefix"><i><Linkedin size={14} /></i><input aria-label="LinkedIn profile link" value={linkedinInput} onChange={(event) => setLinkedinInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onLinkedin()} placeholder="linkedin.com/in/yourname" /></div><button className="button button-outline" disabled={!linkedinInput.trim()} onClick={onLinkedin}>Save profile link</button></div>
        <p className="profile-source-note">LinkedIn does not allow profile details to be imported from a public URL. Use the profile PDF below to import work history.</p>
        <button className="linkedin-pdf-button" onClick={onImportFile}><Upload size={14} /> Import LinkedIn profile PDF or folio JSON</button>
        {profile?.experience.length ? <div className="repo-import-preview"><strong>Review LinkedIn roles</strong>{profile.experience.slice(0, 3).map((role, index) => <label className="import-choice" key={`${role.company}-${role.role}-${index}`}><input type="checkbox" checked={selectedExperience.includes(index)} onChange={() => setSelectedExperience((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index])} /><span><BriefcaseBusiness size={12} /> {role.role}<small>{role.company} · {[role.startDate, role.endDate].filter(Boolean).join(" — ")}</small></span></label>)}</div> : null}
        {profile && <div className="profile-review"><strong>{profile.personal.name || "Imported profile"}</strong>{profile.personal.title && <span>{profile.personal.title}</span>}{profile.personal.email && <span>{profile.personal.email}</span>}{profile.personal.bio && <p>{profile.personal.bio}</p>}{profile.notice && <small>{profile.notice}</small>}</div>}
        {profile && (profile.projects.length > 0 || profile.experience.length > 0 || profile.personal.name) && <button className="button button-primary profile-apply" onClick={applySelection}>Add selected profile details</button>}
        <p className="linkedin-note"><CircleHelp size={13} /> LinkedIn OAuth returns name and email only. Use its profile PDF for work history; this app does not scrape LinkedIn.</p>
        {error && <p className="modal-error" role="alert">{error}</p>}
        {(githubConnected || linkedinConnected) && <button className="disconnect-button" onClick={onDisconnect}>Disconnect connected accounts</button>}
        <div className="modal-privacy"><Check size={13} /> Tokens use encrypted, HttpOnly cookies. Resume content stays in this browser.</div>
      </motion.div>
    </motion.div>
  );
}

export default App;
