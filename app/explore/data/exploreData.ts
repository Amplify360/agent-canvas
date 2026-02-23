import type { ExplorePhase } from './types';

export const explorePhases: ExplorePhase[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 1: ASPIRATION
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'phase-1',
    number: '1',
    name: 'ASPIRATION',
    subtitle: 'AI-Enhanced Scoping',
    persona: '',
    description:
      'Accelerate deal intelligence, stakeholder alignment, and proposal generation to compress the pursuit cycle from weeks to days.',
    colorVar: '--phase-1',
    icon: 'Telescope',
    useCases: [
      // 1.1
      {
        id: '1.1',
        title: 'Strategic Deal Intelligence & Pursuit',
        challenge:
          'Sales teams spend weeks researching prospects, often missing critical insights about company strategy, performance, and key stakeholders.',
        solutionName: 'Proudfoot Deal Flow Orchestrator',
        solutionDescription:
          'An AI-powered research and analysis platform that compresses weeks of prospect research into minutes, surfacing strategic insights and stakeholder intelligence.',
        capabilities: [
          'Automated deep research reports on target companies within minutes',
          'Dynamic "Green Sheet" meeting preparation based on Miller Heiman Conceptual Selling',
          'AI-powered strategic analysis that identifies red flags and buying influences',
          'Historical deal pattern recognition from 80 years of engagement data',
        ],
        impact: 'Compress pursuit cycle from weeks to days with higher win rates.',
        icon: 'Target',
        agents: [
          {
            name: 'Market Intelligence Crawler',
            description:
              'Continuously scrapes public filings, news, earnings calls, and industry reports to build rich company profiles and identify strategic triggers.',
            tools: ['RAG', 'API', 'NLP'],
            icon: 'Search',
          },
          {
            name: 'Deal Pattern Analyzer',
            description:
              'Mines 80 years of Proudfoot engagement data to identify historical deal patterns, win/loss factors, and optimal pursuit strategies.',
            tools: ['ML', 'Analytics', 'RAG'],
            icon: 'Brain',
          },
          {
            name: 'Green Sheet Generator',
            description:
              'Synthesizes research outputs into Miller Heiman Green Sheet format, mapping buying influences, red flags, and strategic coaching points.',
            tools: ['LLM', 'Automation', 'NLP'],
            icon: 'FileText',
          },
        ],
      },
      // 1.2
      {
        id: '1.2',
        title: 'Client Aspiration Alignment Tool',
        challenge:
          'Aligning stakeholders on value drivers and KPIs is time-consuming and often incomplete.',
        solutionName: 'Proudfoot Aspiration Mapper',
        solutionDescription:
          'A guided alignment platform that helps stakeholders converge on value levers and KPIs, producing executive-ready aspiration maps in a fraction of the time.',
        capabilities: [
          'Guides selection of value levers (Increase Revenue, Decrease Costs, Improve Working Capital)',
          'Maps specific improvement focus areas to measurable KPIs',
          'Generates stakeholder alignment documentation automatically',
          'Creates visual "aspiration maps" for executive presentations',
        ],
        impact: 'Achieve executive alignment 50% faster with comprehensive documentation.',
        icon: 'Compass',
        agents: [
          {
            name: 'Value Lever Navigator',
            description:
              'Walks stakeholders through structured value lever selection, suggesting industry-relevant KPIs and improvement areas based on company context.',
            tools: ['LLM', 'Forms', 'Analytics'],
            icon: 'Compass',
          },
          {
            name: 'Aspiration Map Renderer',
            description:
              'Transforms alignment workshop outputs into polished visual aspiration maps and executive presentation decks automatically.',
            tools: ['Automation', 'LLM', 'Integration'],
            icon: 'LayoutDashboard',
          },
        ],
      },
      // 1.3
      {
        id: '1.3',
        title: 'Rapid Proposal Generation',
        challenge:
          'Creating compelling, data-driven proposals requires extensive manual effort.',
        solutionName: 'Proudfoot Proposal Accelerator',
        solutionDescription:
          'An intelligent proposal engine that assembles industry-specific, persona-tailored proposals with embedded case studies and proof points.',
        capabilities: [
          'Generate industry-specific value propositions',
          'Include relevant case studies and proof points automatically',
          'Customize messaging for different stakeholder personas',
          'Create professional proposal documents in multiple formats',
        ],
        impact: 'Reduce proposal creation time from days to hours.',
        icon: 'FileText',
        agents: [
          {
            name: 'Case Study Retriever',
            description:
              'Searches the Proudfoot knowledge base to surface the most relevant case studies, proof points, and testimonials for each prospect context.',
            tools: ['RAG', 'NLP', 'ML'],
            icon: 'Search',
          },
          {
            name: 'Proposal Composer',
            description:
              'Assembles polished, persona-tailored proposal documents by weaving together value propositions, case studies, and financial projections.',
            tools: ['LLM', 'Automation', 'Integration'],
            icon: 'FileText',
          },
          {
            name: 'Stakeholder Persona Adapter',
            description:
              'Re-frames proposal messaging for different stakeholder personas such as CFO, COO, and plant managers to maximize resonance.',
            tools: ['LLM', 'NLP'],
            icon: 'Users',
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 2: VALUE ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'phase-2',
    number: '2',
    name: 'VALUE ANALYSIS',
    subtitle: 'The AI Analyst',
    persona: 'The AI Analyst',
    description:
      'Transform raw operational data into actionable insights, accelerating analysis cycles from weeks to days with AI-powered pattern recognition and benchmarking.',
    colorVar: '--phase-2',
    icon: 'BarChart3',
    useCases: [
      // 2.1
      {
        id: '2.1',
        title: 'Intelligent Data Ingestion & Analysis',
        challenge:
          'Processing client operational data (ERP/MES exports, performance reports, process maps) is manual and time-consuming.',
        solutionName: 'Proudfoot Data Intelligence Engine',
        solutionDescription:
          'A multi-format data ingestion and analysis platform that automatically identifies patterns, anomalies, and improvement opportunities across client operational data.',
        capabilities: [
          'Ingests multiple data formats (Excel, CSV, PDF, images)',
          'Identifies patterns and anomalies automatically',
          'Benchmarks against industry standards and past projects',
          'Generates preliminary opportunity identification',
        ],
        impact: 'Transform 2-week analysis into 2-day insights generation.',
        icon: 'Database',
        agents: [
          {
            name: 'Multi-Format Data Ingestor',
            description:
              'Parses and normalizes operational data from Excel, CSV, PDF, and image formats into a unified analytical schema.',
            tools: ['API', 'Computer Vision', 'Automation'],
            icon: 'Database',
          },
          {
            name: 'Anomaly Detection Engine',
            description:
              'Applies statistical and ML models to identify outliers, trends, and hidden patterns across ingested operational datasets.',
            tools: ['ML', 'Analytics', 'NLP'],
            icon: 'Cpu',
          },
          {
            name: 'Industry Benchmark Comparator',
            description:
              'Compares client metrics against Proudfoot benchmarks and industry standards to surface the highest-value improvement opportunities.',
            tools: ['RAG', 'Analytics', 'ML'],
            icon: 'BarChart3',
          },
        ],
      },
      // 2.2
      {
        id: '2.2',
        title: 'Digital DILO (Day in the Life Of) Assistant',
        challenge:
          'DILO observations generate massive amounts of unstructured data that\'s hard to synthesize.',
        solutionName: 'Proudfoot Digital DILO Platform',
        solutionDescription:
          'A mobile-first observation platform that automatically categorizes activities, calculates productivity metrics, and surfaces coaching opportunities in real time.',
        capabilities: [
          'Categorizes activities as Value Added (VA), Business Value Added (BVA), or Non-Value Added (NVA) automatically',
          'Calculates productivity metrics on-the-fly',
          'Identifies behavioral patterns and coaching opportunities',
          'Generates heat maps of improvement opportunities',
          'Automatically identifies knowledge gaps where supervisors seek information',
          'Captures unwritten rules and tacit knowledge used by experienced operators',
          'Generates AI training data from observation insights',
        ],
        impact: 'Increase DILO productivity by 40% with richer insights.',
        icon: 'Clock',
        agents: [
          {
            name: 'Activity Classifier',
            description:
              'Automatically classifies observed activities into VA, BVA, and NVA categories using contextual understanding and historical classification patterns.',
            tools: ['ML', 'NLP', 'Computer Vision'],
            icon: 'Bot',
          },
          {
            name: 'Productivity Insight Synthesizer',
            description:
              'Aggregates classified activities into productivity metrics, heat maps, and behavioral pattern reports with coaching recommendations.',
            tools: ['Analytics', 'LLM', 'Automation'],
            icon: 'Zap',
          },
          {
            name: 'Tacit Knowledge Extractor',
            description:
              'Captures unwritten rules, workarounds, and expert knowledge from observation notes and transforms them into structured AI training datasets.',
            tools: ['NLP', 'LLM', 'RAG'],
            icon: 'Brain',
          },
        ],
      },
      // 2.3
      {
        id: '2.3',
        title: 'Benefits Case Builder',
        challenge:
          'Building credible benefits cases with 4:1 ROI requires complex calculations and assumptions.',
        solutionName: 'Proudfoot Benefits Modeler',
        solutionDescription:
          'A financial modeling engine that calculates impact across value drivers, applies historical achievement rates, and generates executive-ready benefits presentations.',
        capabilities: [
          'Calculates financial impact across multiple value drivers',
          'Provides confidence intervals based on historical achievement rates',
          'Creates sensitivity analyses for key assumptions',
          'Generates executive-ready benefits presentations',
        ],
        impact: 'Build defensible benefits cases in hours, not days.',
        icon: 'Calculator',
        agents: [
          {
            name: 'Financial Impact Modeler',
            description:
              'Calculates projected financial impact across revenue, cost, and working capital value drivers with Monte Carlo simulations for confidence intervals.',
            tools: ['Analytics', 'ML', 'Automation'],
            icon: 'Calculator',
          },
          {
            name: 'Sensitivity Scenario Builder',
            description:
              'Generates sensitivity analyses and what-if scenarios by varying key assumptions, producing risk-adjusted benefit projections.',
            tools: ['Analytics', 'LLM', 'Automation'],
            icon: 'SlidersHorizontal',
          },
        ],
      },
      // 2.4
      {
        id: '2.4',
        title: 'Ready, Willing & Able (RWA) Survey Platform',
        challenge:
          'Assessing organizational readiness for change requires extensive interviews and analysis.',
        solutionName: 'Proudfoot RWA Digital Assessment',
        solutionDescription:
          'A mobile-friendly digital assessment platform that collects readiness data, applies AI-powered interpretation, and generates segmented action plans.',
        capabilities: [
          'Collects responses via mobile-friendly interface',
          'Provides AI-powered interpretation of results',
          'Segments analysis by demographics automatically',
          'Generates managerial action plans based on gaps',
        ],
        impact: 'Complete organizational assessment in 1 week vs. 3 weeks traditionally.',
        icon: 'ClipboardCheck',
        agents: [
          {
            name: 'Survey Distribution Agent',
            description:
              'Manages survey deployment across mobile and web channels, tracking response rates and sending intelligent reminders to maximize participation.',
            tools: ['Forms', 'Automation', 'API'],
            icon: 'Send',
          },
          {
            name: 'Readiness Insight Analyzer',
            description:
              'Interprets RWA survey responses using NLP sentiment analysis and demographic segmentation to identify readiness gaps and resistance pockets.',
            tools: ['NLP', 'ML', 'Analytics'],
            icon: 'Brain',
          },
          {
            name: 'Action Plan Generator',
            description:
              'Translates identified readiness gaps into targeted managerial action plans with prioritized interventions and tracking milestones.',
            tools: ['LLM', 'Automation', 'Analytics'],
            icon: 'ClipboardList',
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 3: NEW WAYS OF WORKING
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'phase-3',
    number: '3',
    name: 'NEW WAYS OF WORKING',
    subtitle: 'The AI Solution Architect',
    persona: 'The AI Solution Architect',
    description:
      'Design and architect new operating models, management systems, and process improvements with AI-guided methodology and best-practice templates.',
    colorVar: '--phase-3',
    icon: 'Lightbulb',
    useCases: [
      // 3.1
      {
        id: '3.1',
        title: 'MOS Design Accelerator',
        challenge:
          'Designing a comprehensive Management Operating System is our most complex IP, with high variability in quality.',
        solutionName: 'THE CORE MVP - Proudfoot MOS Designer',
        solutionDescription:
          'The flagship AI solution that serves as the single source of truth for MOS methodology, generating customized blueprints, Terms of Reference, and AI-ready training data.',
        capabilities: [
          'Serves as single source of truth for MOS methodology',
          'Generates customized MOS blueprints from 10 core elements',
          'Creates all Terms of Reference (TORs) automatically',
          'Designs meeting cadences and KPI cascades',
          'Produces visual management board layouts',
          'Creates MOS AI Knowledge Pack with Q&A pairs for each MOS element',
          'Generates prompt engineering templates aligned to Proudfoot tone',
          'Produces AI-ready training datasets for client AI platforms',
        ],
        impact: 'Reduce MOS design time by 60% with consistent quality.',
        icon: 'LayoutDashboard',
        agents: [
          {
            name: 'MOS Blueprint Architect',
            description:
              'Generates customized Management Operating System blueprints from the 10 core MOS elements, tailored to client industry and maturity level.',
            tools: ['RAG', 'LLM', 'Automation'],
            icon: 'LayoutDashboard',
          },
          {
            name: 'TOR & Cadence Designer',
            description:
              'Automatically creates Terms of Reference documents, meeting cadence structures, and KPI cascade hierarchies for each MOS element.',
            tools: ['LLM', 'Automation', 'Integration'],
            icon: 'FileText',
          },
          {
            name: 'AI Knowledge Pack Builder',
            description:
              'Produces Q&A pairs, prompt engineering templates, and AI-ready training datasets from MOS designs for deployment on client AI platforms.',
            tools: ['NLP', 'LLM', 'RAG'],
            icon: 'Brain',
          },
        ],
      },
      // 3.2
      {
        id: '3.2',
        title: 'Perfect Day Designer',
        challenge:
          'Creating role-specific "Perfect Day" schedules requires deep operational knowledge.',
        solutionName: 'Proudfoot Perfect Day Builder',
        solutionDescription:
          'An AI-driven scheduling tool that generates time-blocked role-specific daily plans with standard work activities and adherence auditing.',
        capabilities: [
          'Generates time-blocked schedules for any role',
          'Includes specific activities and standard work',
          'Adapts to different shift patterns and industries',
          'Creates adherence audit checklists automatically',
        ],
        impact: 'Design operational rhythm 70% faster.',
        icon: 'CalendarClock',
        agents: [
          {
            name: 'Role Schedule Optimizer',
            description:
              'Generates time-blocked daily schedules tailored to specific roles, shift patterns, and industry requirements using operational best practices.',
            tools: ['LLM', 'Analytics', 'Automation'],
            icon: 'CalendarClock',
          },
          {
            name: 'Adherence Audit Builder',
            description:
              'Creates detailed audit checklists and compliance tracking mechanisms for each Perfect Day schedule to ensure sustained adoption.',
            tools: ['Automation', 'Forms', 'LLM'],
            icon: 'ClipboardCheck',
          },
        ],
      },
      // 3.3
      {
        id: '3.3',
        title: 'Q-Sort Consensus Builder',
        challenge:
          'Achieving stakeholder consensus on priorities is difficult to facilitate and measure.',
        solutionName: 'Proudfoot Digital Q-Sort',
        solutionDescription:
          'A digital facilitation platform that enables structured priority ranking, measures stakeholder alignment through correlation analysis, and drives consensus.',
        capabilities: [
          'Facilitates priority ranking exercises',
          'Calculates correlation matrices between stakeholders',
          'Identifies areas of alignment and divergence',
          'Generates action plans to build consensus',
        ],
        impact: 'Achieve measurable consensus in single session vs. multiple workshops.',
        icon: 'ListOrdered',
        agents: [
          {
            name: 'Priority Ranking Facilitator',
            description:
              'Guides stakeholders through structured Q-Sort ranking exercises via an interactive digital interface, capturing preference data in real time.',
            tools: ['Forms', 'Automation', 'API'],
            icon: 'ListOrdered',
          },
          {
            name: 'Consensus Correlation Analyzer',
            description:
              'Computes correlation matrices across stakeholder rankings to quantify alignment, surface divergence zones, and recommend consensus-building actions.',
            tools: ['Analytics', 'ML', 'LLM'],
            icon: 'Network',
          },
        ],
      },
      // 3.4
      {
        id: '3.4',
        title: 'Process Redesign Assistant',
        challenge:
          'Redesigning processes requires extensive process mapping and waste identification.',
        solutionName: 'Proudfoot Process Optimizer',
        solutionDescription:
          'An AI assistant that analyzes current-state process maps, identifies waste using the TIMUWOOD framework, and generates lean future-state designs.',
        capabilities: [
          'Analyzes current state process maps',
          'Identifies waste using TIMUWOOD framework (Transport, Inventory, Motion, Waiting, Overproduction, Over-processing, Defects)',
          'Suggests lean improvements based on best practices',
          'Generates future state designs with implementation steps',
        ],
        impact: 'Accelerate process redesign by 50%.',
        icon: 'GitBranch',
        agents: [
          {
            name: 'Process Map Analyzer',
            description:
              'Ingests current-state process maps in various formats and applies TIMUWOOD waste identification to flag each waste category with severity scoring.',
            tools: ['Computer Vision', 'ML', 'NLP'],
            icon: 'GitBranch',
          },
          {
            name: 'Lean Improvement Recommender',
            description:
              'Suggests targeted lean improvements based on identified waste categories and generates future-state process designs with prioritized implementation steps.',
            tools: ['RAG', 'LLM', 'Analytics'],
            icon: 'Zap',
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 4: IMPLEMENTATION
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'phase-4',
    number: '4',
    name: 'IMPLEMENTATION',
    subtitle: 'The AI Coach & Simulator',
    persona: 'The AI Coach & Simulator',
    description:
      'Scale coaching, coordination, and problem-solving across implementation workstreams with AI-driven behavioral coaching and predictive risk management.',
    colorVar: '--phase-4',
    icon: 'Rocket',
    useCases: [
      // 4.1
      {
        id: '4.1',
        title: '8AMBs Behavioral Coach',
        challenge:
          'Coaching supervisors on the 8 Active Management Behaviours requires extensive 1-on-1 time.',
        solutionName: 'Proudfoot 8AMBs Virtual Coach',
        solutionDescription:
          'A virtual coaching platform that delivers personalized behavioral development, role-play simulations, and gamified skill tracking for the 8 Active Management Behaviours.',
        capabilities: [
          'Provides personalized coaching plans for each behavior',
          'Offers role-play simulations for difficult conversations',
          'Tracks behavioral adoption through observation data',
          'Sends micro-learning modules based on gaps',
          'Gamifies skill development with achievements',
          'Exports behavioral coaching scenarios as training data for client AI systems',
          'Creates prompt libraries for reinforcing 8AMBs through client\'s AI tools',
        ],
        impact: 'Scale coaching impact 10x while maintaining quality.',
        icon: 'UserCheck',
        agents: [
          {
            name: 'Behavioral Coaching Engine',
            description:
              'Delivers personalized coaching plans and micro-learning modules for each of the 8 Active Management Behaviours based on individual gap analysis.',
            tools: ['LLM', 'ML', 'Automation'],
            icon: 'UserCheck',
          },
          {
            name: 'Conversation Simulator',
            description:
              'Runs interactive role-play simulations for difficult management conversations, providing real-time feedback on tone, structure, and behavioral alignment.',
            tools: ['LLM', 'NLP', 'Analytics'],
            icon: 'MessageSquare',
          },
          {
            name: 'Adoption Tracker & Gamifier',
            description:
              'Monitors behavioral adoption through observation data, awards achievements, and exports coaching scenarios as AI training data for client platforms.',
            tools: ['Analytics', 'Automation', 'Integration'],
            icon: 'Trophy',
          },
        ],
      },
      // 4.2
      {
        id: '4.2',
        title: 'Implementation Command Center',
        challenge:
          'Managing complex, multi-workstream implementations requires constant coordination.',
        solutionName: 'Proudfoot Implementation Hub',
        solutionDescription:
          'A centralized command center that provides real-time progress tracking, predictive risk alerts, and automated reporting across all implementation workstreams.',
        capabilities: [
          'Tracks progress across all workstreams in real-time',
          'Predicts delays and risks using pattern recognition',
          'Automates weekly progress reporting',
          'Generates corrective action recommendations',
          'Facilitates virtual "war room" collaboration',
        ],
        impact: 'Improve on-time delivery by 30%.',
        icon: 'MonitorDot',
        agents: [
          {
            name: 'Workstream Progress Tracker',
            description:
              'Aggregates progress data across all implementation workstreams in real time, producing unified dashboards and automated weekly status reports.',
            tools: ['Integration', 'Analytics', 'Automation'],
            icon: 'MonitorDot',
          },
          {
            name: 'Risk Prediction Engine',
            description:
              'Uses pattern recognition on historical implementation data to predict delays, resource conflicts, and emerging risks before they materialize.',
            tools: ['ML', 'Analytics', 'API'],
            icon: 'AlertTriangle',
          },
          {
            name: 'Corrective Action Advisor',
            description:
              'Generates prioritized corrective action recommendations when variances are detected and facilitates virtual war room collaboration.',
            tools: ['LLM', 'Automation', 'Integration'],
            icon: 'Zap',
          },
        ],
      },
      // 4.3
      {
        id: '4.3',
        title: 'Frontline Problem-Solving Toolkit',
        challenge:
          'Frontline teams struggle with structured problem-solving methodologies.',
        solutionName: 'Proudfoot Problem-Solving Guide',
        solutionDescription:
          'A guided problem-solving assistant that walks frontline teams through 5 Whys, Fishbone, and A3 methodologies with industry-specific root cause suggestions.',
        capabilities: [
          'Walks teams through 5 Whys, Fishbone, and A3 methods',
          'Provides industry-specific root cause suggestions',
          'Links to relevant SOPs and best practices',
          'Tracks problem resolution effectiveness',
        ],
        impact: 'Resolve operational issues 40% faster.',
        icon: 'Wrench',
        agents: [
          {
            name: 'Structured Problem-Solving Guide',
            description:
              'Walks frontline teams step-by-step through 5 Whys, Fishbone diagrams, and A3 problem-solving worksheets with contextual prompts.',
            tools: ['LLM', 'Forms', 'Automation'],
            icon: 'Wrench',
          },
          {
            name: 'Root Cause Suggestion Engine',
            description:
              'Provides industry-specific root cause hypotheses, links to relevant SOPs, and tracks resolution effectiveness over time.',
            tools: ['RAG', 'NLP', 'Analytics'],
            icon: 'Search',
          },
        ],
      },
      // 4.4
      {
        id: '4.4',
        title: 'Change Resistance Predictor',
        challenge:
          'Identifying and addressing change resistance is reactive and subjective.',
        solutionName: 'Proudfoot Resistance Radar',
        solutionDescription:
          'A predictive analytics platform that detects change resistance signals before they escalate and recommends targeted interventions.',
        capabilities: [
          'Analyzes communication patterns and engagement data',
          'Predicts resistance hotspots before they emerge',
          'Recommends targeted interventions',
          'Tracks "dragon" conversion strategies',
        ],
        impact: 'Reduce implementation delays due to resistance by 50%.',
        icon: 'Shield',
        agents: [
          {
            name: 'Resistance Signal Detector',
            description:
              'Analyzes communication patterns, engagement metrics, and sentiment data to identify emerging resistance hotspots before they escalate.',
            tools: ['NLP', 'ML', 'Analytics'],
            icon: 'Shield',
          },
          {
            name: 'Intervention Strategy Advisor',
            description:
              'Recommends targeted interventions for each resistance hotspot and tracks dragon conversion strategies with outcome measurement.',
            tools: ['LLM', 'Analytics', 'Automation'],
            icon: 'Target',
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 5: SUSTAIN
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'phase-5',
    number: '5',
    name: 'SUSTAIN',
    subtitle: 'Annual Partnership Cycle',
    persona: '',
    description:
      'Embed long-term sustainability through continuous monitoring, living documentation, and self-directed improvement capabilities that maintain results after engagement ends.',
    colorVar: '--phase-5',
    icon: 'RefreshCw',
    useCases: [
      // 5.1
      {
        id: '5.1',
        title: 'Maturity Cockpit & Performance Monitor',
        challenge:
          'Clients struggle to sustain improvements after consultants leave.',
        solutionName: 'Proudfoot Maturity Dashboard',
        solutionDescription:
          'A continuous performance monitoring platform that tracks KPIs, predicts degradation, and provides self-service coaching to sustain improvements long-term.',
        capabilities: [
          'Tracks KPIs and behavioral metrics continuously',
          'Predicts performance degradation using ML models',
          'Alerts on variance triggers automatically',
          'Provides self-service coaching content',
          'Generates quarterly business review presentations',
        ],
        impact: 'Sustain 85% of improvements vs. 60% traditionally.',
        icon: 'Gauge',
        agents: [
          {
            name: 'KPI Degradation Predictor',
            description:
              'Continuously monitors KPI trends and applies ML models to predict performance degradation before it becomes critical, triggering early-warning alerts.',
            tools: ['ML', 'Analytics', 'Automation'],
            icon: 'Gauge',
          },
          {
            name: 'Self-Service Coach',
            description:
              'Delivers contextual coaching content and remediation guidance when variance triggers fire, enabling client teams to self-correct without consultant intervention.',
            tools: ['LLM', 'RAG', 'Automation'],
            icon: 'Bot',
          },
          {
            name: 'QBR Presentation Generator',
            description:
              'Automatically compiles quarterly business review presentations from tracked KPIs, maturity scores, and improvement trajectory data.',
            tools: ['Analytics', 'LLM', 'Automation'],
            icon: 'Presentation',
          },
        ],
      },
      // 5.2
      {
        id: '5.2',
        title: 'Digital Standard Work Repository',
        challenge:
          'Standard Operating Procedures become outdated and unused quickly.',
        solutionName: 'Proudfoot Living SOP Platform',
        solutionDescription:
          'A version-controlled SOP repository that pushes updates to relevant roles, tracks adherence, and suggests improvements based on performance data.',
        capabilities: [
          'Maintains version-controlled SOPs',
          'Pushes updates to relevant roles automatically',
          'Tracks adherence through digital confirmations',
          'Suggests improvements based on performance data',
          'Integrates with training systems',
        ],
        impact: 'Maintain 90%+ SOP currency and compliance.',
        icon: 'BookOpen',
        agents: [
          {
            name: 'SOP Version Controller',
            description:
              'Maintains a living repository of versioned SOPs, automatically pushing updates to affected roles and tracking digital read-and-confirm acknowledgments.',
            tools: ['Automation', 'Integration', 'API'],
            icon: 'BookOpen',
          },
          {
            name: 'SOP Improvement Recommender',
            description:
              'Analyzes performance data and adherence patterns to suggest SOP refinements, integrating with training systems to close competency gaps.',
            tools: ['ML', 'Analytics', 'LLM'],
            icon: 'Lightbulb',
          },
        ],
      },
      // 5.3
      {
        id: '5.3',
        title: 'Continuous Improvement Engine',
        challenge:
          'Identifying next-level improvements requires expensive re-engagement.',
        solutionName: 'Proudfoot CI Scanner',
        solutionDescription:
          'An always-on analytics engine that continuously scans operational data for new improvement opportunities and generates prioritized business cases.',
        capabilities: [
          'Continuously analyzes operational data for new opportunities',
          'Benchmarks against evolving best practices',
          'Generates improvement suggestions quarterly',
          'Prioritizes based on effort vs. impact',
          'Creates business cases for next initiatives',
        ],
        impact: 'Enable self-directed continuous improvement journey.',
        icon: 'TrendingUp',
        agents: [
          {
            name: 'Opportunity Scanner',
            description:
              'Continuously analyzes operational data streams to detect new improvement opportunities, benchmarking against evolving industry best practices.',
            tools: ['ML', 'Analytics', 'RAG'],
            icon: 'Radar',
          },
          {
            name: 'Effort-Impact Prioritizer',
            description:
              'Scores identified opportunities on an effort vs. impact matrix and generates quarterly improvement roadmaps with supporting business cases.',
            tools: ['Analytics', 'LLM', 'Automation'],
            icon: 'TrendingUp',
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 6: CROSS-FUNCTIONAL
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'cross-functional',
    number: 'X',
    name: 'CROSS-FUNCTIONAL',
    subtitle: 'Enterprise AI Capabilities',
    persona: '',
    description:
      'Cross-cutting AI capabilities that span the entire engagement lifecycle, from knowledge management and global deployment to consultant training and executive decision support.',
    colorVar: '--phase-6',
    icon: 'Layers',
    useCases: [
      // X.1
      {
        id: 'X.1',
        title: 'Knowledge Synthesis Engine',
        challenge:
          'Proudfoot\'s 600,000+ documents contain valuable insights that are inaccessible.',
        solutionName: 'AI-Powered MOS Methodology Analyst',
        solutionDescription:
          'A knowledge mining platform that extracts best practices from 80 years of historical deliverables and converts them into accessible, actionable playbooks.',
        capabilities: [
          'Extracts best practices from historical deliverables',
          'Identifies novel approaches from past engagements',
          'Updates methodology guides with learnings',
          'Creates industry-specific playbooks automatically',
        ],
        impact: 'Convert 80 years of experience into accessible, actionable knowledge.',
        icon: 'Brain',
        agents: [
          {
            name: 'Document Mining Agent',
            description:
              'Processes and indexes 600,000+ historical documents using advanced NLP to extract best practices, novel approaches, and reusable frameworks.',
            tools: ['RAG', 'NLP', 'ML'],
            icon: 'Database',
          },
          {
            name: 'Playbook Generator',
            description:
              'Synthesizes extracted insights into industry-specific playbooks and methodology guides, keeping them current with learnings from new engagements.',
            tools: ['LLM', 'RAG', 'Automation'],
            icon: 'BookOpen',
          },
          {
            name: 'Knowledge Gap Detector',
            description:
              'Identifies areas where methodology documentation is thin or outdated and prioritizes knowledge capture from active engagements.',
            tools: ['Analytics', 'NLP', 'RAG'],
            icon: 'Search',
          },
        ],
      },
      // X.2
      {
        id: 'X.2',
        title: 'Multi-Language Global Deployment',
        challenge:
          'Global deployments require translation and cultural adaptation.',
        solutionName: 'Proudfoot Global Deployment Platform',
        solutionDescription:
          'A localization platform that translates all engagement materials with technical accuracy while adapting examples and case studies to local cultural contexts.',
        capabilities: [
          'Translates all materials maintaining technical accuracy',
          'Adapts examples to local cultural context',
          'Provides region-specific case studies',
          'Enables global collaboration across languages',
        ],
        impact: 'Deploy globally 60% faster with consistent quality.',
        icon: 'Globe',
        agents: [
          {
            name: 'Technical Translation Engine',
            description:
              'Translates engagement materials across 30+ languages while preserving domain-specific terminology, methodology branding, and technical accuracy.',
            tools: ['LLM', 'NLP', 'API'],
            icon: 'Globe',
          },
          {
            name: 'Cultural Adaptation Agent',
            description:
              'Adapts examples, case studies, and cultural references to resonate with local audiences while maintaining methodological integrity.',
            tools: ['LLM', 'RAG', 'NLP'],
            icon: 'Users',
          },
        ],
      },
      // X.3
      {
        id: 'X.3',
        title: 'Client Self-Service Portal',
        challenge:
          'Clients need ongoing support but can\'t afford continuous consulting.',
        solutionName: 'Proudfoot Client Portal',
        solutionDescription:
          'A self-service platform providing operational health diagnostics, guided improvement planning, peer benchmarking, and expert Q&A to drive recurring value.',
        capabilities: [
          'Self-diagnosis tools for operational health',
          'Guided improvement planning',
          'Access to relevant tools and templates',
          'Peer benchmarking (anonymized)',
          'Expert Q&A system',
        ],
        impact: 'Generate recurring revenue while improving client outcomes.',
        icon: 'LayoutGrid',
        agents: [
          {
            name: 'Operational Health Diagnostician',
            description:
              'Runs self-service diagnostic assessments on client operational data and generates health scorecards with improvement recommendations.',
            tools: ['Analytics', 'ML', 'Forms'],
            icon: 'HeartPulse',
          },
          {
            name: 'Peer Benchmark Engine',
            description:
              'Provides anonymized peer benchmarking across client organizations, surfacing relative performance and identifying best-in-class practices.',
            tools: ['Analytics', 'ML', 'API'],
            icon: 'BarChart3',
          },
          {
            name: 'Expert Q&A Responder',
            description:
              'Answers client operational questions using Proudfoot methodology knowledge base, escalating complex queries to human consultants when needed.',
            tools: ['RAG', 'LLM', 'NLP'],
            icon: 'MessageCircle',
          },
        ],
      },
      // X.4
      {
        id: 'X.4',
        title: 'Consultant Training Accelerator',
        challenge:
          'Onboarding new consultants takes 6+ months to productivity.',
        solutionName: 'Proudfoot Consultant Academy',
        solutionDescription:
          'A personalized training platform that accelerates consultant onboarding through adaptive learning paths, client scenario simulations, and competency certification.',
        capabilities: [
          'Provides personalized learning paths',
          'Simulates client situations for practice',
          'Offers real-time coaching during engagements',
          'Tracks competency development',
          'Certifies readiness for client deployment',
        ],
        impact: 'Reduce time-to-productivity by 50%.',
        icon: 'GraduationCap',
        agents: [
          {
            name: 'Adaptive Learning Path Builder',
            description:
              'Creates personalized onboarding curricula based on each consultant\'s background, adjusting difficulty and focus areas as competencies develop.',
            tools: ['ML', 'LLM', 'Analytics'],
            icon: 'GraduationCap',
          },
          {
            name: 'Client Scenario Simulator',
            description:
              'Runs realistic client engagement simulations where consultants practice analysis, facilitation, and coaching with AI-generated stakeholder personas.',
            tools: ['LLM', 'NLP', 'Automation'],
            icon: 'Bot',
          },
          {
            name: 'Competency Certification Tracker',
            description:
              'Monitors consultant skill development across all methodology domains, issuing certifications when deployment-readiness thresholds are met.',
            tools: ['Analytics', 'Automation', 'Integration'],
            icon: 'Award',
          },
        ],
      },
      // X.5
      {
        id: 'X.5',
        title: 'Executive Decision Support',
        challenge:
          'Executives need rapid answers to operational questions between reviews.',
        solutionName: 'Proudfoot Executive AI Assistant',
        solutionDescription:
          'An executive-facing AI assistant that provides instant operational answers, data-backed recommendations, what-if scenarios, and board-ready presentations.',
        capabilities: [
          'Answers operational questions instantly',
          'Provides data-backed recommendations',
          'Generates what-if scenarios',
          'Prepares board-ready presentations',
          'Tracks decision implementation',
        ],
        impact: 'Improve executive decision speed and quality by 40%.',
        icon: 'Briefcase',
        agents: [
          {
            name: 'Executive Query Responder',
            description:
              'Provides instant, data-backed answers to executive operational questions by querying across all engagement data and performance dashboards.',
            tools: ['RAG', 'LLM', 'Analytics'],
            icon: 'Briefcase',
          },
          {
            name: 'Scenario Modeler',
            description:
              'Generates what-if scenarios and sensitivity analyses on demand, producing board-ready visualizations of projected outcomes.',
            tools: ['Analytics', 'ML', 'LLM'],
            icon: 'Cpu',
          },
          {
            name: 'Decision Implementation Tracker',
            description:
              'Monitors the execution status of executive decisions, flagging stalled initiatives and surfacing follow-up actions for leadership review.',
            tools: ['Automation', 'Analytics', 'Integration'],
            icon: 'CheckCircle',
          },
        ],
      },
      // X.6
      {
        id: 'X.6',
        title: 'AI Enablement Service Delivery Accelerator',
        challenge:
          'Consultants need to capture unwritten operational knowledge and transform it into structured AI training data while delivering traditional TPS engagements.',
        solutionName: 'Proudfoot AI Enablement Toolkit',
        solutionDescription:
          'A toolkit that enables consultants to capture operational knowledge and produce structured AI training data as a billable service alongside traditional engagement delivery.',
        capabilities: [
          'Providing templates for identifying "knowledge bottlenecks" during DILOs',
          'Generating Q&A pairs from new MOS elements automatically',
          'Creating scenario-based guidance and Socratic prompts',
          'Structuring knowledge into AI-ready datasets for client platforms',
          'Producing AI Knowledge Management SOPs for client teams',
        ],
        impact:
          'Enable consultants to deliver high-value AI training data as a billable service while accelerating traditional benefits realization.',
        icon: 'Sparkles',
        agents: [
          {
            name: 'Knowledge Bottleneck Identifier',
            description:
              'Provides structured templates and prompts for identifying knowledge bottlenecks during DILO observations, flagging where tacit expertise creates dependencies.',
            tools: ['Forms', 'NLP', 'LLM'],
            icon: 'Search',
          },
          {
            name: 'AI Training Data Generator',
            description:
              'Transforms captured operational knowledge into structured Q&A pairs, scenario-based guidance, and Socratic prompts formatted for client AI platforms.',
            tools: ['LLM', 'NLP', 'Automation'],
            icon: 'Sparkles',
          },
          {
            name: 'AI SOP Packager',
            description:
              'Produces AI Knowledge Management SOPs and AI-ready datasets with proper formatting, validation, and metadata for seamless client platform ingestion.',
            tools: ['Automation', 'Integration', 'LLM'],
            icon: 'Package',
          },
        ],
      },
    ],
  },
];
