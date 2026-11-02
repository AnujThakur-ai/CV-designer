export type TemplateCategory =
  | "Technology"
  | "Creative"
  | "Academic"
  | "Executive"
  | "Legal & Policy"
  | "People & Impact"
  | "Marketing & Growth"
  | "Healthcare"
  | "Education"
  | "Public Service"
  | "Operations";

export type TemplateLayout =
  | "classic" | "modern" | "sidebar" | "editorial" | "executive" | "academic"
  | "compact" | "timeline" | "bento" | "terminal" | "ide" | "notebook"
  | "swiss" | "glass" | "fashion" | "brutalist" | "split" | "monograph"
  | "clinical" | "dense" | "banner" | "boardroom" | "matrix" | "global"
  | "legal" | "policy" | "hr" | "nonprofit" | "compliance" | "revenue"
  | "dashboard" | "brand" | "gtm" | "commerce" | "hospital" | "nursing"
  | "health-admin" | "biotech" | "faculty" | "teacher" | "graduate"
  | "instructional" | "university" | "civic" | "diplomacy" | "emergency"
  | "community" | "product" | "success" | "supply-chain" | "founder"
  | "public-health" | "finance";

export type Template = {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  voice: string;
  category: TemplateCategory;
  number: number;
  layout: TemplateLayout;
  accent: string;
  font: "sans" | "serif" | "mono";
};

type TemplateSeed = Omit<Template, "number">;

const seeds: TemplateSeed[] = [
  { id: "cyber-terminal-cli", name: "Cyber-Terminal CLI", description: "Dark terminal header, command-line details, and technical tags.", bestFor: "Systems, DevOps & kernel engineering", voice: "Technical spec brief", category: "Technology", layout: "terminal", accent: "#00d978", font: "mono" },
  { id: "bento-modernist", name: "Bento Modernist", description: "Modular profile, project, skill, and impact panels.", bestFor: "Tech leads & cloud architects", voice: "Quantified impact", category: "Technology", layout: "bento", accent: "#00a8b8", font: "sans" },
  { id: "silicon-valley-minimalist", name: "Silicon Valley Minimalist", description: "Quiet sidebar for skills and links beside concise experience.", bestFor: "Product & mobile engineers", voice: "Action · metric · result", category: "Technology", layout: "sidebar", accent: "#637b91", font: "sans" },
  { id: "dark-neomorphic-ide", name: "Dark Neomorphic IDE", description: "Dark IDE-inspired panels with recessed project details.", bestFor: "Backend & integration developers", voice: "Modular technical breakdown", category: "Technology", layout: "ide", accent: "#9b8cff", font: "mono" },
  { id: "data-science-notebook", name: "Data Science Notebook", description: "Notebook cells, analytical callouts, and indigo section markers.", bestFor: "Data science, ML & quantitative analysis", voice: "Analytical and evidence-led", category: "Technology", layout: "notebook", accent: "#5146e5", font: "mono" },
  { id: "editorial-swiss-grid", name: "Editorial Swiss Grid", description: "Asymmetric typography, bold rules, and deliberate whitespace.", bestFor: "Art direction & brand strategy", voice: "Concise creative direction", category: "Creative", layout: "swiss", accent: "#e13d2d", font: "sans" },
  { id: "glassmorphism-portfolio", name: "Glassmorphism Portfolio", description: "Soft translucent project surfaces and a calm gradient treatment.", bestFor: "UX, product & interaction design", voice: "Collaborative case studies", category: "Creative", layout: "glass", accent: "#8773db", font: "sans" },
  { id: "high-fashion-monochrome", name: "High-Fashion Monochrome", description: "Centered fashion-editorial typography with dramatic black-and-white contrast.", bestFor: "Fashion & luxury brands", voice: "Editorial and image-led", category: "Creative", layout: "fashion", accent: "#252525", font: "serif" },
  { id: "brutalist-canvas", name: "Brutalist Canvas", description: "Raw black rules, exposed structure, and unapologetic project blocks.", bestFor: "Motion, 3D & experimental art", voice: "Direct project breakdown", category: "Creative", layout: "brutalist", accent: "#d8b300", font: "mono" },
  { id: "split-canvas-interactive", name: "Split Canvas Interactive", description: "Identity panel balanced against a separate, spacious career narrative.", bestFor: "Multimedia & creative direction", voice: "Project challenge to outcome", category: "Creative", layout: "split", accent: "#e16b53", font: "sans" },
  { id: "cambridge-monograph", name: "Cambridge Monograph", description: "Traditional scholarly typesetting with precise, restrained dividers.", bestFor: "Professors & postdoctoral researchers", voice: "Scholarly and formal", category: "Academic", layout: "monograph", accent: "#343a40", font: "serif" },
  { id: "clinical-researcher-standard", name: "Clinical Researcher Standard", description: "Lab and methods sidebar paired with detailed research history.", bestFor: "Clinical trials & epidemiology", voice: "Methodical and precise", category: "Academic", layout: "clinical", accent: "#3d7180", font: "serif" },
  { id: "stem-research-grant-brief", name: "STEM Research Grant Brief", description: "Dense two-column structure for grants, patents, and research impact.", bestFor: "Principal investigators & biotech", voice: "Data-dense impact", category: "Academic", layout: "dense", accent: "#42677b", font: "sans" },
  { id: "humanities-scholar", name: "Humanities Scholar", description: "Essay-like long form with generous measure and classic serif type.", bestFor: "Humanities faculty & historians", voice: "Descriptive academic prose", category: "Academic", layout: "monograph", accent: "#865f48", font: "serif" },
  { id: "technical-dissertation-summary", name: "Technical Dissertation Summary", description: "Research banner and numbered, two-column academic sections.", bestFor: "Computer science & materials PhDs", voice: "Numbered academic summary", category: "Academic", layout: "banner", accent: "#466d86", font: "serif" },
  { id: "wall-street-executive", name: "Wall Street Executive", description: "Navy executive banner, double rules, and quantified leadership.", bestFor: "CFOs & investment banking", voice: "Financial performance framing", category: "Executive", layout: "executive", accent: "#0a3b62", font: "serif" },
  { id: "boardroom-director", name: "Boardroom Director", description: "Charcoal credentials rail against a warm, board-ready page.", bestFor: "CEOs, directors & managing partners", voice: "Governance and transformation", category: "Executive", layout: "boardroom", accent: "#b08a55", font: "serif" },
  { id: "corporate-operations-matrix", name: "Corporate Operations Matrix", description: "Table-like operating scope, responsibility, and impact groups.", bestFor: "COOs & supply-chain leadership", voice: "Operational metrics", category: "Operations", layout: "matrix", accent: "#385d70", font: "sans" },
  { id: "venture-capital-partner", name: "Venture Capital Partner", description: "Investment focus and portfolio highlights beside career history.", bestFor: "VC partners & corporate development", voice: "Deal and portfolio outcomes", category: "Executive", layout: "sidebar", accent: "#806149", font: "serif" },
  { id: "global-enterprise-strategist", name: "Global Enterprise Strategist", description: "Executive impact statement leads into a wide international career story.", bestFor: "Consultants & global strategy leaders", voice: "Cross-border scale", category: "Executive", layout: "global", accent: "#344f6d", font: "serif" },
  { id: "corporate-legal-counsel", name: "Corporate Legal Counsel", description: "Conservative legal hierarchy with formal serif headings and slate rules.", bestFor: "General counsel & legal directors", voice: "Formal and analytical", category: "Legal & Policy", layout: "legal", accent: "#40536a", font: "serif" },
  { id: "public-policy-brief", name: "Public Policy Brief", description: "Briefing-style overview with legislative impact and publication callouts.", bestFor: "Policy directors & think tanks", voice: "Policy outcomes and consensus", category: "Legal & Policy", layout: "policy", accent: "#406b76", font: "sans" },
  { id: "strategic-hr-director", name: "Strategic HR Director", description: "Warm sidebar and measured people metrics for a senior talent narrative.", bestFor: "People leaders & talent directors", voice: "Culture and talent metrics", category: "People & Impact", layout: "hr", accent: "#b28c52", font: "sans" },
  { id: "nonprofit-executive-director", name: "Non-Profit Executive Director", description: "Mission-led introduction paired with fundraising and program outcomes.", bestFor: "NGO & social-impact leadership", voice: "Mission with measurable impact", category: "People & Impact", layout: "nonprofit", accent: "#54826b", font: "serif" },
  { id: "regulatory-compliance-lead", name: "Regulatory Compliance Lead", description: "Audit-ready framework tags and tightly structured risk history.", bestFor: "Compliance, risk & quality leaders", voice: "Objective and evidence-based", category: "Legal & Policy", layout: "compliance", accent: "#5c7180", font: "sans" },
  { id: "revenue-growth-engine", name: "Revenue Growth Engine", description: "High-contrast achievement callouts beside deal and account experience.", bestFor: "Sales leaders & enterprise AEs", voice: "Quota and deal outcomes", category: "Marketing & Growth", layout: "revenue", accent: "#d65e3b", font: "sans" },
  { id: "performance-marketing-dashboard", name: "Performance Marketing Dashboard", description: "Dashboard-like metric cards for campaigns, channels, and growth.", bestFor: "Growth & performance marketers", voice: "Data-driven optimization", category: "Marketing & Growth", layout: "dashboard", accent: "#5967dc", font: "sans" },
  { id: "brand-strategist-storyteller", name: "Brand Strategist & Storyteller", description: "Editorial quote-like summary with room for campaign case studies.", bestFor: "Brand, PR & creative marketing", voice: "Narrative case study", category: "Marketing & Growth", layout: "brand", accent: "#aa624f", font: "serif" },
  { id: "product-marketing-specialist", name: "Product Marketing Specialist", description: "Launch and go-to-market stories organized into clear panels.", bestFor: "PMMs & product strategists", voice: "Feature to adoption outcomes", category: "Marketing & Growth", layout: "gtm", accent: "#507d95", font: "sans" },
  { id: "ecommerce-growth-lead", name: "E-Commerce Growth Lead", description: "Compact performance grid for commerce, conversion, and retention.", bestFor: "E-commerce & D2C leaders", voice: "GMV and conversion metrics", category: "Marketing & Growth", layout: "commerce", accent: "#558b78", font: "sans" },
  { id: "hospital-attending-physician", name: "Hospital Attending Physician", description: "Clinical appointments, credentials, and patient-care expertise in a formal hierarchy.", bestFor: "Attending physicians & specialists", voice: "Clinical expertise and outcomes", category: "Healthcare", layout: "hospital", accent: "#356878", font: "serif" },
  { id: "nursing-leadership", name: "Nursing Leadership", description: "Patient-care timeline with a dedicated credentials and competency rail.", bestFor: "Nurse managers & clinical educators", voice: "Care quality and team leadership", category: "Healthcare", layout: "nursing", accent: "#4b8c85", font: "sans" },
  { id: "allied-health-professional", name: "Allied Health Professional", description: "Accessible chronological layout for certifications, placements, and practice.", bestFor: "Therapists & allied health clinicians", voice: "Patient-centered practice", category: "Healthcare", layout: "timeline", accent: "#50817d", font: "sans" },
  { id: "healthcare-administrator", name: "Healthcare Administrator", description: "Operational matrix for service lines, compliance, and care delivery.", bestFor: "Hospital & health-system administrators", voice: "Service and operations impact", category: "Healthcare", layout: "health-admin", accent: "#4c687f", font: "sans" },
  { id: "biotech-innovation-lead", name: "Biotech Innovation Lead", description: "Research-to-product narrative with technical milestones and team scope.", bestFor: "Biotech & life-science leaders", voice: "Translational research impact", category: "Healthcare", layout: "biotech", accent: "#507d69", font: "sans" },
  { id: "faculty-scholar", name: "Faculty Scholar", description: "Expanded academic record for appointments, teaching, and publications.", bestFor: "Faculty & tenure-track applicants", voice: "Research and teaching record", category: "Education", layout: "faculty", accent: "#355f78", font: "serif" },
  { id: "classroom-educator", name: "Classroom Educator", description: "Warm teaching narrative with credentials and student-program highlights.", bestFor: "K–12 teachers & instructional leads", voice: "Teaching practice and outcomes", category: "Education", layout: "teacher", accent: "#947445", font: "sans" },
  { id: "graduate-fellowship", name: "Graduate Fellowship", description: "ATS-readable academic resume for early-career researchers and applicants.", bestFor: "Graduate students & fellows", voice: "Concise research keywords", category: "Education", layout: "graduate", accent: "#5b6d82", font: "serif" },
  { id: "instructional-designer", name: "Instructional Designer", description: "Project-led layout for learning systems, curriculum, and outcomes.", bestFor: "Learning experience designers", voice: "Learning impact case studies", category: "Education", layout: "instructional", accent: "#645e9b", font: "sans" },
  { id: "university-administrator", name: "University Administrator", description: "Formal leadership summary with institutional program and team highlights.", bestFor: "Academic department leadership", voice: "Institutional leadership", category: "Education", layout: "university", accent: "#5a6579", font: "serif" },
  { id: "municipal-public-service", name: "Municipal Public Service", description: "Civic-minded profile with public programs and community outcomes.", bestFor: "City & local government roles", voice: "Public outcomes and accountability", category: "Public Service", layout: "civic", accent: "#52746a", font: "sans" },
  { id: "diplomacy-international-affairs", name: "Diplomacy & International Affairs", description: "Understated formal layout for diplomatic, regional, and multilateral work.", bestFor: "Foreign service & international affairs", voice: "Diplomatic and cross-cultural", category: "Public Service", layout: "diplomacy", accent: "#465b78", font: "serif" },
  { id: "emergency-response-lead", name: "Emergency Response Lead", description: "Chronological command and readiness record with visible milestones.", bestFor: "Emergency management & response", voice: "Operational readiness", category: "Public Service", layout: "emergency", accent: "#b1543c", font: "sans" },
  { id: "community-impact-organizer", name: "Community Impact Organizer", description: "Mission-led layout for partnerships, campaigns, and local outcomes.", bestFor: "Community organizing & advocacy", voice: "People-centered impact", category: "Public Service", layout: "community", accent: "#63835c", font: "sans" },
  { id: "product-management-lead", name: "Product Management Lead", description: "Product narrative, roadmap outcomes, and cross-functional delivery in a clear grid.", bestFor: "Product managers & product leads", voice: "Strategy to shipped outcomes", category: "Operations", layout: "product", accent: "#496f9a", font: "sans" },
  { id: "customer-success-leader", name: "Customer Success Leader", description: "Customer portfolio and retention outcomes paired with a relationship-focused timeline.", bestFor: "Customer success & account leaders", voice: "Customer value and retention", category: "Operations", layout: "success", accent: "#548373", font: "sans" },
  { id: "supply-chain-operations", name: "Supply Chain Operations", description: "Structured operating footprint for suppliers, scale, and process improvements.", bestFor: "Supply chain & logistics leaders", voice: "Efficiency and network scale", category: "Operations", layout: "supply-chain", accent: "#6d7151", font: "sans" },
  { id: "founder-builder-profile", name: "Founder & Builder Profile", description: "Distinctive founder profile balancing company story, products, and team-building.", bestFor: "Founders & early-stage operators", voice: "Builder narrative and traction", category: "Executive", layout: "founder", accent: "#8f6548", font: "sans" },
  { id: "public-health-program-lead", name: "Public Health Program Lead", description: "Program outcomes, population-level initiatives, and partner coordination.", bestFor: "Public health & community medicine", voice: "Population impact and evidence", category: "Healthcare", layout: "public-health", accent: "#35766e", font: "sans" },
  { id: "finance-analyst", name: "Finance Analyst", description: "Structured financial planning and analysis profile with disciplined hierarchy.", bestFor: "FP&A, audit & financial analysis", voice: "Financial insight and controls", category: "Executive", layout: "finance", accent: "#334e6b", font: "serif" },
];

export const templates: Template[] = seeds.map((seed, index) => ({
  ...seed,
  number: index + 1,
}));

export const categories: Array<TemplateCategory | "All"> = [
  "All",
  "Technology",
  "Creative",
  "Academic",
  "Executive",
  "Legal & Policy",
  "People & Impact",
  "Marketing & Growth",
  "Healthcare",
  "Education",
  "Public Service",
  "Operations",
];

const legacyTemplateMap: Record<string, string> = {
  "minimal-1": "silicon-valley-minimalist",
  "minimal-2": "silicon-valley-minimalist",
  "minimal-3": "silicon-valley-minimalist",
  "minimal-4": "silicon-valley-minimalist",
  "minimal-5": "silicon-valley-minimalist",
  "minimal-6": "silicon-valley-minimalist",
  "minimal-7": "silicon-valley-minimalist",
  "minimal-8": "silicon-valley-minimalist",
  "minimal-9": "silicon-valley-minimalist",
  "minimal-10": "silicon-valley-minimalist",
  "developer-1": "cyber-terminal-cli",
  "developer-2": "dark-neomorphic-ide",
  "developer-3": "silicon-valley-minimalist",
  "developer-4": "dark-neomorphic-ide",
  "developer-5": "data-science-notebook",
  "developer-6": "silicon-valley-minimalist",
  "developer-7": "dark-neomorphic-ide",
  "developer-8": "cyber-terminal-cli",
  "developer-9": "data-science-notebook",
  "developer-10": "cyber-terminal-cli",
  "creative-1": "glassmorphism-portfolio",
  "creative-2": "editorial-swiss-grid",
  "creative-3": "high-fashion-monochrome",
  "creative-4": "brutalist-canvas",
  "creative-5": "split-canvas-interactive",
  "creative-6": "brand-strategist-storyteller",
  "creative-7": "editorial-swiss-grid",
  "creative-8": "glassmorphism-portfolio",
  "creative-9": "high-fashion-monochrome",
  "creative-10": "brutalist-canvas",
  "executive-1": "wall-street-executive",
  "executive-2": "boardroom-director",
  "executive-3": "global-enterprise-strategist",
  "executive-4": "venture-capital-partner",
  "executive-5": "founder-builder-profile",
  "executive-6": "corporate-operations-matrix",
  "executive-7": "wall-street-executive",
  "executive-8": "boardroom-director",
  "executive-9": "global-enterprise-strategist",
  "executive-10": "founder-builder-profile",
  "academic-1": "cambridge-monograph",
  "academic-2": "clinical-researcher-standard",
  "academic-3": "stem-research-grant-brief",
  "academic-4": "humanities-scholar",
  "academic-5": "technical-dissertation-summary",
  "academic-6": "faculty-scholar",
  "academic-7": "graduate-fellowship",
  "academic-8": "stem-research-grant-brief",
  "academic-9": "cambridge-monograph",
  "academic-10": "humanities-scholar",
  "modern-bento-grid": "bento-modernist",
  "modern-cyber-obsidian": "cyber-terminal-cli",
  "modern-aurora-kinetic": "glassmorphism-portfolio",
  "classic-standard": "silicon-valley-minimalist",
  "modern-profile": "silicon-valley-minimalist",
  "formal-executive": "wall-street-executive",
  "academic-cv": "cambridge-monograph",
  "editorial-portfolio": "editorial-swiss-grid",
  "developer-sidebar": "silicon-valley-minimalist",
  "compact-one-page": "graduate-fellowship",
  "career-timeline": "allied-health-professional",
  "bento-grid": "bento-modernist",
};

export function findTemplate(id: string | undefined): Template | undefined {
  if (!id) return undefined;
  const resolvedId = legacyTemplateMap[id] ?? id;
  return templates.find((template) => template.id === resolvedId);
}
