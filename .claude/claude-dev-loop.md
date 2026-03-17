# Engineering Development Loop

You have full access to the repository.

Your role is to continuously evolve the product using a structured engineering workflow.

You must follow the development loop defined below.

Do NOT implement random changes without analysis.

---

# Development Loop

Every iteration must follow this exact process:

1. Repository Audit
2. Improvement Proposal
3. Implementation Plan
4. Code Implementation
5. Refactor and Cleanup
6. Documentation Update

Only proceed to the next step after completing the previous one.

---

# Step 1 – Repository Audit

Analyze the entire repository and identify:

• architectural issues  
• duplicated code  
• poor component structure  
• missing abstractions  
• UI inconsistencies  
• performance problems  

Produce a short audit report describing the most important issues.

Focus especially on:

Dashboard implementation  
Subscription management  
UI components  
Services layer  
State management  

---

# Step 2 – Improvement Proposal

Based on the audit, propose improvements grouped into:

Architecture  
UI / UX  
Features  
Performance  
Developer Experience

Limit proposals to **5–8 meaningful improvements per iteration**.

Each improvement should include:

problem  
impact  
solution  

Example:

Problem:
SubscriptionTable mixes UI and business logic.

Impact:
Hard to maintain and test.

Solution:
Move data manipulation logic to services layer.

---

# Step 3 – Implementation Plan

Create a concrete plan for implementing the selected improvements.

Include:

files to modify  
files to create  
components to refactor  

Example format:

Task 1  
Refactor Dashboard layout

Files:
src/pages/Dashboard.tsx  
src/components/StatCard.tsx

---

Task 2  
Create reusable ChartCard component

Files:
src/components/ui/ChartCard.tsx

---

# Step 4 – Code Implementation

Implement the improvements.

Rules:

• avoid breaking existing functionality  
• reuse components whenever possible  
• maintain consistent naming conventions  
• keep UI components presentational  
• mantain and evolve api-documentation, swagger if exists

Business logic should be placed in:

services/ or hooks/

---

# Step 5 – Refactor and Cleanup

After implementing new code:

• remove duplicated code  
• simplify component structure  
• standardize UI patterns  

Ensure all cards and dashboard widgets use the same layout conventions.

---

# Step 6 – Documentation Update

Update documentation when needed.

This includes:

README.md  
component descriptions  
architecture notes  

The README should reflect the current state of the project.

---

# UI Consistency Rules

All dashboard cards must follow a consistent design.

Card style:

rounded-xl  
padding-20  
shadow-sm  
dark background  

Card structure:

Title  
Primary Metric  
Secondary Information  
Optional Chart or Icon

Reusable components must be preferred over repeated layouts.

---

# Code Quality Standards

Always follow these principles:

Single responsibility per component

Reusable UI components

Business logic outside UI

Readable variable naming

Minimal duplication

---

# Output Format

For every development iteration produce:

1. Audit summary
2. Proposed improvements
3. Implementation plan
4. Code changes

Do not skip steps.

---

# Final Objective

The final product should feel like a modern SaaS analytics platform.

Track, analyze and optimize your SaaS stack.