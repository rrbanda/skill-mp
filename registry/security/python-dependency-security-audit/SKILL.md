---
name: security:python-dependency-security-audit
description: This skill audits a Python project's dependencies for known security vulnerabilities using common scanning tools. Use it proactively to identify and address potential security risks in Python applications before deployment or during regular security reviews.
version: 1.0.0
license: MIT
compatibility: Requires Python 3.8+ and standard Python package managers (pip, Poetry, Pipenv) for dependency resolution.
allowed-tools: pip-audit safety
---
# Python Dependency Security Audit

Systematic review of Python project dependencies to identify known security vulnerabilities. The goal is to provide **actionable remediation advice** for **proactive risk mitigation**, emphasizing **prioritized findings** over raw vulnerability counts.

## What You'll Need Before Starting

- The **root directory** of the Python project to be audited.
- Confirmation of which **dependency management tool** is used (e.g., `pip` with `requirements.txt`, `Poetry` with `pyproject.toml`/`poetry.lock`, `Pipenv` with `Pipfile`/`Pipfile.lock`).
- An active **Python virtual environment** (or confirmation that one should be created).
- Optional: Any **specific scanner preference** (`pip-audit`, `safety`). If none is provided, `pip-audit` will be used as the default.
- Optional: Context on whether to differentiate between **production and development dependencies**.

## Workflow

**CRITICAL RULES**

1.  Prioritize vulnerabilities by **severity** (Critical, High, Medium, Low) and **exploitability/reachability**, focusing on issues with the highest potential impact on the application's security.
2.  Ground all remediation advice in **specific package versions** or **known patches**, providing clear instructions for the user.
3.  Maintain a balance between strict security posture and **operational feasibility**, suggesting practical steps that integrate with typical Python development workflows.
4.  Always default to using `pip-audit` if no specific scanner is requested, as it integrates directly with the PyPI Advisory Database.

### Step 1: Identify Python Project and Dependency Files

Begin by locating the project's root directory. The primary objective is to identify all relevant Python dependency manifest and lock files. These typically include `requirements.txt` (for `pip`), `pyproject.toml` (for Poetry or PDM), and `Pipfile` (for Pipenv). It is crucial to gather all such files to get a complete picture of the project's dependencies, including those for different environments like development or testing. If multiple files exist (e.g., `requirements/dev.txt` and `requirements/prod.txt`), note them to potentially differentiate between dependency groups during the scan. This comprehensive discovery establishes the precise scope of the audit, ensuring that every third-party component intended for the project is accounted for. If no explicit dependency files are found, you must inform the user and ask for clarification, as a meaningful security audit without a defined dependency list is not feasible.

### Step 2: Prepare Environment and Install Scanner

To ensure an accurate and isolated audit, create or activate a Python virtual environment. This prevents conflicts with global Python packages and accurately reflects the project's dependencies. Within this environment, install the project's dependencies as specified in its manifest files. Following this, install the chosen security scanner. While `pip-audit` is the preferred default due to its direct integration with PyPI advisories and comprehensive reporting, `safety` is another viable option if explicitly requested or if `pip-audit` encounters issues.

This setup ensures that the scanner operates on the exact set of installed packages, minimizing false positives and providing a clear basis for vulnerability detection. Handle any installation failures by reporting them to the user, providing debugging steps if possible.

### Step 3: Execute Dependency Security Scan

With the environment prepared and the scanner installed, proceed to execute the security audit. Utilize the chosen tool (`pip-audit` or `safety`) to scan the installed Python packages within the virtual environment, or directly analyze the specified dependency files if the tool supports it. It is essential to ensure that the scanner is configured to provide detailed output, ideally in a machine-readable format like JSON or an equivalent structured report, to facilitate robust and automated subsequent analysis. This execution generates the raw vulnerability data, effectively identifying packages with known common vulnerabilities and exposures (CVEs) or other security advisories. If the project utilizes distinct dependency sets for development and production, prioritize scanning only the production-relevant dependencies first, before optionally including development ones to focus on the most critical attack surface.

### Step 4: Analyze and Categorize Scan Results

Parse the output from the security scanner to extract and categorize all identified vulnerabilities. For each finding, determine the severity level (Critical, High, Medium, Low) based on the scanner's assessment and, if necessary, cross-reference with public vulnerability databases like NVD or PyPI Advisories. Identify the affected package name, its installed version, the vulnerable version range, the associated CVE ID(s), and a brief summary of the vulnerability.

This analysis transforms raw scan data into actionable intelligence, allowing for prioritization of the most critical issues. Distinguish between direct dependencies (explicitly listed by the user) and transitive dependencies (pulled in by other packages) to provide context for remediation efforts and help in understanding the dependency chain.

### Step 5: Report Vulnerabilities and Remediation Advice

Generate a comprehensive and clear report detailing all identified vulnerabilities. The report should be structured by severity, presenting the most critical issues first. For each vulnerability, include the affected package, its current version, the vulnerable range, the CVE ID, a concise description of the vulnerability, and most importantly, **specific recommended upgrade versions** or other remediation actions (e.g., patching, configuration changes).

Conclude the report with a summary of the overall security posture and broad recommendations for maintaining dependency security, such as regularly performing audits, pinning dependency versions, and staying informed about new advisories. The goal is to provide enough information for the user to understand the risks and implement effective fixes.

## Outputs you should produce

-   A **summary** outlining the total number of vulnerabilities found, categorized by severity (e.g., "3 Critical, 5 High, 10 Medium").
-   A **detailed, structured report** listing each identified vulnerability. For each entry, include:
    -   **Affected Package Name** and its currently **Installed Version**.
    -   The **Vulnerable Version Range**.
    -   Associated **CVE ID(s)** or advisory reference.
    -   **Severity Level** (Critical, High, Medium, Low).
    -   A **Concise Description** of the vulnerability.
    -   **Specific Remediation Advice**, including the **Recommended Fixed Version** (if available) or other actionable steps.
    -   Indication of whether it's a **direct or transitive dependency**.
-   A **concluding section** with strategic recommendations for dependency management and ongoing security hygiene in the Python project.

## Related Skills

-   [security:dependency-auditor](../dependency-auditor/SKILL.md) — For auditing dependencies in projects using non-Python languages or a more generic supply chain risk assessment.
-   [devops:dockerfile-reviewer](../devops/dockerfile-reviewer/SKILL.md) — When the Python application is containerized, use this to review the `Dockerfile` for further supply chain risks and hardening best practices.
-   [docs:code-reviewer](../docs/code-reviewer/SKILL.md) — For a comprehensive code review that includes checking for common security anti-patterns within the Python codebase itself.
-   [security:sast-scanner](../sast-scanner/SKILL.md) — To perform static application security testing directly on the Python source code for deeper vulnerability detection.
-   [devops:ci-pipeline-optimizer](../devops/ci-pipeline-optimizer/SKILL.md) — When integrating dependency security audits into automated CI/CD pipelines for continuous monitoring and rapid response.

## Critical Considerations for Python Audits

-   **Production vs. Development Dependencies**: Always differentiate between dependencies required for production and those solely for development or testing. Focus remediation efforts primarily on production dependencies, as they pose the greatest immediate risk.
-   **Focus on Exploitable Vulnerabilities**: While all vulnerabilities are important, prioritize those that are clearly exploitable in the project's specific context. Tools may report vulnerabilities that are not reachable or exploitable given the project's code path.
-   **Importance of Virtual Environments**: Emphasize the use of virtual environments. Auditing a global Python installation can lead to inaccurate results due to unused packages or version conflicts.
-   **Regular Audits**: Dependency audits are not a one-time task. Advise the user on the importance of integrating regular, automated scans into their development lifecycle to catch newly discovered vulnerabilities.

## Further Resources

-   [pip-audit Documentation](https://pypi.org/project/pip-audit/)
-   [safety Documentation](https://pyup.io/safety/)
-   [PyPI Advisories](https://pypi.org/security/)
-   [National Vulnerability Database (NVD)](https://nvd.nist.gov/)
---