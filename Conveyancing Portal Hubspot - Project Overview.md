Conveyancing Portal - Project Overview
System Architecture
The conveyancing portal is a dual-interface application consisting of client-facing and agent-facing portals, built on a modern serverless architecture with HubSpot as the primary data backend.
Infrastructure Stack

Frontend Hosting: WordPress on WP-Engine serving static entry points at /client-portal and /agent-portal
Application Layer: React-based SPAs for both portals
Backend: Serverless functions (Vercel/AWS Lambda) handling business logic and API orchestration
Data Layer: HubSpot CRM serving as primary database via HubSpot APIs
HubSpot Objects: Contacts, Companies, Deals

Core Workflows
Workflow 1: Client-Initiated Disclosure Form
Client submits disclosure form → System processes seller and agency data → Creates/updates HubSpot records → Client gains portal access
Contact Resolution Logic:

Query HubSpot Contacts API for existing seller records
If contact exists: Create new Deal and associate with existing Contact
If contact doesn't exist: Create new Contact and associated Deal

Agency Resolution Logic:

Perform fuzzy match against HubSpot Companies using business name and email
Present match confirmation to user
Handle agent contact association:

Search for existing agent contact within company
Create new agent contact if not found
Associate agent contact with both Company and Deal objects



Workflow 2: Agent-Initiated Client Creation
Agent logs into portal → Creates client record → Completes property intake form → Generates client portal access
Agent Portal Process:

Client Creation Phase: Agent inputs seller information and property details
Property Intake Phase: 5-stage form completion with review/submit workflow
Record Generation: Creates HubSpot Contact and Deal objects
Portal Provisioning: Generates client portal access for ongoing disclosure process

Deal Pipeline Stages
The system manages progression through a standardized 10-stage pipeline within HubSpot Deals:

Client Details Required - Initial lead creation stage
Client Portal Sent - Portal access provisioned to client
Searches Quote Provided - Cost estimate generated and presented
Awaiting Signed Retainer - Legal agreement pending signature
Searches Funds Requested - Payment instructions provided
Funds Provided - Payment received and confirmed
Searches Returned - Search results delivered to client
Form 2 with Client - Final documentation stage
Form 2 Complete (Closed/Won) - Successful transaction completion
Closed/Lost - Unsuccessful transaction termination

Property Disclosure Framework
5-Section Property Assessment
Both portals implement identical property disclosure questionnaires with bi-directional synchronization:
Section 1: Title Details & Encumbrances

Body corporate status verification
Non-statutory encumbrances identification
Statutory encumbrances assessment

Section 2: Rental Agreement/Tenancy

Residential tenancy agreement status
Informal rental arrangement disclosure
Tenancy continuation post-settlement evaluation
Rental details collection (rates, terms, bond amounts)

Section 3: Land Use, Planning & Environment

Resume notices for infrastructure projects
Environmental register listings
Government notice compliance
Heritage protection status
Tree preservation orders

Section 4: Buildings & Structures

Swimming pool/spa presence
Owner-builder work documentation
Council enforcement notices
Structural compliance verification

Section 5: Rates & Services

Current rates notice upload
Water notice documentation
Municipal service verification

Conditional Field Logic
The system implements dynamic form behavior with conditional field display based on user responses, including nested sub-questions for complex scenarios (e.g., tenancy continuation post-settlement).
File Management System

Multi-format file upload support (PDF, JPG, PNG)
Agent-uploaded file visibility in client portal
File size validation and type verification
Secure file storage with access controls

Data Synchronization
Cross-Portal Sync

Real-time data synchronization between agent and client portals
Conditional field state preservation across portal instances
File attachment visibility across both interfaces
Progress tracking with automated status updates

Session Management

Lead-specific session data isolation
Automatic cleanup of cross-contaminated session data
Form state persistence during navigation
Multi-section validation with section-specific error handling

Integration Points
HubSpot API Integration

Contacts API: Seller and agent contact management
Companies API: Agency relationship management
Deals API: Transaction lifecycle tracking with automated stage progression
Associations API: Linking contacts, companies, and deals

Authentication & Access Control

Client portal access provisioned post-disclosure form submission
Agent portal requires existing authentication system
Role-based access to respective portal interfaces
Secure token-based session management

Document Management Integration

DocuSign integration for retainer agreement execution
Automated document generation and delivery
Electronic signature workflow with completion tracking
Document status synchronization with deal progression

Process Convergence
Both workflows ultimately converge on the client disclosure process within the client portal, with agents having oversight and review capabilities regardless of the initiation method. The system maintains comprehensive audit trails and implements automated notification workflows to keep all stakeholders informed of process status and milestone updates.
Historical Context & Migration Rationale
Legacy Architecture (WordPress-Based System)
The current system operates as a WordPress-based multi-portal conveyancing system with the following characteristics:
Previous Technology Stack:

Backend: PHP (WordPress) with MySQL database
Frontend: Vanilla JavaScript with WordPress templates
Authentication: Session-based + Token-based dual approach
Integrations: Smokeball CRM, DocuSign, Aircall SMS, Microsoft Teams
Database: 15 custom MySQL tables with complex relationships

Legacy System Limitations:

Monolithic WordPress architecture limiting scalability
Manual data synchronization between systems
Complex custom database schema with 15 interconnected tables
PHP-based backend constraining modern development practices
Limited real-time collaboration capabilities
Maintenance overhead of custom WordPress implementation

Key Legacy Components Being Replaced:

Custom MySQL tables (wp_agent_leads, wp_client_users, etc.)
PHP AJAX handlers for portal operations
WordPress authentication system
Custom timeline tracking and status management
Manual integration management for external services

Migration Benefits
The transition to HubSpot-native architecture addresses critical limitations:
Scalability Improvements:

Serverless architecture for automatic scaling
HubSpot's enterprise-grade infrastructure
Modern React-based frontend for enhanced user experience
API-first design enabling future integrations

Data Management Enhancement:

Elimination of custom database maintenance
Native CRM functionality with built-in reporting
Automated data backup and security through HubSpot
Standardized data models reducing complexity

Development Efficiency:

Modern development stack reducing technical debt
HubSpot's native workflow automation
Reduced integration complexity through HubSpot marketplace
Enhanced developer experience with modern tooling

Technical Migration Scope
This represents a complete architectural overhaul from the existing WordPress-based prototype (documented with 3,000+ lines of JavaScript, 2,000+ lines of PHP, and 15 database tables), transitioning to a modern serverless architecture with HubSpot-native data management, improved separation of concerns between client and agent experiences, and enhanced real-time synchronization capabilities.
The migration preserves all existing functionality while providing a foundation for enhanced features including real-time collaboration, advanced analytics, and streamlined integrations through HubSpot's ecosystem.