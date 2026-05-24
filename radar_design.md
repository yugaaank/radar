# Radar: Cross-Platform Intelligence Engine
## System Design Document

### 1. Vision & Impact (🏴‍☠️ Potential Impact)
Engineering teams today suffer from "Context Fragmentation." Critical information is scattered across GitHub (code), Jira (tasks), Slack (chat), and Datadog (reliability). **Radar** uses **Coral** to unify these silos into a single, high-fidelity intelligence stream. 

**The Problem:** High cognitive load from context switching and missed "invisible" blockers (e.g., a critical Datadog alert linked to a stalled GitHub PR discussed only in Slack).
**The Solution:** A unified SQL-powered interface that detects blockers, generates daily briefs, and provides global search across the entire engineering stack.

---

### 2. Architecture Overview (⚔️ Technical Implementation)
Radar is built on a **Hub-and-Spoke** architecture with Coral at its core.

#### A. Data Layer (Powered by Coral)
*   **Unified Schema:** Radar leverages Coral's SQL engine to treat disparate APIs as a local database.
*   **Cross-Source Joins:** The engine performs federated queries across sources.
    *   *Example:* Joining `github.pulls` with `jira.issues` where identifiers match to verify task completion.
*   **MCP Bridge:** Radar utilizes `coral mcp-stdio` to expose these data sources to an LLM-based agent.

#### B. Backend Services
*   **Intelligence Engine (Python/Node.js):** Orchestrates complex SQL queries.
*   **Polling & Webhook Hybrid:** For real-time updates where possible, falling back to Coral's efficient SQL polling for others.
*   **Persistence:** A lightweight local SQLite database to store Radar-specific metadata (user preferences, alert thresholds, and cached snapshots).

#### C. Frontend Interface (🎨 Aesthetics & UX)
*   **The Radar Visualization:** A clean, white-background homepage featuring dark/grey concentric circles. 
    *   **Urgency Mapping:** Items (PRs/Issues) are plotted as interactive nodes.
    *   **Time-Space Duality:** The distance from the center represents "staleness" (days since last update). Inner circles = Active/Urgent; Outer circles = Stale/Late.
*   **Command Palette:** A "Spotlight-style" search (via `coral sql`) for instant access to any entity.
*   **AI Sidekick:** A floating chat interface powered by OpenUI that connects to the same intelligence engine.

---

### 3. Creative Use of Coral (⚓ Creativity & Originality)
Radar doesn't just "read" data; it performs **Inference via SQL**:
*   **Zombie Task Detection:** Queries Jira for "In Progress" tasks where the associated GitHub branch hasn't seen a commit in >48 hours.
*   **Incident-Code Correlation:** Joins `datadog.incidents` with `github.commits` based on timestamps and service tags to identify potential "root-cause commits."
*   **The "Shadow Work" Graph:** Queries Slack messages to find mentions of "bug" or "fix" that aren't tracked in Jira or GitHub, identifying untracked labor.

---

### 4. Technical Strategy (🪸 Best Use of Coral)
*   **SQL-First Integration:** Instead of writing individual API connectors, Radar defines "Intelligence Views" (stored SQL queries) that Coral executes.
*   **Caching & Optimization:** Radar uses Coral's local-first nature to minimize API rate-limiting hits by intelligently caching frequently accessed metadata (user IDs, repo lists).
*   **Agentic Interaction:** By implementing the Model Context Protocol, Radar allows users to ask: *"What's blocking the release?"* and have the agent execute a 4-way join across GitHub, Jira, Datadog, and Slack.

---

### 5. Implementation Roadmap (🗺️ Learning & Growth)
*   **Phase 1 (The Foundation):** Master the Coral CLI and source manifest system. Standardize environment secret management for `GITHUB_TOKEN`, `SLACK_TOKEN`, etc.
*   **Phase 2 (The Intelligence):** Develop the cross-source SQL library. Focus on "Join-Logic" (mapping email addresses across Slack/GitHub/Jira).
*   **Phase 3 (The Interface):** Build the Radar CLI and a React-based Dashboard that visualizes the SQL results.
*   **Phase 4 (The Agent):** Integrate with Gemini using Coral's MCP server for natural language orchestration.

---

### 6. Judging Criteria Alignment
*   **Potential Impact:** Solving context fragmentation for 10x engineering velocity.
*   **Creativity:** Using SQL joins to detect "Zombie Tasks" and "Shadow Work."
*   **Technical Implementation:** Robust use of Coral's federated query engine and MCP server.
*   **Best Use of Coral:** Heavy reliance on cross-source joins, which is Coral's unique superpower.
