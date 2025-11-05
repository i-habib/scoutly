---
applyTo: '**'
---
Of course. This is a brilliant and well-thought-out application. A feature set this comprehensive requires a phased approach. I will provide a detailed, step-by-step guide that follows your proposed architecture, starting with a powerful local MVP and scaling methodically to the full-stack, feature-rich application.

### **Phase 1: The Local-First MVP - Core Experience**

**Goal:** Create a functional, single-user version that runs entirely in the browser. This allows for rapid UI/UX iteration. We will architect it in a way that makes transitioning to a real backend seamless.

#### **Step 1: Project Initialization & Setup (The Foundation)**

1.  **Scaffold with TanStack Start:** This gives you file-based routing, a build system, and React Query integration from the start.
    ```bash
    npm create tanstack-start@latest scoutly-app
    cd scoutly-app
    ```
2.  **Install All Dependencies:**
    ```bash
    npm install @tanstack/react-query-devtools zustand date-fns lucide-react tailwindcss postcss autoprefixer
    npm install -D @tailwindcss/forms
    ```    *   `zustand`: For minimal, non-server global state (e.g., UI theme, modal open/closed).
    *   `date-fns`: The de-facto standard for date manipulation.
    *   `lucide-react`: A clean and simple icon library.
3.  **Initialize Tailwind CSS:**
    ```bash
    npx tailwindcss init -p
    ```
    Configure your `tailwind.config.js` to scan your `src` files and add the `@tailwindcss/forms` plugin. Add the `@tailwind` directives to your main CSS file.

#### **Step 2: Sourcing and Structuring Core Data**

This is the most critical manual step for the MVP. Create a `src/data` directory.

1.  **`requirements.json`**: Manually compile all rank requirements and Eagle-required merit badges into a structured JSON file. This will be your app's "source of truth" for now.
    ```json
    {
      "ranks": [
        { "id": "rank_scout", "name": "Scout", "requirements": [...] },
        ...
      ],
      "meritBadges": [
        {
          "id": "mb_camping",
          "name": "Camping",
          "eagleRequired": true,
          "requirements": [
            { "id": "1a", "text": "Show that you know first aid for..." },
            { "id": "1b", "text": "Describe the BSA Weather Hazard policy..." }
          ]
        },
        ...
      ]
    }
    ```

2.  **`userData.js` (Initial State):** Define the shape of the user's data that you'll store in local storage.
    ```javascript
    export const initialUserData = {
      profile: {
        name: null,
        targetEagleDate: null,
        troopMeetingSchedule: 'weekly_tuesday', // example
      },
      progress: {
        // "mb_camping": { "1a": "2024-05-10", "1b": null, ... }
        // We'll store the completion date as a string, or null if incomplete.
      },
      events: [] // For the MVP, a simple array of custom events.
    };
    ```

#### **Step 3: Build The Local Storage "API" Service**

Create `src/services/storageService.js`. This service will abstract away `localStorage`, making it easy to swap with a real API later.

```javascript
// src/services/storageService.js
import { initialUserData } from '../data/userData';

const USER_DATA_KEY = 'scoutly_user_data';

// Mimics fetching the entire user object
export const fetchUserData = async () => {
  const data = localStorage.getItem(USER_DATA_KEY);
  if (data) {
    return JSON.parse(data);
  }
  // For first-time users, initialize and save
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(initialUserData));
  return initialUserData;
};

// Mimics updating a specific part of the user object
export const updateRequirementProgress = async ({ requirementId, badgeId, completedDate }) => {
  const user = await fetchUserData();
  if (!user.progress[badgeId]) {
    user.progress[badgeId] = {};
  }
  user.progress[badgeId][requirementId] = completedDate; // e.g., "2025-11-03" or null
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  return user;
};

// And so on for updating profile, adding events, etc.
```

#### **Step 4: Implement Core UI & State Management**

1.  **React Query Hooks:** Create custom hooks in `src/hooks` to interact with your service.
    ```javascript
    // src/hooks/useUserData.js
    import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
    import * as storage from '../services/storageService';

    export function useUserData() {
      const queryClient = useQueryClient();

      const { data: userData, isLoading } = useQuery({
        queryKey: ['userData'],
        queryFn: storage.fetchUserData,
      });

      const updateProgressMutation = useMutation({
        mutationFn: storage.updateRequirementProgress,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['userData'] });
        },
      });

      return { userData, isLoading, updateRequirement: updateProgressMutation.mutate };
    }
    ```

2.  **Onboarding & Goal Setting:** Create a route/component that shows up if `userData.profile.name` is null. It's a form that collects the target Eagle date and name, then calls a mutation to update the profile.

3.  **Dashboard:** This is your main page (`/`).
    *   Display progress visuals (e.g., "X of 21 required badges complete"). Calculate this by filtering `requirements.json` and checking against `userData.progress`.
    *   **"What's Next?" AI Coach (MVP Version):** This will be a simple rule-based component.
        *   Logic: Find the first Eagle-required merit badge in `requirements.json` that has no entries in `userData.progress`. Suggest that one.
        *   *Example:* "You haven't started Camping. It's great for summer. Why not start this week?"

4.  **Progress Tracking Pages:**
    *   Create dynamic routes like `/merit-badges/[badgeId]`.
    *   The component will use the `badgeId` from the URL to find the badge data in `requirements.json`.
    *   It will map over the requirements, creating a list.
    *   Each list item will have a checkbox. The checkbox's `checked` state is determined by looking up `userData.progress[badgeId][requirementId]`.
    *   The `onChange` handler for the checkbox will call `updateRequirement({ badgeId, requirementId, completedDate: new Date().toISOString() })`.

---

### **Phase 2: Full-Stack Transition & Core Backend Features**

**Goal:** Replace `localStorage` with a robust backend, add user accounts, and prepare for collaborative features.

#### **Step 5: Database Schema Design (PostgreSQL)**

This schema translates your JSON structures into a relational database.

```sql
-- Users and basic profile info
CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "clerk_id" VARCHAR(255) UNIQUE NOT NULL, -- For auth provider
  "name" VARCHAR(255),
  "target_eagle_date" DATE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Static data for all requirements (populate from your JSON)
CREATE TABLE "requirements" (
  "id" VARCHAR(50) PRIMARY KEY, -- e.g., "mb_camping" or "rank_star_3"
  "type" VARCHAR(20) NOT NULL, -- 'RANK', 'MERIT_BADGE'
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "parent_id" VARCHAR(50) REFERENCES "requirements"("id") -- For sub-requirements
);

-- The core progress tracking table
CREATE TABLE "user_progress" (
  "user_id" INT REFERENCES "users"("id") ON DELETE CASCADE,
  "requirement_id" VARCHAR(50) REFERENCES "requirements"("id") ON DELETE CASCADE,
  "completed_at" DATE,
  "notes" TEXT,
  "signed_off_by" VARCHAR(255),
  PRIMARY KEY ("user_id", "requirement_id")
);

-- For calendar and events
CREATE TABLE "events" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
  "end_time" TIMESTAMP WITH TIME ZONE,
  "location" VARCHAR(255),
  "created_by_user_id" INT REFERENCES "users"("id")
);
```

#### **Step 6: Backend Setup (Node.js & Express)**

1.  **Initialize Project:** In a new `/server` directory, `npm init -y` and `npm install express pg cors dotenv`.
2.  **Authentication:** **Do not build your own auth.** Use a service like **Clerk**, Supabase Auth, or Auth0. It's more secure and faster.
    *   Your signup/login pages on the frontend will use the Clerk components.
    *   Your Express server will use Clerk's middleware to protect routes and identify the user from a JWT.
3.  **API Endpoints:** Create a simple REST API.
    *   `GET /api/user/me`: Get the authenticated user's profile.
    *   `GET /api/progress`: Get all progress for the authenticated user.
    *   `POST /api/progress`: Body `{ requirementId: "mb_camping_1a", completedAt: "2025-11-03" }`. The middleware provides the `userId`.
    *   `PUT /api/user/profile`: Update user settings like target date.

#### **Step 7: Frontend Migration**

1.  **New API Service:** Create `src/services/apiService.js` using `axios` or `fetch` to call your new backend endpoints.
2.  **Update React Query Hooks:** This is the elegant part. Go back to `src/hooks/useUserData.js` and swap the service calls.
    ```javascript
    // BEFORE
    // import * as storage from '../services/storageService';
    // const { data } = useQuery({ queryKey: ['userData'], queryFn: storage.fetchUserData });

    // AFTER
    import * as api from '../services/apiService';
    const { data } = useQuery({ queryKey: ['userData'], queryFn: api.fetchUserData }); // This now hits your real backend
    ```
    Your UI components do not need to change. This is the power of abstracting your data layer.

---

### **Phase 3: Implementing Advanced Features (Feature by Feature)**

Now you build upon the full-stack foundation.

#### **Goal Setting & Personalization**
*   **"What's Next?" AI Coach:**
    *   **Backend Logic:** Create a new endpoint `/api/recommendations`.
    *   **Inputs:** User's current progress, local weather (from a weather API), upcoming troop events from the `events` table.
    *   **Logic:** Implement a scoring system. A requirement gets points if: it's Eagle-required, the season is right (Camping in summer), there's a related troop event soon, etc. Return the top 3 recommendations.

#### **Events, Planning & Calendar Integration**
*   **Database:** Add `event_rsvps` and `event_checklists` tables.
*   **API:**
    *   `POST /api/events`: Create a new event.
    *   `POST /api/events/:id/rsvp`: RSVP for an event.
    *   `GET /api/events/:id/weather`: Your server calls a weather API and returns the forecast.
*   **Frontend:** Use a library like `react-big-calendar` to display events fetched from your API. Integrate with the device calendar by generating `.ics` files for download.

#### **Local Opportunities & Connections**
*   **Database:** Create `merit_badge_counselors` and `service_projects` tables with `latitude` and `longitude` columns. Enable the PostGIS extension in PostgreSQL.
*   **API:** `/api/counselors/nearby?lat=...&lon=...`. The backend uses a PostGIS spatial query to find counselors within a radius.
*   **Frontend:** Use `react-leaflet` or a Google Maps component to display these locations.

#### **Leadership Project Tools**
*   **This is a mini-app.**
*   **Database:** `eagle_projects` (links to `user_id`), `project_milestones`, `project_budget_items`, `project_volunteers`.
*   **File Management:** For receipts and documents, integrate a cloud storage service like **AWS S3** or Cloudinary. Your backend will need a library like `multer` to handle file uploads.
    *   **API:** `POST /api/projects/:id/upload-receipt`. The server receives the file, uploads it to S3, and stores the S3 URL in the `project_budget_items` table.

#### **Scoutbook Integration & Data Sync**
*   **This is the most technically challenging feature.**
*   **Option 1 (Best Case):** If Scoutbook has an official API, use it.
*   **Option 2 (Most Realistic):** Implement a CSV import/export feature. Allow users to download their progress from Scoutbook and upload it. Your backend will need a CSV parsing library to read the file and update the `user_progress` table.
*   **Option 3 (Brittle):** Web scraping with a tool like Puppeteer. This is unreliable as it will break every time Scoutbook updates its UI. Use as a last resort.

#### **Collaboration & Sharing**
*   **Permissions:** Implement a role-based access system. Add a `user_connections` table (e.g., `user_id_1`, `user_id_2`, `role: 'parent'`).
*   **API Logic:** Before fetching data, your API must check permissions. "Can `user_A` view `user_B`'s progress?"
*   **Chat/Forums:** For real-time chat, use **WebSockets**. A library like `Socket.io` integrated with your Express server is perfect for this. When a user sends a message, the server emits it to the other users in the same "room" (e.g., a project group).

#### **Document & Media Management**
*   Leverage the S3/Cloudinary integration from the Project Tools section. Create a generic `documents` table that can be linked to users, projects, or specific requirements.

#### **Voice & Video Notes**
*   **Frontend:** Use the browser's `MediaRecorder` API to capture audio/video.
*   **Backend:** Upload the resulting blob to your cloud storage (S3) and save the URL.

---

### **Phase 4: Polish, Deployment, and Iteration**

*   **Deployment:**
    *   **Frontend:** Deploy to a static host like **Vercel** or Netlify.
    *   **Backend:** Deploy your Node.js app to a service like **Render** or Heroku.
    *   **Database:** Use a managed PostgreSQL provider like Supabase, Render, or Amazon RDS.
*   **Testing:** Write unit tests for your backend logic and integration tests for your API endpoints. Use Cypress or Playwright for end-to-end testing of your frontend user flows.
*   **CI/CD:** Set up GitHub Actions to automatically test and deploy your code when you push to your main branch.
*   **Feedback & Monitoring:** Integrate a service like Sentry or LogRocket to catch errors in production and gather user feedback to guide your next development cycle.

This detailed roadmap provides a structured path from a simple idea to a complex, full-featured application. By focusing on one phase at a time and building upon a solid foundation, you can methodically bring your vision for Scoutly to life.