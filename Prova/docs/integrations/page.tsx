/**
 * app/docs/integrations/page.tsx — Integration Examples
 */
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Integrations — Prova Docs' }

export default function IntegrationsPage() {
  return (
    <article className="space-y-10">
      <div className="space-y-3">
        <p className="mono text-xs text-muted tracking-widest uppercase">Integrations</p>
        <h1 className="text-3xl font-bold text-text">Integration Examples</h1>
        <p className="text-dim leading-relaxed">
          Prova is a single POST call. These examples show how to wrap it into
          real pipelines — LangGraph, CrewAI, and generic Python and Node.js.
        </p>
      </div>

      <Section title="LangGraph (Python)">
        <p className="mono text-xs text-dim leading-relaxed mb-4">
          Add Prova verification as a node in your LangGraph graph.
          When an agent produces a reasoning chain, pipe it through Prova before
          acting on the decision.
        </p>
        <CodeBlock lang="python">{`import requests
from langgraph.graph import StateGraph

PROVA_API_KEY = "your-api-key"

def prova_verify_node(state):
    """LangGraph node: verify agent reasoning before acting."""
    reasoning = state.get("agent_reasoning", "")
    if not reasoning:
        return state

    response = requests.post(
        "https://api.prova.cobound.dev/verify",
        headers={"Authorization": f"Bearer {PROVA_API_KEY}"},
        json={
            "reasoning": reasoning,
            "retain": True,
            "metadata": {
                "pipeline": "langgraph-agent",
                "node": state.get("current_node", "unknown"),
            },
        },
        timeout=30,
    )
    cert = response.json()

    return {
        **state,
        "prova_verdict": cert["verdict"],
        "prova_certificate_id": cert["certificate_id"],
        "prova_certificate_url": cert["certificate_url"],
        # Optionally block on INVALID:
        "reasoning_valid": cert["verdict"] == "VALID",
    }

# Add to your graph
builder = StateGraph(YourState)
builder.add_node("agent", your_agent_node)
builder.add_node("verify_reasoning", prova_verify_node)
builder.add_node("act", your_action_node)

builder.add_edge("agent", "verify_reasoning")
builder.add_conditional_edges(
    "verify_reasoning",
    lambda s: "act" if s["reasoning_valid"] else "reject",
)

graph = builder.compile()`}</CodeBlock>
      </Section>

      <Section title="CrewAI (Python)">
        <p className="mono text-xs text-dim leading-relaxed mb-4">
          Wrap a CrewAI task result with Prova verification using a custom callback.
        </p>
        <CodeBlock lang="python">{`import requests
from crewai import Task, Crew, Agent

def verify_with_prova(task_output: str, task_name: str = "") -> dict:
    """Verify CrewAI task reasoning output with Prova."""
    resp = requests.post(
        "https://api.prova.cobound.dev/verify",
        headers={"Authorization": "Bearer YOUR_API_KEY"},
        json={
            "reasoning": task_output,
            "metadata": {"task": task_name, "pipeline": "crewai"},
        },
        timeout=30,
    )
    return resp.json()

# After task execution:
crew = Crew(agents=[...], tasks=[...])
result = crew.kickoff()

cert = verify_with_prova(result.raw, task_name="final_recommendation")
print(f"Verdict: {cert['verdict']}")
print(f"Certificate: {cert['certificate_url']}")`}</CodeBlock>
      </Section>

      <Section title="Generic Python pipeline">
        <CodeBlock lang="python">{`import requests
import logging

logger = logging.getLogger(__name__)

class ProvaVerifier:
    """Drop-in Prova verifier for any Python AI pipeline."""

    def __init__(self, api_key: str, pipeline_name: str = ""):
        self.api_key = api_key
        self.pipeline_name = pipeline_name
        self.base_url = "https://api.prova.cobound.dev"

    def verify(
        self,
        reasoning: str,
        domain: str | None = None,
        retain: bool = True,
        raise_on_invalid: bool = False,
    ) -> dict:
        resp = requests.post(
            f"{self.base_url}/verify",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "reasoning": reasoning,
                "retain": retain,
                "metadata": {
                    "pipeline": self.pipeline_name,
                    **({"domain": domain} if domain else {}),
                },
            },
            timeout=30,
        )
        resp.raise_for_status()
        cert = resp.json()

        logger.info(
            "Prova: %s | cert=%s | confidence=%d",
            cert["verdict"],
            cert["certificate_id"],
            cert["confidence_score"],
        )

        if raise_on_invalid and cert["verdict"] == "INVALID":
            raise ValueError(
                f"Reasoning failed Prova check: {cert['failure']['type']} "
                f"at {cert['failure']['location']}. "
                f"Certificate: {cert['certificate_url']}"
            )

        return cert

# Usage
verifier = ProvaVerifier(api_key="sk-...", pipeline_name="loan-approvals")
cert = verifier.verify(
    reasoning=ai_output,
    domain="financial",
    raise_on_invalid=True,  # blocks invalid reasoning from reaching decision
)`}</CodeBlock>
      </Section>

      <Section title="Node.js / TypeScript pipeline">
        <CodeBlock lang="typescript">{`// prova.ts — drop-in verifier for Node.js pipelines

interface ProvaOptions {
  apiKey: string
  pipeline?: string
  domain?: 'medical' | 'legal' | 'financial' | 'code' | 'general'
  retain?: boolean
  raiseOnInvalid?: boolean
}

export async function verifyReasoning(
  reasoning: string,
  options: ProvaOptions
): Promise<{ valid: boolean; certificateUrl: string; certificateId: string }> {
  const response = await fetch('https://api.prova.cobound.dev/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${options.apiKey}\`,
    },
    body: JSON.stringify({
      reasoning,
      retain: options.retain ?? true,
      metadata: {
        pipeline: options.pipeline ?? 'node-pipeline',
        ...(options.domain ? { domain: options.domain } : {}),
      },
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(\`Prova API error: \${err.message}\`)
  }

  const cert = await response.json()

  if (options.raiseOnInvalid && cert.verdict === 'INVALID') {
    throw new Error(
      \`Reasoning failed Prova check: \${cert.failure?.type} — \${cert.certificate_url}\`
    )
  }

  return {
    valid: cert.verdict === 'VALID',
    certificateUrl: cert.certificate_url,
    certificateId: cert.certificate_id,
  }
}

// Usage in your pipeline:
const { valid, certificateUrl } = await verifyReasoning(agentOutput, {
  apiKey: process.env.PROVA_API_KEY!,
  pipeline: 'contract-review',
  domain: 'legal',
  raiseOnInvalid: true,
})`}</CodeBlock>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="mono text-sm font-semibold text-text border-b border-border pb-2">{title}</h2>
      {children}
    </section>
  )
}

function CodeBlock({ lang, children }: { lang: string; children: string }) {
  return (
    <div className="border border-border overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-surface">
        <span className="mono text-xs text-muted">{lang}</span>
      </div>
      <pre className="overflow-x-auto p-4 text-xs mono text-dim leading-relaxed bg-[#0D0D0D]">
        <code>{children.trim()}</code>
      </pre>
    </div>
  )
}
