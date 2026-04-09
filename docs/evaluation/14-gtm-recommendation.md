# Phase 5C: Go-to-Market Recommendation

## Three Options Evaluated

### Option A: Upstream Contribution to Agent Skills Spec

**What:** Contribute enterprise lifecycle layers (quality gates, shared contracts, plugin packaging, version management) to the agentskills.io specification.

| Pro | Con |
|---|---|
| Immediate credibility via established community (27+ agents) | Slow consensus process; spec committee may resist complexity |
| No new brand to build | Loss of control over roadmap |
| Direct adoption by Claude Code, Cursor, GitHub Copilot | Enterprise features may not fit the spec's minimalist philosophy |
| Red Hat seen as contributing to open standards | Augment/Kagenti integration would be out of scope |

**Verdict:** Good for Layer 1 (skill specification) but insufficient for Layers 2-5.

### Option B: Standalone Open-Source Project

**What:** Build a new open-source project with its own identity, specification, CLI, and ecosystem.

| Pro | Con |
|---|---|
| Full control over roadmap and design decisions | Must build community from zero |
| Can include enterprise features (Augment, Kagenti) natively | Risk of being "yet another standard" |
| Clear Red Hat branding and leadership | Requires sustained investment in community management |
| Can move fast without consensus process | Competing with Agent Skills spec may fragment ecosystem |

**Verdict:** Maximum flexibility but high community-building cost.

### Option C: Hybrid (RECOMMENDED)

**What:** Align with Agent Skills spec at Layer 1, build proprietary value at Layers 2-5, with RHDH Augment as the flagship enterprise integration.

| Pro | Con |
|---|---|
| Compatible with existing Agent Skills ecosystem | Still need some community building for Layers 2-5 |
| Skills work natively in Claude Code and Cursor (no adapter needed) | Must track Agent Skills spec changes |
| Enterprise value in Layers 2-5 is differentiated and defensible | Two-brand messaging (spec compliance + enterprise features) |
| Augment/Kagenti integration gives concrete enterprise value | Augment plugin is still early-stage |
| Google ADK already reuses Agent Skills spec (alignment validated) | |

**Verdict:** Best balance of ecosystem alignment, differentiation, and enterprise value.

---

## Recommended Go-to-Market: Option C (Hybrid)

### Strategy Summary

1. **Layer 1**: Fully align with Agent Skills spec. Contribute extensions back upstream where appropriate (e.g., namespace convention, progressive disclosure recommendations). Do not fork the spec.

2. **Layer 2-3**: Build as a standalone open-source framework (Apache-2.0). This is where the unique value lives: quality gates, shared contracts, plugin packaging, version management, CLI tooling.

3. **Layer 4**: Build platform adapters as optional modules. Prioritize Claude Code and Cursor (native, zero-effort), then Augment (enterprise value), then ADK and OpenAI (ecosystem reach).

4. **Layer 5**: Build Augment and Kagenti integration as the flagship enterprise feature. This differentiates from every competitor and provides a concrete production deployment story.

### Phased Rollout

#### Phase 1: Open-Source Launch (Month 1-2)

**Goal:** Establish the project and demonstrate cross-platform value.

| Deliverable | Target |
|---|---|
| GitHub repo with Apache-2.0 license | Week 1 |
| CLI: `skills init`, `validate`, `package`, `install` | Week 2 |
| 3 example skills (non-Red Hat) | Week 2 |
| Claude Code + Cursor adapters (extracted) | Week 3 |
| Augment export command | Week 3 |
| ADK adapter | Week 4 |
| Getting started documentation | Week 4 |
| Blog post: "One Skill, Four Platforms" | Week 5 |
| Submit talk to KubeCon/AI conferences | Week 6 |

**Distribution:** npm package (`@agent-skills-framework/cli`), GitHub releases.

#### Phase 2: Community Building (Month 3-4)

**Goal:** Attract early adopters and build community trust.

| Deliverable | Target |
|---|---|
| OpenAI adapter | Month 3 |
| MCP bridge | Month 3 |
| LangChain adapter | Month 3 |
| Kagenti export command | Month 3 |
| Contributing guide + skill template | Month 3 |
| Integration with Open Agent Skill marketplace | Month 4 |
| Second blog post: "Enterprise Agent Skills with RHDH" | Month 4 |
| Community Discord/Slack channel | Month 4 |

#### Phase 3: Enterprise Adoption (Month 5-6)

**Goal:** Demonstrate production value with enterprise customers.

| Deliverable | Target |
|---|---|
| Augment plugin extension module (registerProviderFactory) | Month 5 |
| Kagenti A2A skills router container | Month 5 |
| Enterprise deployment guide (RHDH + Kagenti) | Month 5 |
| Partner pilot (2-3 enterprise teams) | Month 5-6 |
| Case study: RHDP marketplace as reference implementation | Month 6 |
| Upstream Agent Skills spec contributions (extensions) | Month 6 |

### Naming Suggestion

The project needs a name that:
- References its relationship to Agent Skills spec
- Conveys enterprise/production readiness
- Is memorable and searchable

Candidates:
1. **SkillForge** -- "forge" connotes building/crafting; complements (doesn't compete with) OpenForge
2. **SkillKit** -- "kit" implies SDK/toolkit; short and memorable
3. **AgentSkills SDK** -- most descriptive; clear relationship to spec
4. **SkillPack** -- "pack" implies packaging/distribution
5. **SkillOps** -- "ops" implies enterprise lifecycle management

**Recommendation:** **SkillKit** -- short, memorable, clearly implies it's a toolkit for building agent skills. The tagline: "The enterprise SDK for AI agent skills."

### Key Messages by Audience

| Audience | Message |
|---|---|
| **Individual developers** | "Write once, deploy everywhere. SkillKit generates native artifacts for Claude Code, Cursor, OpenAI, ADK, and more." |
| **Team leads** | "Manage your skill portfolio with shared standards, quality gates, and cross-platform distribution." |
| **Platform engineers** | "Deploy skills to RHDH Augment for multi-agent orchestration or Kagenti for Kubernetes-native production." |
| **Open source community** | "Fully aligned with the Agent Skills spec. SkillKit adds the enterprise layers the spec intentionally leaves out." |

### Relationship to RHDP Skills Marketplace

The RHDP Skills Marketplace becomes the **reference implementation** -- the proof that the framework works at scale with real production skills. The RHDP team:
- Continues to maintain their skills as RHDP content
- Adopts the framework CLI for validation and distribution
- Serves as the case study for the enterprise integration story
- Contributes framework improvements back upstream

The framework itself contains no Red Hat branding or content.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Agent Skills spec changes break alignment | Medium | Medium | Track spec closely; contribute to ensure compatibility |
| Augment plugin architecture changes | Medium | High | Augment team is internal; coordinate closely |
| Kagenti is too early for production | Medium | Low | Kagenti integration is optional; Augment works without it |
| Community doesn't adopt | Medium | High | Focus on concrete cross-platform value, not just spec compliance |
| Competitor releases similar framework | Low | Medium | First-mover advantage + enterprise integration is defensible |
| Agent Skills spec adds enterprise features | Low | Medium | Good outcome -- contribute and align rather than compete |

---

## Investment Required

| Resource | Duration | Justification |
|---|---|---|
| 1 Senior engineer (framework development) | 6 months | Core CLI, adapters, and enterprise integration |
| 0.5 DevRel (community + docs) | 6 months | Documentation, blog posts, conference talks |
| 0.25 Product manager (coordination) | 6 months | Roadmap, spec alignment, partner engagement |
| **Total FTE** | **1.75 FTE for 6 months** | |

### ROI Indicators

1. **RHDP team efficiency**: Framework CLI replaces manual install scripts, reducing maintenance
2. **Augment plugin adoption**: Skills become the content that makes Augment valuable to enterprise customers
3. **Red Hat thought leadership**: First enterprise-grade skills framework, aligned with open standards
4. **Community leverage**: External contributors build adapters and skills the team doesn't have to maintain
