#!/usr/bin/env bash
set -euo pipefail

API="https://api.prova.cobound.dev/verify"

declare -a CHAINS=(
  "Step 1: The applicant reports annual gross income of \$92,000, verified against two years of tax returns. Step 2: With a monthly gross income of \$7,667, the proposed mortgage payment of \$1,840 represents a debt-to-income ratio of 24%. Step 3: A DTI ratio of 24% falls below our 36% threshold for conventional loan approval. Step 4: The applicant's credit score of 742 exceeds the minimum requirement of 680. Step 5: Since both DTI and credit score meet approval criteria, this application qualifies for standard rate conventional financing."

  "Step 1: Patient presents with sudden onset right lower quadrant abdominal pain beginning 8 hours ago. Step 2: Physical examination reveals rebound tenderness and guarding localized to McBurney's point. Step 3: Complete blood count shows white blood cell count of 14,200 with left shift. Step 4: The combination of RLQ pain at McBurney's point, rebound tenderness, and elevated WBC with left shift meets the Alvarado score threshold of 7 or higher. Step 5: An Alvarado score of 7 or higher indicates high probability of acute appendicitis requiring surgical consultation. Step 6: Therefore, order CT abdomen with contrast and page the on-call surgical team for evaluation."

  "Step 1: Section 12.3 of the employment agreement contains a non-solicitation clause prohibiting contact with company clients for 18 months post-termination. Step 2: The former employee's LinkedIn post directly invited three named clients to follow them to their new firm. Step 3: The LinkedIn post was published 6 months after termination, which falls within the 18-month restriction period. Step 4: Direct invitation to named clients constitutes solicitation under the clause's definition in Section 12.1. Step 5: Therefore, the former employee is in breach of Section 12.3 and the company has grounds to seek injunctive relief."

  "Step 1: Our risk model assigns this portfolio a low-risk rating. Step 2: Because the portfolio is rated low-risk, we allocate minimal capital reserves against it. Step 3: With minimal capital reserves allocated, the portfolio's loss exposure is low. Step 4: Low loss exposure confirms that our risk model correctly assigned a low-risk rating. Step 5: Therefore, we recommend maintaining current positions without hedging."

  "Step 1: The patient reports occasional mild headaches occurring two to three times per month. Step 2: Therefore, the patient should be scheduled for an urgent MRI to rule out glioblastoma."

  "Step 1: The contract explicitly states that all disputes shall be resolved through binding arbitration in New York. Step 2: The contract also states that either party retains the right to file suit in any court of competent jurisdiction. Step 3: The defendant has filed a motion to compel arbitration based on the arbitration clause. Step 4: Based on both the mandatory arbitration requirement and the preserved right to litigate, the court should grant the motion to compel arbitration."
)

declare -a LABELS=(
  "1 — Mortgage DTI/credit approval"
  "2 — Appendicitis Alvarado score"
  "3 — Non-solicitation breach"
  "4 — Circular risk model"
  "5 — Headache → glioblastoma MRI"
  "6 — Arbitration clause contradiction"
)

for i in "${!CHAINS[@]}"; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "TEST ${LABELS[$i]}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  PAYLOAD=$(jq -n --arg r "${CHAINS[$i]}" '{"reasoning": $r}')

  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$API" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [[ "$HTTP_CODE" != "200" ]]; then
    echo "  HTTP $HTTP_CODE"
    echo "$BODY" | jq -r '"  error:   \(.error // "unknown")\n  message: \(.message // .detail // "no message")"' 2>/dev/null || echo "$BODY"
  else
    echo "$BODY" | jq -r \
      '"  verdict:        \(.verdict)
  certificate_id: \(.certificate_id // "n/a")
  confidence:     \(.confidence_score // "n/a")
  nodes:          \(.argument_graph.nodes | length)
  edges:          \(.argument_graph.edges | length)
  failure_type:   \(.failure_type // "none")"'
  fi

  echo ""
done
