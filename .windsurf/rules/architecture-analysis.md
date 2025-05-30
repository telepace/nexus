---
trigger: model_decision
description: 
globs: 
---
# Project Architecture Analysis Rules

## 1. Entry Point Analysis
- Application entry point localization

## 2. Core Module Identification
- Key Module Identification
  - Analyze directory structure
  - Review documentation
  - Identify core functional modules (e.g., authentication, data storage, API, etc.)

- Module Responsibility Analysis
  - Determine the main function of each module
  - Clarify responsibility boundaries
  - Document dependencies between modules

## 3. Dependency Relationship Analysis
- Static Analysis
  - Use IDE's "Find Usages" feature
  - Use "Go to Definition" feature
  - Run dependency analysis tools (e.g., `npm list`, `pipdeptree`)

- Interface Analysis
  - Check APIs for module interactions
  - Analyze function signatures
  - Review message formats

## 4. Data Flow Analysis
- Request Flow Tracking
  - Track requests from entry points
  - Record data transformation processes
  - Analyze storage locations

- Business Process Analysis
  - Identify core business processes
  - Track data flow
  - Record state changes

## 5. Architecture Documentation
- Create Architecture Diagrams
  - Module relationship diagrams
  - Data flow diagrams
  - Dependency diagrams

- Write Architecture Descriptions
  - Document key design decisions
  - Explain module responsibilities
  - Describe interface specifications 