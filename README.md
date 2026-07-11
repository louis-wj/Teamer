TeamerTeamer is an open-source, full-stack team collaboration and matching ecosystem designed to streamline how professionals, students, and hackathon participants self-organise. By analysing individual skill profiles, project constraints, and working preferences, Teamer bridges the gap between fragmented communication and structured project execution.📖 Table of ContentsFeaturesArchitecture & Tech StackGetting StartedPrerequisitesLocal InstallationEnvironment VariablesDatabase SchemaAPI DocumentationTestingContributingLicence🚀 FeaturesTeamer provides a rich array of functionalities built to facilitate dynamic team formation and agile collaboration:👤 User Authentication & Profile CustomisationSecure Onboarding: Full implementation of JWT-based user authentication alongside third-party OAuth providers.Skill Matrix Construction: Detailed user profiles capturing primary skills, proficiency levels, domain interests, and availability metrics.🤝 Dynamic Team Matching & RecruitmentIntelligent Recommendations: Algorithmic matching that pairs open project requirements with individuals boasting complementary skills.Application Lifecycle: Users can browse public teams, submit join requests, and track their application status in real time.Recruitment Portals: Team leads can post open vacancies specifying precise criteria (e.g., "Requires 3+ years experience with React").📊 Project Workspace & Collaboration HubKanban Boards: Integrated task tracking to distribute, categorise, and manage workflow sprint by sprint.Live Communications: Real-time chat rooms and announcement channels specific to each project team.Resource Sharing: Dedicated knowledge hubs for storing project repositories, documentation links, and media assets.🛡️ Administrative Control PanelModeration Suites: Comprehensive overview tools for site administrators to manage user flags, audit public teams, and enforce platform standards.Usage Analytics: High-level metrics tracking active users, successfully created teams, and overall project completion rates.🛠️ Architecture & Tech StackTeamer is engineered using a decoupled, microservice-ready architecture to maintain scalability, reliable performance, and strict separation of concerns.                  ┌────────────────────────┐
                  │      Client Apps       │
                  │   (React / Next.js)    │
                  └───────────┬────────────┘
                              │ HTTPS / WSS
                              ▼
                  ┌────────────────────────┐
                  │    API Gateway / WAF   │
                  └───────────┬────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         ▼                                         ▼
┌─────────────────┐                       ┌─────────────────┐
│  Auth & Profile │                       │  Team Matching  │
│     Service     │                       │    & Chat Hub   │
└────────┬────────┘                       └────────┬────────┘
         │                                         │
         ▼                                         ▼
┌─────────────────┐                       ┌─────────────────┐
│ Relational DB   │                       │ In-Memory Cache │
│ (PostgreSQL/Mys)│                       │     (Redis)     │
└─────────────────┘                       └─────────────────┘
FrontendCore Framework: TypeScript, React.js (or Next.js) for robust component lifecycle management.State Management: Redux Toolkit or Context API handling application state natively.Styling Ecosystem: Tailwind CSS combined with accessible component libraries for responsive user interfaces.BackendRuntime Environment: Node.js paired with Express or NestJS for clean architectural pattern separation.Asynchronous Communication: WebSockets (Socket.io) handling concurrent real-time messaging pipelines.Data Layer: Object-Relational Mapping (ORM) through Prisma or Mongoose ensuring safe, structured querying.Databases & InfrastructurePersistent Storage: PostgreSQL (or MongoDB) tracking normalized schema dependencies safely.Caching & Sessions: Redis optimising high-volume lookup endpoints and active WebSocket sessions.💻 Getting StartedFollow these detailed steps to stand up a local instance of Teamer for development and verification purposes.PrerequisitesEnsure your local host environment runs the following baseline dependencies:Node.js: v18.x or laterPackage Manager: npm v9.x+ or yarnDatabase Engine: PostgreSQL v15+ or MongoDB local instance activeLocal InstallationClone the Repository:Bashgit clone https://github.com/louis-wj/Teamer.git
cd Teamer
Install Root and Sub-service Dependencies:If the repository is configured as a monorepo workspace:Bashnpm install
Otherwise, install individual component environments separately inside their respective /frontend and /backend directories.Configure Environment Parameters:Navigate into both frontend and backend directories to create your local variables configuration file:Bashcp .env.example .env
Initialize Database Migrations:Bashcd backend
npx prisma migrate dev --name init
Spin Up the Local Development Servers:To concurrently boot both client and hosting environments from the project root root workspace:Bashnpm run dev
The backend environment default listens at http://localhost:5000 while the frontend web app presents via http://localhost:3000.Environment VariablesYour backend .env configuration template must contain the following declarations:Code snippet# Server Network Settings
PORT=5000
NODE_ENV=development

# Database Connection URI
DATABASE_URL="postgresql://db_user:db_password@localhost:5462/teamer_db?schema=public"

# Security & Tokens
JWT_SECRET="your_ultra_secure_jwt_secret_signing_key_here"
JWT_EXPIRY="7d"

# Third-Party Provider OAuth Config
GITHUB_CLIENT_ID="your_github_client_id"
GITHUB_CLIENT_SECRET="your_github_client_secret"

# Cache Configuration
REDIS_URL="redis://localhost:6379"
📊 Database SchemaThe entity relationships inside Teamer are structured to ensure high consistency across multi-member updates:Entity TablePrimary ResponsibilityKey Attributes IncludedUsersSystem identity registryid, email, password_hash, role, created_atProfilesDomain expertise trackingid, user_id, full_name, skills[], bio, github_urlTeamsCollaboration unit recordsid, title, description, owner_id, max_members, statusMembershipsMaps users to explicit teamsid, user_id, team_id, role (Admin/Member), joined_atApplicationsHandles team request lifecyclesid, user_id, team_id, cover_letter, status (Pending/Approved)MessagesStores real-time conversationsid, team_id, sender_id, content, timestamp⚡ API DocumentationAll request parameters, headers, and payloads interact natively using serialization standards.Authentication EndpointsPOST /api/auth/register - Registers a new user account profile.POST /api/auth/login - Validates security credentials and issues active JWT bearers.GET /api/auth/me - Resolves identity token payloads back to current account context.Team Operations EndpointsGET /api/teams - Queries public teams filtered by project tags and vacancy skills.POST /api/teams - Builds a new team entity workspace with the requesting user assigned as Owner.GET /api/teams/:id - Fetches detailed configuration, roster states, and tasks for a specific team.POST /api/teams/:id/apply - Submits a participation request payload to join a target group.Chat & Message EndpointsGET /api/teams/:id/messages - Pulls historical log streams for a specific team workspace channel.🧪 TestingTeamer guarantees reliability through comprehensive integration test blocks using structural frameworks like Jest and Supertest.Executing Backend Test SuitesNavigate into your /backend framework instance to fire up unit verification processes:Bashcd backend
npm run test
Executing Frontend End-to-End TestsValidate UI state transitions and view configurations via interactive testing instances:Bashcd frontend
npm run test:e2e
🤝 ContributingContributions are vital to Teamer's continuous evolution. Please follow this structural process to introduce fixes or feature enhancements:Fork the codebase at https://github.com/louis-wj/Teamer.Initialise a dedicated, descriptive tracking branch: git checkout -b feature/your-awesome-feature.Commit your adjustments locally ensuring message patterns align neatly with modern git practices.Push execution states up to your repository copy: git push origin feature/your-awesome-feature.Open a detailed Pull Request outlining your architectural changes, visual improvements, or performance patches.📄 LicenceDistributed strictly under the terms of the MIT Licence. Review the complete layout parameters inside the local LICENSE asset file for comprehensive legal parameters.
