# Infrastructure & Provider Selection

## Context

Small startup optimizing for runway. Running spire (Node.js/SQLite chat server) on VMs — no Kubernetes. Need team/org RBAC as the team grows. Want the cheapest viable option with good Terraform support. Must have US data center presence.

---

## Provider Comparison

### Pricing: 4 vCPU / 8 GB RAM / NVMe SSD

| Provider | Plan | Monthly Cost | Notes |
|---|---|---|---|
| **Hetzner** | CX33 (shared AMD) | **~$7.50** | Post-April 2026 pricing. Still 6–8x cheaper than everything else. |
| **OVHcloud** | VPS Comfort 4/8 | **~$27** | VPS line. Public Cloud instances (B2-15) are ~$50. |
| **Vultr** | Regular Compute 4/8 | **$40** | High Performance (NVMe, newer CPUs) is $48. |
| **Linode/Akamai** | Shared 8GB | **$48** | Dedicated plan is $72. |
| **DigitalOcean** | Premium Intel 4/8 | **$56** | NVMe, per-second billing since Jan 2026. |
| **UpCloud** | GP 4vCPU/8GB | **~$61** | MaxIOPS storage (proprietary fast SSD). |

### Team/Org RBAC

This is the critical filter. Every provider below supports adding team members — but the depth varies significantly.

| Provider | Model | Granularity | Verdict |
|---|---|---|---|
| **Hetzner** | Project-scoped members | 3 roles: Owner, Admin, Member. Per-project. | Sufficient for small team. Basic. |
| **OVHcloud** | IAM with local users, groups, policies | Resource-level policies, grouping. | Strong. More setup complexity. |
| **Vultr** | ACL-based permission flags per user | 13 permission flags (subscriptions, billing, dns, firewall, etc.). **Account-wide, not resource-scoped.** | Functional for role separation. No per-resource isolation. Use Sub-Accounts for env isolation. |
| **Linode/Akamai** | User permissions + IAM (Limited Availability) | Granular per-resource. Full IAM model rolling out. | Very good. IAM is maturing. |
| **DigitalOcean** | Teams + custom RBAC roles (July 2025) | Predefined + custom roles with fine-grained perms. | Best in class for this tier. |
| **UpCloud** | Subaccounts + tag-based resource access | Per-resource or per-tag scoping. No groups/policies. | Functional but manual. |

#### Vultr RBAC Detail

Vultr's multi-user system uses flat ACL flags — not named roles. You toggle individual permissions per user:

| Permission | Grants |
|---|---|
| `manage_users` | Full user management (effectively root) |
| `subscriptions_view` | Read-only view of all instances |
| `subscriptions` | Create, modify, destroy instances |
| `provisioning` | Deploy new instances (requires `subscriptions`) |
| `billing` | View/manage billing and payment |
| `support` | Open/manage support tickets |
| `dns` | Manage DNS domains and records |
| `firewall` | Manage firewall groups/rules |
| `loadbalancer` | Manage load balancers |
| `objstore` | Manage object storage |
| `abuse` | Handle abuse reports |
| `upgrade` | Account-level upgrades |
| `alerts` | Configure monitoring alerts |

**Key limitation**: Permissions are account-wide, not resource-scoped. If a user has `subscriptions`, they can manage *all* instances. No "read-only prod, write-access staging" natively. Use **Sub-Accounts** (separate billing + resource namespaces) as a workaround for environment isolation.

Each sub-user gets their own API key scoped to their ACL permissions — good for automation.

### Terraform Provider Quality

| Provider | Registry | Maturity | Notes |
|---|---|---|---|
| **Hetzner** | [`hetznercloud/hcloud`](https://registry.terraform.io/providers/hetznercloud/hcloud/latest) | Excellent | Official partner. Covers all resources. Active community. |
| **DigitalOcean** | [`digitalocean/digitalocean`](https://registry.terraform.io/providers/digitalocean/digitalocean/latest) | Best in class | Gold standard for budget providers. |
| **Vultr** | [`vultr/vultr`](https://registry.terraform.io/providers/vultr/vultr/latest) | Mature | v2.30+, 64 releases, full resource coverage. Official. |
| **Linode/Akamai** | [`linode/linode`](https://registry.terraform.io/providers/linode/linode/latest) | Mature | v3.0.0 as of June 2025. |
| **OVHcloud** | [`ovh/ovh`](https://registry.terraform.io/providers/ovh/ovh/latest) | Functional | Requires 3 separate API keys. More complex setup. |
| **UpCloud** | [`UpCloudLtd/upcloud`](https://registry.terraform.io/providers/UpCloudLtd/upcloud/latest) | Good | HashiCorp Verified provider. |

### Managed Services

| Provider | Managed Postgres | Managed Redis/Valkey | Object Storage (S3) | Load Balancer |
|---|---|---|---|---|
| **Hetzner** | **No** | **No** | Yes | Yes |
| **OVHcloud** | Yes (Public Cloud) | Yes (Valkey) | Yes | Yes |
| **Vultr** | Yes | Yes (Valkey) | Yes | Yes |
| **Linode/Akamai** | Yes | Yes (Valkey) | Yes | Yes |
| **DigitalOcean** | Yes | Yes (Valkey) | Yes (Spaces) | Yes |
| **UpCloud** | Yes | Yes | Yes | Yes |

Hetzner's lack of managed databases is its biggest gap. Not a problem while on SQLite, but matters if/when migrating to Postgres. Vultr has the full managed services stack at a lower price point than DO or Linode.

### Bandwidth

| Provider | Included | Overage | Notes |
|---|---|---|---|
| **Hetzner** | 20 TB/mo (EU) | $1/TB | Singapore gets 0.5–8 TB. |
| **OVHcloud** | Unlimited (VPS) | Free | Speed-capped by plan. Best bandwidth deal. |
| **UpCloud** | Fair use (1–24 TB) | Free (throttled) | Throttled to 100 Mbit/s on overage. |
| **Vultr** | 4–6 TB/mo + 2 TB free account-level | $10/TB | Globally pooled across all instances. |
| **Linode/Akamai** | 5 TB/mo | $5/TB | Pooled across team. |
| **DigitalOcean** | 5 TB/mo | $10/TB | Pooled across Droplets. |

### Data Center Locations

| Provider | US | EU | Asia | Other |
|---|---|---|---|---|
| **Hetzner** | Ashburn, Hillsboro | Nuremberg, Falkenstein, Helsinki | Singapore | — |
| **OVHcloud** | US, Canada | FR, DE, UK, PL, IT | SG, AU, IN | — |
| **Vultr** | Atlanta, Chicago, Dallas, Honolulu, LA, Miami, NYC, SF Bay, Seattle | Amsterdam, Frankfurt, London, Manchester, Madrid, Paris, Stockholm, Warsaw | Tokyo, Osaka, Seoul, Singapore, Mumbai, Delhi, Bangalore, Sydney, Melbourne | São Paulo, Santiago, Mexico City, Tel Aviv, Johannesburg |
| **Linode/Akamai** | Newark, Atlanta, Dallas, Fremont, Toronto | London, Frankfurt, Amsterdam, Milan, Paris, Stockholm | Mumbai, SG, Sydney, Tokyo, Osaka, Chennai | São Paulo |
| **DigitalOcean** | NYC, SF, Toronto | Amsterdam, Frankfurt, London | SG, Bangalore, Sydney | — |
| **UpCloud** | **No** | FI, SE, NO, DK, DE, NL, ES, PL, UK | SG | — |

Vultr has the widest global footprint by far — 32 regions across 6 continents, including locations no other budget provider covers (Seoul, Johannesburg, Santiago, Mexico City, Honolulu).

---

## Recommendation

### For a startup optimizing for runway

**Primary: Hetzner Cloud**

- A 4 vCPU / 8 GB server costs **$7.50/month**. That's not a typo.
- Terraform provider is excellent.
- Project-scoped RBAC (Owner/Admin/Member) is enough for a team of 2–10.
- 20 TB egress included covers any realistic chat server load.
- US data centers available (Ashburn, Hillsboro).
- The missing managed databases don't matter while on SQLite. When the time comes to add Postgres/Redis, either self-host on a second Hetzner VM or evaluate Ubicloud-on-Hetzner.

**Monthly cost estimate for spire on Hetzner:**

| Resource | Spec | Monthly |
|---|---|---|
| VM (spire server) | CX33, 4 vCPU / 8 GB | $7.50 |
| Volume (SQLite data) | 20 GB SSD | ~$1.00 |
| Load Balancer | LB11 (25 connections) | ~$6.50 |
| Backups | Automated VM snapshots | ~$1.50 |
| **Total** | | **~$16.50/month** |

For comparison, the same on DigitalOcean would be ~$70–80/month. On Vultr ~$55–65/month. On AWS, easily $100+.

When you need a second server (Phase 3 from scalability.md), add another CX33 for $7.50. Your two-server setup with load balancer costs ~$24/month.

### If you need managed databases + wide global presence

**Fallback: Vultr**

- $40–48/month for compute (Regular vs High Performance).
- Full managed services: Postgres, Valkey, load balancers, object storage.
- 32 data centers across 6 continents — widest coverage in this tier.
- RBAC is account-wide ACL flags (not resource-scoped), but functional for small teams. Use Sub-Accounts for environment isolation.
- Mature Terraform provider with full coverage.
- Good middle ground between Hetzner's low cost and DO's polish.

**Monthly cost estimate for spire on Vultr:**

| Resource | Spec | Monthly |
|---|---|---|
| VM (spire server) | High Performance 4/8 | $48.00 |
| Load Balancer | Basic | ~$10.00 |
| Backups | Automated snapshots | ~$5.00 |
| **Total** | | **~$63/month** |

### If RBAC is the top priority

**Fallback: DigitalOcean**

- $56/month for compute, but best-in-class developer experience.
- Custom RBAC roles (July 2025) — most granular permission system in this tier.
- Excellent Terraform, full managed service catalog.
- NYC/SF data centers.
- Higher cost, but you'll never need to migrate providers — DO has everything.

---

## Cost Estimation with Infracost

### The Problem

[Infracost](https://github.com/infracost/infracost) is the standard tool for Terraform cost estimation, but it **only supports AWS, Azure, and GCP**. It covers ~1,100 resource types across those three providers — but Hetzner, Vultr, OVHcloud, UpCloud, Linode, and every other budget provider are completely unsupported. All `hcloud_*`, `vultr_*`, etc. resources are silently skipped.

There is no ETA for custom provider support. The Infracost team has discussed a "provider plugin model" similar to Terraform's ([#2911](https://github.com/infracost/infracost/issues/2911)), but nothing has shipped. A proposed `monthly_cost_dollars` field for manual cost overrides ([#1271](https://github.com/infracost/infracost/discussions/1271)) was never implemented either.

### What Infracost Can Still Do For You

Even without native provider support, Infracost is useful if you ever add AWS/Azure/GCP resources (e.g., S3 for file storage, CloudFront for CDN, SES for email). The CLI is free (Apache 2.0, 1,000 runs/month with a free API key, no credit card required). Key commands:

```bash
# Show cost breakdown of current Terraform
infracost breakdown --path .

# Show cost diff between current and planned changes
infracost diff --path . --compare-to infracost-base.json

# Post cost comment on a GitHub PR
infracost comment github --path infracost.json --pull-request $PR --repo $REPO --github-token $TOKEN

# Show skipped (unsupported) resources — useful as a manual checklist
infracost breakdown --path . --show-skipped
```

The `--show-skipped` flag lists every resource Infracost can't price — use this as your checklist for what to track separately.

### Usage Files (For Supported Providers Only)

If you have AWS/Azure/GCP resources with variable pricing (Lambda invocations, DynamoDB throughput, S3 storage), the `infracost-usage.yml` file lets you specify expected usage:

```yaml
# Only works for AWS/Azure/GCP resources
resource_type_default_usage:
  aws_lambda_function:
    monthly_requests: 100000
    request_duration_ms: 250
  aws_s3_bucket:
    storage_gb: 1000

resource_usage:
  aws_dynamodb_table.messages:
    monthly_write_request_units: 500000
    monthly_read_request_units: 1000000
```

```bash
infracost breakdown --path . --usage-file infracost-usage.yml
```

**This does not work for custom resource types.** You cannot add `hcloud_server` or `vultr_instance` entries — they'll be ignored.

### OPA Cost Policies (For Supported Providers Only)

Infracost integrates with [Open Policy Agent](https://www.infracost.io/docs/integrations/open_policy_agent/) to enforce cost guardrails in CI. Policies are Rego rules that evaluate Infracost's JSON output:

```rego
package infracost

deny[out] {
  maxDiff = 500.0
  diffCost := to_number(input.diffTotalMonthlyCost)
  diffCost >= maxDiff
  out := {
    "msg": sprintf("Monthly cost increase must be < $%.2f (actual: $%.2f)", [maxDiff, diffCost]),
    "failed": true
  }
}
```

Again, this only evaluates costs for resources Infracost understands. Hetzner/Vultr resources are invisible to OPA because they never appear in the JSON.

### The Practical Approach: Hybrid Cost Tracking

Since Infracost can't price budget providers, build a two-layer system:

**Layer 1 — Infracost for AWS/Azure/GCP (if any)**

Run Infracost normally for any supported resources. Even if your primary infra is Hetzner, you might use AWS S3, CloudFront, SES, etc.

**Layer 2 — Custom pricing file for budget providers**

Maintain a YAML pricing table versioned alongside your Terraform code:

```yaml
# infra/pricing.yaml
# Updated: 2026-03-04
# Provider: Hetzner Cloud (post-April 2026 pricing)
# Source: https://www.hetzner.com/cloud

compute:
  cx22:  { vcpu: 2,  ram_gb: 4,  monthly: 4.49 }
  cx33:  { vcpu: 4,  ram_gb: 8,  monthly: 6.49 }
  cx44:  { vcpu: 8,  ram_gb: 16, monthly: 14.99 }
  cx55:  { vcpu: 16, ram_gb: 32, monthly: 29.99 }

storage:
  volume_per_gb: 0.052  # per GB/month

load_balancer:
  lb11: { connections: 25,   monthly: 5.99 }
  lb21: { connections: 250,  monthly: 14.99 }
  lb31: { connections: 500,  monthly: 29.99 }

network:
  egress_per_tb: 1.00    # EUR, after 20 TB included
  floating_ip:   4.49    # per month

backups:
  percentage: 0.20  # 20% of server price
```

**Layer 3 — A script that reads Terraform state + pricing YAML**

Parse `terraform show -json` to find your resources, look up costs from the YAML, and output a total:

```bash
#!/usr/bin/env bash
# estimate-cost.sh — reads Terraform plan and prices from YAML

set -euo pipefail

PLAN_JSON=$(terraform show -json tfplan)
PRICING_FILE="infra/pricing.yaml"

# Extract hcloud_server resources and their server_type
SERVERS=$(echo "$PLAN_JSON" | jq -r '
  [.values.root_module.resources[]
   | select(.type == "hcloud_server")
   | .values.server_type] | .[]')

TOTAL=0
for server_type in $SERVERS; do
  cost=$(yq ".compute.${server_type}.monthly" "$PRICING_FILE")
  echo "  hcloud_server ($server_type): €${cost}/mo"
  TOTAL=$(echo "$TOTAL + $cost" | bc)
done

# Volumes
VOLUME_GB=$(echo "$PLAN_JSON" | jq '[.values.root_module.resources[]
  | select(.type == "hcloud_volume") | .values.size] | add // 0')
VOL_RATE=$(yq '.storage.volume_per_gb' "$PRICING_FILE")
VOL_COST=$(echo "$VOLUME_GB * $VOL_RATE" | bc)
echo "  hcloud_volume (${VOLUME_GB} GB): €${VOL_COST}/mo"
TOTAL=$(echo "$TOTAL + $VOL_COST" | bc)

# Load balancers
LBS=$(echo "$PLAN_JSON" | jq -r '[.values.root_module.resources[]
  | select(.type == "hcloud_load_balancer")
  | .values.load_balancer_type] | .[]')
for lb_type in $LBS; do
  cost=$(yq ".load_balancer.${lb_type}.monthly" "$PRICING_FILE")
  echo "  hcloud_load_balancer ($lb_type): €${cost}/mo"
  TOTAL=$(echo "$TOTAL + $cost" | bc)
done

echo ""
echo "Estimated monthly total: €${TOTAL}"
```

Run in CI alongside Infracost:

```yaml
# .github/workflows/cost.yml
- name: Infracost (AWS/Azure/GCP)
  run: infracost breakdown --path . --format json --out-file infracost.json

- name: Custom cost estimate (Hetzner)
  run: ./infra/estimate-cost.sh

- name: Post PR comment
  run: |
    # Combine both outputs into PR comment
    infracost comment github --path infracost.json --pull-request ${{ github.event.pull_request.number }} ...
    # Append custom estimate as a separate comment or merge into the Infracost JSON
```

**Layer 4 (optional) — Merge into Infracost JSON**

If you want a single unified cost view, you can inject synthetic entries into Infracost's JSON format and pass the combined file to `infracost output`:

```bash
# Build synthetic Infracost-format JSON for Hetzner resources
jq -n --arg cost "$TOTAL" '{
  version: "0.2",
  projects: [{
    name: "hetzner",
    breakdown: {
      totalMonthlyCost: $cost,
      resources: [
        # ... build resource entries matching Infracost schema
      ]
    }
  }]
}' > infracost-hetzner.json

# Merge with native Infracost output
infracost output --path "infracost.json" --path "infracost-hetzner.json" --format table
```

The `infracost output` command accepts multiple `--path` flags and merges them into a single view.

### Why This Is Actually Better

Budget providers like Hetzner have simple, transparent pricing — that's *why* they're cheaper. You're not dealing with 47 pricing dimensions like AWS. A flat YAML file with instance type -> monthly cost covers 90% of estimation, and it's more accurate than any automated tool because you can factor in:

- Hetzner's included traffic allowances (20 TB vs AWS's 100 GB)
- Hourly-capped-at-monthly billing (never pay more than monthly even if you run hourly)
- Volume discounts or special pricing you've negotiated
- The actual EUR/USD exchange rate you're billed at

When the provider changes prices, update one YAML file. Version it in git. Review it in PRs. Done.

---

## Decision Matrix

| If you need... | Go with... | Why |
|---|---|---|
| Absolute minimum cost | **Hetzner** | 6–8x cheaper than alternatives |
| Managed DBs + global presence | **Vultr** | Full managed stack, 32 regions, reasonable price |
| Strong RBAC from day one | **DigitalOcean** | Custom roles with fine-grained perms |
| Managed Postgres + Redis (budget) | **Vultr** or **Linode** | Cheaper than DO with full managed catalog |
| US + EU + Asia + LatAm + Africa | **Vultr** | Only budget provider with 6-continent coverage |
| Unlimited bandwidth | **OVHcloud** | Zero egress fees, speed-capped |
| Best developer experience | **DigitalOcean** | Best API, best Terraform, best docs |
| Most global coverage (established) | **Linode/Akamai** | Akamai edge network, 16+ DCs, mature |

---

See also: [scalability.md](scalability.md) for the SQLite → Postgres scaling path, [config.md](../reference/config.md) for environment variable setup.
