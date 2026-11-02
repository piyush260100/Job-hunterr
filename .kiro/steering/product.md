# Product Overview

## What this is
Job Hunter is a MERN application that helps the user find and apply to relevant jobs
faster. It continuously fetches job listings from **legal, official sources** (public
job-board APIs and RSS feeds), ranks them against the user's resume/profile, generates
tailored application documents, and surfaces strong matches via a dashboard and alerts.

This is an **assisted-apply** tool (Option A). The user performs the final "apply"
action. The tool automates discovery, ranking, and document preparation, not the act of
submitting applications on third-party platforms.

## Core value
- Automate the tedious parts of job hunting: searching, filtering, ranking, tailoring.
- Keep the user in control of the final submission.
- Fast, near-real-time match alerts without risking the user's accounts.

## Primary user
A software engineer (currently: full-stack / MERN) looking for relevant roles with
minimal manual searching.

## Key capabilities
1. Resume/profile ingestion (parse base resume into structured data).
2. Scheduled fetching from configurable, legal job sources.
3. Matching engine that scores jobs against the profile.
4. Optional AI-tailored resume + cover letter per job (pluggable, off by default).
5. Dashboard to review ranked matches and track application status.
6. Alerts (email, optional Telegram) for strong matches.
