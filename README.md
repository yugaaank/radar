# Radar: Technical Intelligence Manual

Radar is a local-first engineering command center that transforms raw API data into **Decision Relevance**. It leverages the **Coral CLI** to treat disparate services as a unified SQL database.

---

## 1. System Architecture

Radar consists of three primary layers:
1.  **Data Layer (Coral):** Manages local authentication and translates API endpoints (REST/gRPC) into relational SQL tables.
2.  **Intelligence Layer (radar-backend):** A Bun/Node.js service that executes "Decision Queries" against Coral. It calculates urgency, impact, and health scores.
3.  **Visualization Layer (radar-frontend):** A Next.js interactive canvas that maps items to a multi-dimensional radar using a "Google Maps" zoom/pan interface.

---

## 2. Data Retrieval & Mapping

Each service is queried using standard SQL via the `coral sql` interface. Below is the breakdown of what is called and how it's mapped.

### 🐙 GitHub Integration
*   **Method:** Actionable items are fetched using the Notifications and Pull Request APIs.
*   **Actionable Work (High Maintenance):**
    *   **SQL Source:** `github.notifications` (unread) and `github.issues` (filter='created').
    *   **Logic:**
        *   **CheckSuite Failures:** Any failed CI/CD run is automatically positioned at `distance: 0.1` (Center) and marked as `Overdue` (Red Pulse).
        *   **PR Mentions/Updates:** Unread PR notifications move to the center as `Action Required`.
*   **Project Context:**
    *   **SQL Source:** `github.user_repos`.
    *   **Logic:** Plotted based on `pushed_at`. Repos not touched in 30 days drift to the `Someday` ring.
*   **Dimensions:**
    *   **Angle:** Placed in the **Engineering** slice (60°-120°).
    *   **Icon:** GitBranch (Repos) or Terminal (Failures).

### ✅ ClickUp Integration
*   **Method:** Workspace-wide task aggregation linked via Team ID.
*   **Task Tracking:**
    *   **SQL Source:** `clickup.team_task`.
    *   **Logic:** 
        *   **Distance:** Calculated based on `due_date`. `GREATEST(0, (due_date - now()))`.
        *   **Default:** Tasks without deadlines are placed at `distance: 14` (1 week ring) to ensure visibility.
        *   **In-Progress:** Tasks with status matching `%progress%` are given priority gravity.
*   **Dimensions:**
    *   **Angle:** Dynamically categorized by **Subject** (List Name).
        *   Maths/Chem/Physics -> **Learning** slice (120°-180°).
        *   Engineering/Dev -> **Engineering** slice (60°-120°).
    *   **Icon:** Checkmark.

### 📝 Notion Integration
*   **Method:** Property-aware scanning of the Knowledge Base.
*   **Documentation Health:**
    *   **SQL Source:** `notion.search`.
    *   **Decision Metadata:** The backend parses raw JSON `properties` from Notion pages.
        *   **`Impact` Property:** Drives the visual **Size** of the node.
        *   **`Blocked?` Property:** Triggers the **Shield icon** and reduces opacity.
        *   **`Category` Property:** Determines the **Angle** (Finance, Strategy, etc.).
*   **Logic:**
    *   Pages older than 60 days (`last_edited_time`) are flagged as **Stale Documentation**.
*   **Dimensions:**
    *   **Angle:** Maps to specific slices based on the Notion `Category` select property.
    *   **Icon:** FileText.

---

## 3. The Urgency Algorithm

Radar does not use a simple timeline. It uses a **Decision Score**:

```typescript
function calculateDistance(dueDate, impact, isBlocked) {
  let score = daysUntilDue;
  if (impact > 4) score *= 0.8; // High impact items gravitate inward
  if (isBlocked) score = Math.max(0.5, score); // Blocked items stay visible
  return score;
}
```

---

## 4. Setup & Onboarding

### API Connectivity
All tokens are managed locally via the Radar UI, which executes:
`coral source add <name> --[SECRET_KEY]=[TOKEN]`

### Required Scopes
*   **GitHub:** `repo`, `read:org`, `user`, `notifications`.
*   **Notion:** Internal Integration Token (Read access).
*   **ClickUp:** Personal API Token.

---

## 5. Controls
*   **Zoom:** Mouse Wheel (0.1x to 4x).
*   **Navigate:** Click + Drag (Infinite Panning).
*   **Focus:** Center ring = Items requiring action within **24 hours**.
