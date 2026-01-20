# UI Improvement Ideas

*Parked for future consideration - revisit once more example data is in place.*

## Use Cases (Context)

AgentCanvas supports the Amplify enterprise agentic platform across several stages:

| Audience | Use Case |
|----------|----------|
| Sales (pitch) | Brainstorm agent suites for client pitches - agents may be conceptual |
| Sales (demo) | Click through to demo agents or AI-generated videos, conceptual metrics |
| Active engagement | Canvas shows full agent suite with development status |
| Production | Deployed agents with live API metrics (usage, time savings) |

**Target audiences:** C-level, heads of department, domain specialists, digital transformation managers

---

## UI Ideas Under Consideration

### Coloring by Use Case

**Canvas-level theming:**
- Color picker or preset palette per canvas
- Pitch canvases = one accent, active engagements = another
- Consistent application across headers, borders, highlights

**Enhanced status coloring:**
- Current: colored left strip on agent cards
- Could make more prominent or offer customizable palettes
- Different color schemes for "pitch mode" vs "delivery mode"

**Department coloring:**
- Assign color per department
- Visual clustering by department color
- Useful for "suite of agents by department" pitch view

**Use-case presets:**
- "Sales Pitch" preset: lighter, polished, hides technical details
- "Delivery Tracking" preset: status-prominent, progress-focused
- CSS/display toggles only, same underlying data

---

## Larger Ideas (Deferred)

These require more significant changes - parked for later consideration:

### Canvas Stage Field
Add canvas-level field: `pitch | proposal | active | live`
- Changes UI behavior based on stage
- Pitch shows "potential" language, live enables API metrics

### Extended Agent Readiness States
`conceptual → scoped → in_development → testing → deployed`
- Visual treatment varies by state (dashed borders for conceptual, progress indicators for in-dev)

### Presentation Mode
- Toggle or URL param (`?mode=present`)
- Hides edit buttons, action menus
- Cleaner slide-like layout
- Shareable read-only view

### Executive Summary Panel
- Collapsible top section with aggregate metrics
- Total agents by status (visual chart)
- ROI/time saved totals
- Department breakdown

### Metrics Source Indicator
- Distinguish "Estimated" (~) vs "Measured" (live badge)
- Builds trust with C-level audience

### Demo/Video Inline Preview
- Thumbnail preview on hover
- Modal video player
- Prominent CTA for pitch canvases

### Audience View Presets
Quick filters for stakeholders:
- C-Level: ROI focused, summary stats
- Department Head: filtered to their department
- Digital Transformation: development pipeline view
- Domain Specialist: detailed capabilities

### Live Metrics API Integration
- Webhook or polling for deployed agents
- Real-time usage and time savings data

### Export/Share
- Shareable read-only links (optional password)
- Export to PDF/slides for pitch decks

---

## Next Steps

1. Build out more example canvases with realistic data
2. Test current UI with different use case scenarios
3. Revisit this doc to prioritize improvements

---

*Last updated: January 2025*
