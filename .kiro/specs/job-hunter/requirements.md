# Requirements Document

## Introduction

Job Hunter is a MERN web application that automates the discovery, ranking, and
preparation of job applications for the user, while keeping the user in control of the
final submission (assisted-apply, "Option A"). The system continuously fetches job
listings from legal, official sources (public job-board APIs and RSS/Atom feeds), scores
them against the user's resume/profile, optionally generates tailored application
documents, and surfaces strong matches through a dashboard and alerts.

This tool does not scrape platforms that prohibit automated access (e.g., LinkedIn) and
does not auto-submit applications on third-party platforms.

## Glossary

- **Profile**: Structured representation of the user's resume (skills, experience,
  titles, locations, preferences).
- **Source**: A legal, configurable origin of job listings (API or RSS feed).
- **Listing**: A single fetched job posting, normalized to a common schema.
- **Match score**: A numeric score (0-100) describing how well a listing fits the profile.
- **Strong match**: A listing whose match score meets or exceeds the configured threshold.

## Requirements

### Requirement 1: Resume/Profile ingestion

**User Story:** As a job seeker, I want to upload my base resume and have it parsed into a
structured profile, so that the system can match jobs against my actual skills and
experience.

#### Acceptance Criteria
1. WHEN the user uploads a resume file (PDF) THEN the system SHALL extract text and parse
   it into structured fields (name, contact, skills, experience, titles, locations).
2. WHEN parsing cannot confidently extract a field THEN the system SHALL leave it empty
   and allow the user to fill it manually.
3. WHEN the user edits profile fields in the dashboard THEN the system SHALL persist the
   changes to the database.
4. WHERE a profile already exists THEN the system SHALL allow re-uploading a resume to
   update it without losing manually entered preferences.
5. IF the uploaded file is not a supported format THEN the system SHALL reject it with a
   clear error message.

### Requirement 2: Configurable job search preferences

**User Story:** As a job seeker, I want to define my search preferences (titles, keywords,
locations, remote/onsite, salary floor), so that the system fetches and ranks relevant
jobs only.

#### Acceptance Criteria
1. WHEN the user sets search preferences THEN the system SHALL persist them and use them
   for subsequent fetches and scoring.
2. WHERE no preferences are set THEN the system SHALL derive sensible defaults from the
   parsed profile (e.g., current title and skills).
3. WHEN the user updates preferences THEN the system SHALL apply them on the next fetch
   cycle without requiring a restart.

### Requirement 3: Legal job-source fetching on a schedule

**User Story:** As a job seeker, I want the system to automatically fetch new job listings
from legal sources on a regular schedule, so that I do not have to search manually.

#### Acceptance Criteria
1. THE system SHALL fetch listings only from configured legal sources (official APIs and
   public RSS/Atom feeds).
2. WHEN a scheduled fetch cycle runs THEN the system SHALL query each enabled source using
   the user's preferences and store new listings normalized to a common schema.
3. IF a fetched listing is a duplicate of an existing one THEN the system SHALL NOT create
   a duplicate record.
4. WHILE a source is rate-limited or returns an error THEN the system SHALL log the issue,
   skip that source for the cycle, and continue with other sources.
5. THE system SHALL NOT fetch from or scrape any source that prohibits automated access
   in its Terms of Service.
6. WHERE a source requires an API key that is not configured THEN the system SHALL disable
   that source and continue without failing the whole cycle.

### Requirement 4: Matching and ranking

**User Story:** As a job seeker, I want each fetched job scored and ranked against my
profile, so that I can focus on the best-fit opportunities first.

#### Acceptance Criteria
1. WHEN a new listing is stored THEN the system SHALL compute a match score (0-100)
   against the user's profile and preferences.
2. THE match score SHALL consider at least: skill overlap, title relevance, and location/
   remote preference.
3. WHEN listings are displayed THEN the system SHALL sort them by match score descending.
4. WHERE a listing's score meets or exceeds the configured strong-match threshold THEN the
   system SHALL mark it as a strong match.

### Requirement 5: Dashboard review and application tracking

**User Story:** As a job seeker, I want a dashboard to review ranked matches and track the
status of each application, so that I stay organized and in control.

#### Acceptance Criteria
1. WHEN the user opens the dashboard THEN the system SHALL display listings ranked by match
   score with key details (title, company, location, score, source, posted date, link).
2. WHEN the user clicks a listing THEN the system SHALL show full details and a direct link
   to apply on the original source.
3. WHEN the user changes a listing's status (e.g., new, saved, applied, rejected,
   interview) THEN the system SHALL persist that status.
4. THE dashboard SHALL allow filtering by status, source, and minimum match score.
5. THE system SHALL NOT submit any application automatically; the user performs the apply
   action on the source site.

### Requirement 6: Optional AI-tailored documents

**User Story:** As a job seeker, I want the system to optionally generate a tailored resume
and cover letter for a selected job, so that I can apply faster with relevant materials.

#### Acceptance Criteria
1. WHERE an LLM provider API key is configured THEN the system SHALL offer to generate a
   tailored resume and cover letter for a selected listing.
2. WHERE no LLM provider is configured THEN the system SHALL hide or disable the tailoring
   feature without errors.
3. WHEN tailored documents are generated THEN the system SHALL let the user review, edit,
   and download them.
4. THE system SHALL NOT send generated documents anywhere automatically.

### Requirement 7: Alerts for strong matches

**User Story:** As a job seeker, I want to be notified when a strong match appears, so that
I can act quickly without constantly checking the dashboard.

#### Acceptance Criteria
1. WHEN a new strong match is stored THEN the system SHALL send a notification through the
   configured channel(s) (email, and optionally Telegram).
2. WHERE no notification channel is configured THEN the system SHALL record the match in
   the dashboard only, without failing.
3. THE system SHALL NOT send more than one notification per listing.

### Requirement 8: Configuration and secrets handling

**User Story:** As the operator of the tool, I want all secrets and source configuration
handled via environment variables, so that nothing sensitive is committed and sources can
be toggled easily.

#### Acceptance Criteria
1. THE system SHALL read all API keys, credentials, and connection strings from environment
   variables.
2. THE system SHALL provide a `.env.example` listing required variable names without values.
3. WHERE a required environment variable is missing THEN the system SHALL fail fast at
   startup with a clear message for core config (e.g., database), and degrade gracefully
   for optional integrations (e.g., disable that source/feature).
