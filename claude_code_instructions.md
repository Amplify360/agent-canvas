
# TPS Agent Ecosystem Enhancement Instructions

## Context
You are enhancing an existing HTML file (`tps_agent_ecosystem.html`) that displays 19 AI agents organized into 7 groups supporting The Proudfoot System (TPS). The file uses:
- Color scheme: Teal/turquoise gradients (#0a3d4d to #4abfd3) matching Proudfoot branding
- 19 agent cards organized in groups: Sales (2), Aspiration (2), Value Analysis (3), New Ways of Working (3), Installation (3), Sustain (3), Support (3)
- Each agent card has: number, title, objective, description, tool chips, and hover tooltip for user journey
- Current tools displayed: Forms, Python, RAG, Web Search, Deep Research, Context

## Enhancements to Implement

---

## 1. Interactive Agent Flow Diagram

### Requirements:
- Add a collapsible section ABOVE the agent groups (below the TPS phase indicators)
- Create a visual flow diagram showing agent connections and handoffs
- Flow sequence: Sales → Aspiration → Value Analysis → New Ways of Working → Installation → Sustain (with Support agents available throughout)

### Implementation Details:

**HTML Structure:**
```html
<div class="flow-diagram-container">
  <div class="flow-header">
    <h2>🔄 Agent Workflow & Dependencies</h2>
    <button class="toggle-flow-btn" onclick="toggleFlowDiagram()">
      <span class="toggle-icon">▼</span> Show Flow Diagram
    </button>
  </div>
  <div class="flow-diagram" id="flowDiagram" style="display: none;">
    <!-- SVG or div-based flow diagram here -->
  </div>
</div>
```

**Visual Design:**
- Use horizontal flow with arrows between agent groups
- Each group represented as a rounded rectangle with group icon and name
- Arrows showing progression: Sales → Aspiration → Value Analysis → New Ways → Installation → Sustain
- Support agents shown as a horizontal bar below with dotted lines connecting to all phases
- Color-code each group box to match their existing group colors

**Interactivity:**
- Click any agent card in the main section to highlight its position in the flow diagram
- Highlight upstream dependencies (what comes before) in one color
- Highlight downstream dependencies (what comes after) in another color
- Add a "Reset" button to clear highlights

**CSS Styling:**
- Flow diagram background: rgba(255,255,255,0.05)
- Arrows: Use CSS triangles or SVG paths
- Highlighted state: Add glow effect and thicker borders
- Smooth transitions (0.3s ease)

**JavaScript Functions:**
```javascript
function toggleFlowDiagram() {
  const diagram = document.getElementById('flowDiagram');
  const btn = document.querySelector('.toggle-flow-btn');
  const icon = document.querySelector('.toggle-icon');

  if (diagram.style.display === 'none') {
    diagram.style.display = 'block';
    icon.textContent = '▲';
    btn.innerHTML = '<span class="toggle-icon">▲</span> Hide Flow Diagram';
  } else {
    diagram.style.display = 'none';
    icon.textContent = '▼';
    btn.innerHTML = '<span class="toggle-icon">▼</span> Show Flow Diagram';
  }
}

function highlightAgentFlow(agentNumber) {
  // Logic to highlight agent's position and dependencies in flow
  // Map agent numbers to their group and show connections
}
```

**Agent Group Connections:**
- Agents 1-2 (Sales) → Agents 3-4 (Aspiration)
- Agents 3-4 (Aspiration) → Agents 5-7 (Value Analysis)
- Agents 5-7 (Value Analysis) → Agents 8-10 (New Ways of Working)
- Agents 8-10 (New Ways of Working) → Agents 11-13 (Installation)
- Agents 11-13 (Installation) → Agents 14-16 (Sustain)
- Agents 17-19 (Support) connect to ALL phases

---

## 2. Agent Interaction Simulator

### Requirements:
- Add interactive chat simulator for 2 example agents: Agent #1 (TPS Opportunity Qualifier) and Agent #8 (Perfect Day Architect)
- Add a clear icon/button on these agent cards to launch the simulator
- Display in a modal overlay with chat-like interface

### Implementation Details:

**Icon on Agent Cards:**
Add to agents #1 and #8:
```html
<button class="demo-btn" onclick="openSimulator(1)">
  💬 Try Demo
</button>
```

**Modal Structure:**
```html
<div id="simulatorModal" class="modal">
  <div class="modal-content simulator-container">
    <div class="simulator-header">
      <h3 id="simulatorAgentName">Agent Name</h3>
      <button class="close-btn" onclick="closeSimulator()">&times;</button>
    </div>
    <div class="chat-container" id="chatContainer">
      <!-- Chat messages appear here -->
    </div>
    <div class="simulator-controls">
      <button onclick="nextMessage()">Continue →</button>
      <button onclick="resetSimulator()">Start Over</button>
    </div>
  </div>
</div>
```

**Chat Message Format:**
```html
<div class="chat-message user-message">
  <div class="message-avatar">👤</div>
  <div class="message-content">User's question or input</div>
</div>

<div class="chat-message agent-message">
  <div class="message-avatar">🤖</div>
  <div class="message-content">Agent's response</div>
</div>
```

**Sample Conversations:**

**Agent #1 - TPS Opportunity Qualifier:**
```javascript
const agent1Conversation = [
  { type: 'agent', text: 'Hello! I'm the TPS Opportunity Qualifier. I'll help assess if TPS is a good fit for your organization. Let's start with some questions.' },
  { type: 'agent', text: 'What are the main operational challenges you're currently facing?' },
  { type: 'user', text: 'We're struggling with production downtime and inconsistent output quality.' },
  { type: 'agent', text: 'Thank you. Those are common pain points we address. Can you quantify the impact? For example, what percentage of production time is lost to downtime?' },
  { type: 'user', text: 'We estimate about 15-20% downtime, and quality issues affect roughly 8% of our output.' },
  { type: 'agent', text: 'Based on industry benchmarks, I'm calculating potential improvements...' },
  { type: 'agent', text: '📊 Preliminary Assessment:
• Potential throughput increase: 12-18%
• Quality improvement opportunity: 5-7%
• Estimated ROI: 3.5-4.5x project cost
• TPS Fit Score: 8.5/10 - Strong Candidate' },
  { type: 'agent', text: 'Would you like me to generate a detailed opportunity sizing report?' }
];
```

**Agent #8 - Perfect Day Architect:**
```javascript
const agent8Conversation = [
  { type: 'agent', text: 'Hi! I'm the Perfect Day Architect. I design customized Perfect Day routines that integrate MOS cycles and Active Management Behaviors.' },
  { type: 'agent', text: 'Tell me about your operation. What shift patterns do you run?' },
  { type: 'user', text: 'We run three 8-hour shifts, 24/7 operation in automotive parts manufacturing.' },
  { type: 'agent', text: 'Perfect. And what are your key operational activities during a shift?' },
  { type: 'user', text: 'Production runs, quality checks, shift handovers, maintenance windows, and daily production meetings.' },
  { type: 'agent', text: 'Excellent. I'm designing a Perfect Day model that embeds LEAN principles...' },
  { type: 'agent', text: '⚙️ Perfect Day Design:

**Shift Start (0:00-0:30)**
• Safety briefing & Gemba walk
• Review production schedule
• Check equipment status

**Production Block 1 (0:30-2:00)**
• Execute standard work
• Hourly quality checks
• Real-time problem solving

**Mid-Shift Review (2:00-2:15)**
• Performance vs. target
• Adjust resources if needed

**Production Block 2 (2:15-4:00)**
• Continue execution
• Document variances

**And so on...**' },
  { type: 'agent', text: 'This integrates all 8 Active Management Behaviors. Would you like me to generate the full Perfect Day implementation guide?' }
];
```

**CSS Styling:**
- Modal: Full-screen overlay with semi-transparent background
- Chat container: White background, scrollable, max-height 500px
- User messages: Aligned right, light blue background (#e3f2fd)
- Agent messages: Aligned left, light gray background (#f5f5f5)
- Message avatars: Circular, 40px diameter
- Smooth message appearance: Fade-in animation (0.3s)
- Demo button on cards: Small, teal background, white text, positioned top-right below agent number

**JavaScript Functions:**
```javascript
let currentConversation = [];
let currentMessageIndex = 0;

function openSimulator(agentNumber) {
  // Load appropriate conversation
  // Show modal
  // Display first message
}

function nextMessage() {
  // Display next message in sequence
  // Auto-scroll to bottom
}

function closeSimulator() {
  // Hide modal
  // Reset conversation
}

function resetSimulator() {
  // Clear chat container
  // Start from beginning
}
```

---

## 3. Metrics Dashboard Section

### Requirements:
- Add a metrics dashboard section AFTER the agent groups, BEFORE the summary
- Show expected impact for each agent group
- Visual indicators for: Time Saved, ROI Contribution, Adoption Complexity

### Implementation Details:

**HTML Structure:**
```html
<div class="metrics-dashboard">
  <div class="dashboard-header">
    <h2>📊 Expected Impact by Agent Group</h2>
    <p>Projected benefits based on historical TPS implementations</p>
  </div>

  <div class="metrics-grid">
    <!-- One card per agent group -->
    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-icon">💼</span>
        <h3>Sales & Pre-Engagement</h3>
      </div>
      <div class="metric-bars">
        <div class="metric-row">
          <span class="metric-label">Time Saved</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 60%;" data-value="60%"></div>
          </div>
          <span class="metric-value">60%</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">ROI Contribution</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 85%;" data-value="85%"></div>
          </div>
          <span class="metric-value">High</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">Adoption Complexity</span>
          <div class="progress-bar complexity">
            <div class="progress-fill" style="width: 30%;" data-value="30%"></div>
          </div>
          <span class="metric-value">Low</span>
        </div>
      </div>
    </div>

    <!-- Repeat for all 7 groups -->
  </div>
</div>
```

**Metrics Data for Each Group:**

1. **Sales & Pre-Engagement:** Time Saved: 60%, ROI: High (85%), Complexity: Low (30%)
2. **Aspiration:** Time Saved: 45%, ROI: Very High (95%), Complexity: Medium (50%)
3. **Value Analysis:** Time Saved: 70%, ROI: Very High (90%), Complexity: Medium (55%)
4. **New Ways of Working:** Time Saved: 55%, ROI: High (80%), Complexity: High (70%)
5. **Installation:** Time Saved: 50%, ROI: Very High (95%), Complexity: High (75%)
6. **Sustain:** Time Saved: 65%, ROI: Medium (60%), Complexity: Medium (45%)
7. **Support:** Time Saved: 80%, ROI: Medium (65%), Complexity: Low (25%)

**CSS Styling:**
- Metrics grid: 2-3 columns depending on screen size
- Metric cards: White background, rounded corners, shadow
- Progress bars: Height 20px, rounded, gradient fills
- Time Saved bars: Green gradient (#27ae60 to #2ecc71)
- ROI bars: Teal gradient (#17a2b8 to #20c9e0)
- Complexity bars: Orange gradient (lower is better) (#e67e22 to #f39c12)
- Animated fill on page load (1s ease-out)

**JavaScript for Animation:**
```javascript
// Animate progress bars when they come into view
const observerOptions = {
  threshold: 0.5
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const progressBars = entry.target.querySelectorAll('.progress-fill');
      progressBars.forEach(bar => {
        bar.style.width = bar.dataset.value;
      });
    }
  });
}, observerOptions);

// Observe metrics dashboard
const dashboard = document.querySelector('.metrics-dashboard');
if (dashboard) observer.observe(dashboard);
```

---

## 4. Live Status Indicators

### Requirements:
- Add status indicators to each agent card
- Show: Availability status (green/yellow/red dot) and usage statistics
- Position in top-left corner of each card

### Implementation Details:

**HTML Addition to Each Agent Card:**
```html
<div class="agent-status">
  <div class="status-indicator status-active" title="Agent is operational"></div>
  <span class="usage-stats">47 uses this week</span>
</div>
```

**Status States:**
- Agents 1-10: Active (green) - "Operational"
- Agents 11-13: Active (green) - "Operational"
- Agents 14-16: Limited (yellow) - "Client handover in progress"
- Agents 17-19: Active (green) - "Operational"

**Usage Statistics (sample data):**
- Agent 1: 47 uses this week
- Agent 2: 23 uses this week
- Agent 3: 31 uses this week
- Agent 4: 28 uses this week
- Agent 5: 19 uses this week
- Agent 6: 22 uses this week
- Agent 7: 15 uses this week
- Agent 8: 34 uses this week
- Agent 9: 29 uses this week
- Agent 10: 26 uses this week
- Agent 11: 18 uses this week
- Agent 12: 21 uses this week
- Agent 13: 38 uses this week
- Agent 14: 12 uses this week
- Agent 15: 8 uses this week (client handover)
- Agent 16: 6 uses this week (client handover)
- Agent 17: 52 uses this week
- Agent 18: 31 uses this week
- Agent 19: 44 uses this week

**CSS Styling:**
```css
.agent-status {
  position: absolute;
  top: 15px;
  left: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.95);
  padding: 5px 10px;
  border-radius: 12px;
  font-size: 0.75em;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-active {
  background: #27ae60;
  box-shadow: 0 0 8px rgba(39, 174, 96, 0.6);
}

.status-limited {
  background: #f39c12;
  box-shadow: 0 0 8px rgba(243, 156, 18, 0.6);
}

.status-inactive {
  background: #e74c3c;
  box-shadow: 0 0 8px rgba(231, 76, 60, 0.6);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.usage-stats {
  color: #555;
  font-weight: 600;
}
```

---

## 5. Animated Transitions

### Requirements:
- Add smooth animations throughout the interface
- Expand/collapse animations for agent groups
- Fade-in effects as elements scroll into view
- Subtle pulse on hover for interactive elements

### Implementation Details:

**CSS Additions:**

```css
/* Smooth transitions for all interactive elements */
.agent-card,
.agent-group,
.phase-indicator,
.tool-chip,
.demo-btn {
  transition: all 0.3s ease;
}

/* Hover effects */
.agent-card:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 12px 24px rgba(0,0,0,0.2);
}

.phase-indicator:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.3);
}

.tool-chip:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

/* Pulse animation for demo buttons */
@keyframes subtle-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.demo-btn:hover {
  animation: subtle-pulse 1.5s infinite;
}

/* Fade-in animation */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeInUp 0.6s ease-out;
}

/* Expand/collapse animation for groups */
.agent-group {
  overflow: hidden;
  max-height: 5000px;
  transition: max-height 0.5s ease, opacity 0.3s ease;
}

.agent-group.collapsed {
  max-height: 100px;
  opacity: 0.7;
}

/* Stagger animation for agent cards */
.agent-card:nth-child(1) { animation-delay: 0.1s; }
.agent-card:nth-child(2) { animation-delay: 0.2s; }
.agent-card:nth-child(3) { animation-delay: 0.3s; }
```

**JavaScript for Scroll Animations:**

```javascript
// Intersection Observer for fade-in effects
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in');
      fadeObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.1
});

// Observe all agent groups and cards
document.querySelectorAll('.agent-group, .agent-card').forEach(el => {
  fadeObserver.observe(el);
});

// Add collapse/expand functionality to groups
function addGroupToggle() {
  document.querySelectorAll('.group-header').forEach(header => {
    header.style.cursor = 'pointer';
    header.addEventListener('click', function() {
      const group = this.closest('.agent-group');
      group.classList.toggle('collapsed');
    });
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', addGroupToggle);
```

---

## 6. Connection Lines/Arrows

### Requirements:
- Visual lines showing data flow between agent groups
- Animated dots moving along the lines
- Toggle button to show/hide connections
- Integrate with the flow diagram

### Implementation Details:

**HTML Structure:**

```html
<div class="connections-toggle">
  <button onclick="toggleConnections()" class="toggle-connections-btn">
    <span id="connectionsIcon">🔗</span> Show Connections
  </button>
</div>

<svg id="connectionsSvg" class="connections-overlay" style="display: none;">
  <!-- SVG paths will be dynamically generated -->
</svg>
```

**SVG Path Generation Logic:**

```javascript
function generateConnections() {
  const svg = document.getElementById('connectionsSvg');
  const groups = document.querySelectorAll('.agent-group');

  // Define connections between groups
  const connections = [
    { from: 'sales-group', to: 'aspiration-group', color: '#17a2b8' },
    { from: 'aspiration-group', to: 'value-group', color: '#17a2b8' },
    { from: 'value-group', to: 'working-group', color: '#17a2b8' },
    { from: 'working-group', to: 'installation-group', color: '#17a2b8' },
    { from: 'installation-group', to: 'sustain-group', color: '#17a2b8' },
    // Support group connects to all
    { from: 'support-group', to: 'sales-group', color: '#95a5a6', dashed: true },
    { from: 'support-group', to: 'aspiration-group', color: '#95a5a6', dashed: true },
    // ... etc
  ];

  connections.forEach(conn => {
    const fromEl = document.querySelector(`.${conn.from}`);
    const toEl = document.querySelector(`.${conn.to}`);

    if (fromEl && toEl) {
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      // Calculate path coordinates
      const path = createCurvedPath(fromRect, toRect);

      // Create SVG path element
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', path);
      pathEl.setAttribute('stroke', conn.color);
      pathEl.setAttribute('stroke-width', '3');
      pathEl.setAttribute('fill', 'none');
      if (conn.dashed) {
        pathEl.setAttribute('stroke-dasharray', '5,5');
      }

      // Add animated dot
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', '5');
      circle.setAttribute('fill', conn.color);

      // Animate circle along path
      const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
      animate.setAttribute('dur', '3s');
      animate.setAttribute('repeatCount', 'indefinite');
      const mpath = document.createElementNS('http://www.w3.org/2000/svg', 'mpath');
      mpath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#' + pathEl.id);
      animate.appendChild(mpath);
      circle.appendChild(animate);

      svg.appendChild(pathEl);
      svg.appendChild(circle);
    }
  });
}

function createCurvedPath(fromRect, toRect) {
  const x1 = fromRect.right;
  const y1 = fromRect.top + fromRect.height / 2;
  const x2 = toRect.left;
  const y2 = toRect.top + toRect.height / 2;

  const cx = (x1 + x2) / 2;

  return `M ${x1} ${y1} Q ${cx} ${y1}, ${cx} ${(y1 + y2) / 2} T ${x2} ${y2}`;
}

function toggleConnections() {
  const svg = document.getElementById('connectionsSvg');
  const btn = document.querySelector('.toggle-connections-btn');
  const icon = document.getElementById('connectionsIcon');

  if (svg.style.display === 'none') {
    svg.style.display = 'block';
    generateConnections();
    btn.innerHTML = '<span id="connectionsIcon">🔗</span> Hide Connections';
  } else {
    svg.style.display = 'none';
    svg.innerHTML = ''; // Clear paths
    btn.innerHTML = '<span id="connectionsIcon">🔗</span> Show Connections';
  }
}
```

**CSS Styling:**

```css
.connections-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.connections-toggle {
  text-align: center;
  margin: 20px 0;
}

.toggle-connections-btn {
  background: linear-gradient(135deg, #17a2b8, #138496);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
}

.toggle-connections-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.3);
}
```

---

## General Implementation Notes:

1. **Maintain existing functionality**: Don't break current hover tooltips, responsive design, or styling
2. **Color consistency**: Use existing Proudfoot color palette throughout
3. **Performance**: Use CSS transforms for animations (GPU-accelerated)
4. **Accessibility**: Ensure all interactive elements are keyboard-accessible
5. **Responsive design**: Test all new features on mobile/tablet viewports
6. **Z-index management**: Modals should be highest (z-index: 1000), connections overlay lower (z-index: 1)

## Testing Checklist:
- [ ] Flow diagram toggles correctly
- [ ] Agent cards highlight in flow when clicked
- [ ] Simulator modals open/close properly for agents #1 and #8
- [ ] Chat messages appear sequentially
- [ ] Metrics dashboard animates on scroll
- [ ] Status indicators display correctly on all cards
- [ ] Hover animations are smooth and not jarring
- [ ] Connection lines draw correctly between groups
- [ ] Animated dots move along connection paths
- [ ] All features work on mobile devices
- [ ] No console errors

## File to Modify:
`tps_agent_ecosystem.html`

## Approach:
Make surgical edits to the existing file. Add new CSS in the `<style>` section, new HTML sections in appropriate locations, and new JavaScript functions before the closing `</body>` tag.
