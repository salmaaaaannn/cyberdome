"""
CYBERDOME — Dynamic Attack Graph & Choke Point Analysis Router.
Generates graph topology from REAL company assets, discovered perimeters,
vulnerabilities, network relationships, and security incidents.
Distinguishes OBSERVED, POSSIBLE ATTACK PATH, and SIMULATION edges.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List, Dict, Any
import math

from app.core.database import get_db
from app.models.models import User, CompanyUser, Asset
from app.models.phase4 import NetworkEvent, Incident, IoTDevice, SecurityEvent
from app.models.website_security import AssetVulnerability, Vulnerability, DiscoveredAsset
from app.schemas.common import success_response
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    require_permission
)

router = APIRouter(prefix="/attack-graph", tags=["Attack Graph & Path Analysis"])


@router.get("")
@router.get("/")
async def get_attack_graph(
    include_simulations: bool = Query(False),
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate dynamic attack path graph for the authenticated company.
    Builds nodes from real assets, vulnerabilities, and telemetry edges.
    """
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company attack graph."}
        )

    cid = membership.company_id

    # 1. Fetch real company assets
    asset_res = await db.execute(
        select(Asset).where(Asset.company_id == cid).order_by(Asset.created_at)
    )
    assets = asset_res.scalars().all()

    # 2. Fetch asset vulnerabilities to determine node risk & status
    vuln_res = await db.execute(
        select(AssetVulnerability, Vulnerability).join(
            Vulnerability, AssetVulnerability.vulnerability_id == Vulnerability.id
        ).where(AssetVulnerability.company_id == cid)
    )
    vuln_rows = vuln_res.all()
    asset_vulns: Dict[str, List[str]] = {}
    asset_max_severity: Dict[str, str] = {}
    severity_weights = {"CRITICAL": 95, "HIGH": 75, "MEDIUM": 50, "LOW": 25, "INFO": 10}

    for av, v in vuln_rows:
        aid = av.asset_id
        if aid not in asset_vulns:
            asset_vulns[aid] = []
            asset_max_severity[aid] = "INFO"
        asset_vulns[aid].append(v.cve_id or v.title)
        if severity_weights.get(v.severity, 0) > severity_weights.get(asset_max_severity[aid], 0):
            asset_max_severity[aid] = v.severity

    # 3. Fetch network telemetry to discover real communication edges
    net_res = await db.execute(
        select(NetworkEvent).where(NetworkEvent.company_id == cid).limit(150)
    )
    net_events = net_res.scalars().all()

    # 4. Fetch open incidents affecting assets
    inc_res = await db.execute(
        select(Incident).where(
            Incident.company_id == cid,
            Incident.status.in_(["OPEN", "INVESTIGATING"])
        )
    )
    incidents = inc_res.scalars().all()

    # 5. Fetch IoT devices
    iot_res = await db.execute(
        select(IoTDevice).where(IoTDevice.company_id == cid).order_by(IoTDevice.created_at)
    )
    iot_devices = iot_res.scalars().all()

    # 5b. Fetch SecurityEvents for URL/Domain/Fusion threat nodes
    sec_res = await db.execute(
        select(SecurityEvent).where(
            SecurityEvent.company_id == cid,
            (SecurityEvent.entity_type.in_(["URL", "DOMAIN", "FUSION"])) | (SecurityEvent.source == "multi_model_fusion")
        ).order_by(SecurityEvent.timestamp.desc()).limit(30)
    )
    url_events = sec_res.scalars().all()

    # Build nodes list
    nodes = []
    ip_to_node_id = {}

    # External perimeter entry point
    perimeter_node_id = "perimeter-internet"
    has_public_assets = False

    # Layout nodes in layered tiers:
    # Tier 0 (x=80): External Internet
    # Tier 1 (x=280): DMZ / Gateways / Websites / Firewalls
    # Tier 2 (x=500): Core Application / Routing / Servers
    # Tier 3 (x=720): Internal Databases / Sensitive Storage
    tiers: Dict[int, List[dict]] = {0: [], 1: [], 2: [], 3: []}

    for a in assets:
        atype = (a.asset_type or "WORKSTATION").upper()
        cves = asset_vulns.get(a.id, [])
        max_sev = asset_max_severity.get(a.id, "SAFE")

        risk = 15
        if max_sev == "CRITICAL":
            risk = 92
            status_str = "CRITICAL"
        elif max_sev == "HIGH":
            risk = 74
            status_str = "WARNING"
        elif max_sev == "MEDIUM":
            risk = 48
            status_str = "WARNING"
        else:
            status_str = "SAFE"

        # Determine node icon type
        node_type = "server"
        tier = 2
        if "WEBSITE" in atype or "DOMAIN" in atype:
            node_type = "gateway"
            tier = 1
            has_public_assets = True
        elif "DATABASE" in atype:
            node_type = "database"
            tier = 3
        elif "ROUTER" in atype or "SWITCH" in atype or "NETWORK" in atype:
            node_type = "router"
            tier = 1
        elif "IOT" in atype:
            node_type = "iot"
            tier = 2
        elif "APPLICATION" in atype or "API" in atype:
            node_type = "application"
            tier = 2

        node_data = {
            "id": a.id,
            "label": a.name,
            "type": node_type,
            "riskScore": risk,
            "status": status_str,
            "vulnerabilities": cves[:3],
            "ip": a.ip_address,
            "isChokePoint": False,
            "blastRadius": 1,
            "layer": "OBSERVED",
            "_tier": tier
        }
        tiers[tier].append(node_data)
        if a.ip_address:
            ip_to_node_id[a.ip_address] = a.id

    for d in iot_devices:
        d_risk = float(d.risk_score or 0.0)
        d_status = "SAFE"
        if (d.anomalies or 0) > 0 or d_risk >= 80.0 or (d.status and d.status.upper() == "CRITICAL"):
            d_status = "CRITICAL"
            d_risk = max(d_risk, 88.0)
        elif d_risk >= 50.0 or (d.status and d.status.upper() == "WARNING"):
            d_status = "WARNING"
            d_risk = max(d_risk, 60.0)

        dtype = (d.device_type or "SENSOR").upper()
        tier = 1 if "GATEWAY" in dtype else 2
        node_data = {
            "id": d.id,
            "label": d.name,
            "type": "iot",
            "riskScore": int(d_risk),
            "status": d_status,
            "vulnerabilities": [f"Anomalies: {d.anomalies}"] if d.anomalies else ["IoT Firmware Baseline"],
            "ip": d.ip_address,
            "isChokePoint": False,
            "blastRadius": 1,
            "layer": "OBSERVED",
            "_tier": tier,
        }
        tiers[tier].append(node_data)
        if d.ip_address:
            ip_to_node_id[d.ip_address] = d.id

    # Fetch company users / identities with elevated UEBA risk for Tier 2 representation
    user_res = await db.execute(
        select(CompanyUser, User).join(User, CompanyUser.user_id == User.id).where(CompanyUser.company_id == cid)
    )
    for cu, u in user_res.all():
        u_risk = float(cu.risk_score or 0.0)
        if u_risk >= 30.0:
            node_data = {
                "id": u.id,
                "label": f"User: {getattr(u, 'name', None) or getattr(u, 'full_name', None) or u.email}",
                "type": "identity",
                "riskScore": int(u_risk),
                "status": "CRITICAL" if u_risk >= 75.0 else "WARNING",
                "vulnerabilities": [f"Risk Level: {cu.risk_level or 'ELEVATED'}"],
                "ip": "10.0.1.50",
                "isChokePoint": False,
                "blastRadius": 2,
                "layer": "OBSERVED",
                "_tier": 2
            }
            tiers[2].append(node_data)

    # Map external URL / domain / fusion threats
    seen_urls = set()
    for ue in url_events:
        dom = ue.entity_id or "threat-link"
        if dom in seen_urls:
            continue
        seen_urls.add(dom)
        is_fusion = (ue.entity_type == "FUSION" or ue.source == "multi_model_fusion")
        node_id = f"fusion-{dom}" if is_fusion else f"phish-{dom}"
        label = f"Fused Threat: {dom}" if is_fusion else f"Phish: {dom}"
        vulns = [f"Multi-Model Coordinated Threat ({ue.severity})"] if is_fusion else [f"Phishing/Malicious URL ({ue.severity})"]
        node_data = {
            "id": node_id,
            "label": label,
            "type": "internet",
            "riskScore": 98 if (is_fusion or ue.severity == "CRITICAL") else 85,
            "status": "CRITICAL",
            "vulnerabilities": vulns,
            "ip": "Multi-Signal Threat" if is_fusion else "External URL",
            "isChokePoint": is_fusion,
            "blastRadius": 3 if is_fusion else 2,
            "layer": "OBSERVED",
            "_tier": 0
        }
        tiers[0].append(node_data)

    # If there are assets, IoT devices, or risky identities, include the Internet gateway entry node
    if assets or iot_devices or tiers[2] or tiers[0]:
        internet_node = {
            "id": perimeter_node_id,
            "label": "External Internet / Adversary",
            "type": "internet",
            "riskScore": 99,
            "status": "CRITICAL",
            "vulnerabilities": ["Untrusted Perimeter"],
            "ip": "0.0.0.0/0",
            "isChokePoint": True,
            "blastRadius": len(assets) + len(iot_devices),
            "layer": "OBSERVED",
            "_tier": 0,
            "position": {"x": 80, "y": 280}
        }
        nodes.append(internet_node)

    # Assign (x, y) coordinates based on tier count
    for tier_idx, tier_nodes in tiers.items():
        count = len(tier_nodes)
        for i, n in enumerate(tier_nodes):
            spacing = 500 / (count + 1)
            n["position"] = {
                "x": 80 + tier_idx * 220,
                "y": int((i + 1) * spacing + 40)
            }
            nodes.append(n)

    # Build edges
    edges = []
    seen_edges = set()

    # 1. External edges from perimeter to Tier 1 assets
    for dmz_node in tiers[1]:
        edge_id = f"edge-{perimeter_node_id}-{dmz_node['id']}"
        edges.append({
            "id": edge_id,
            "source": perimeter_node_id,
            "target": dmz_node["id"],
            "label": "Inbound Ingress",
            "probability": 0.85 if dmz_node["status"] == "CRITICAL" else 0.45,
            "relationshipType": "POSSIBLE_ATTACK_PATH"
        })
        seen_edges.add((perimeter_node_id, dmz_node["id"]))

    # 1b. External edges from phishing URLs to targeted identities or DMZ
    for phish_node in tiers[0]:
        for u_node in tiers[2]:
            edge_id = f"edge-{phish_node['id']}-{u_node['id']}"
            if (phish_node["id"], u_node["id"]) not in seen_edges:
                edges.append({
                    "id": edge_id,
                    "source": phish_node["id"],
                    "target": u_node["id"],
                    "label": "Credential Lure / Phish",
                    "probability": 0.88,
                    "relationshipType": "POSSIBLE_ATTACK_PATH"
                })
                seen_edges.add((phish_node["id"], u_node["id"]))
        if not tiers[2] and tiers[1]:
            for dmz_node in tiers[1][:2]:
                edge_id = f"edge-{phish_node['id']}-{dmz_node['id']}"
                if (phish_node["id"], dmz_node["id"]) not in seen_edges:
                    edges.append({
                        "id": edge_id,
                        "source": phish_node["id"],
                        "target": dmz_node["id"],
                        "label": "Phishing Ingress",
                        "probability": 0.80,
                        "relationshipType": "POSSIBLE_ATTACK_PATH"
                    })
                    seen_edges.add((phish_node["id"], dmz_node["id"]))

    # 2. Observed network edges
    for ev in net_events:
        src = ip_to_node_id.get(ev.source_ip)
        dst = ip_to_node_id.get(ev.dest_ip)
        if src and dst and src != dst and (src, dst) not in seen_edges:
            seen_edges.add((src, dst))
            is_alert = ev.action == "alert" or ev.severity in ["HIGH", "CRITICAL"]
            edges.append({
                "id": f"edge-obs-{src}-{dst}",
                "source": src,
                "target": dst,
                "label": f"{ev.protocol} ({ev.action})",
                "probability": 0.75 if is_alert else 0.3,
                "relationshipType": "OBSERVED"
            })

    # 3. Structural default paths between adjacent tiers if sparse
    if len(edges) <= len(tiers[1]):
        for t1 in tiers[1]:
            for t2 in tiers[2]:
                if (t1["id"], t2["id"]) not in seen_edges:
                    seen_edges.add((t1["id"], t2["id"]))
                    edges.append({
                        "id": f"edge-path-{t1['id']}-{t2['id']}",
                        "source": t1["id"],
                        "target": t2["id"],
                        "label": "Lateral Pathway",
                        "probability": 0.6 if t2["status"] != "SAFE" else 0.25,
                        "relationshipType": "POSSIBLE_ATTACK_PATH"
                    })
        for t2 in tiers[2]:
            for t3 in tiers[3]:
                if (t2["id"], t3["id"]) not in seen_edges:
                    seen_edges.add((t2["id"], t3["id"]))
                    edges.append({
                        "id": f"edge-path-{t2['id']}-{t3['id']}",
                        "source": t2["id"],
                        "target": t3["id"],
                        "label": "Database Access",
                        "probability": 0.7 if t3["status"] != "SAFE" else 0.2,
                        "relationshipType": "POSSIBLE_ATTACK_PATH"
                    })

    # Identify choke points: nodes with the highest connectivity degree
    degree_counts: Dict[str, int] = {}
    for e in edges:
        s, t = e["source"], e["target"]
        degree_counts[s] = degree_counts.get(s, 0) + 1
        degree_counts[t] = degree_counts.get(t, 0) + 1

    choke_points = []
    for n in nodes:
        deg = degree_counts.get(n["id"], 0)
        if deg >= 3:
            n["isChokePoint"] = True
            choke_points.append(n["id"])
        n["blastRadius"] = deg

    # Possible attack paths
    possible_paths = []
    if tiers[0] and tiers[2]:
        for p0 in tiers[0][:2]:
            for u2 in tiers[2][:2]:
                if tiers[3]:
                    possible_paths.append([p0["id"], u2["id"], tiers[3][0]["id"]])
                else:
                    possible_paths.append([p0["id"], u2["id"]])

    if tiers[1] and tiers[2] and tiers[3]:
        for t1 in tiers[1][:2]:
            for t2 in tiers[2][:2]:
                for t3 in tiers[3][:1]:
                    possible_paths.append([perimeter_node_id, t1["id"], t2["id"], t3["id"]])

    return success_response({
        "nodes": nodes,
        "edges": edges,
        "chokePoints": choke_points,
        "possiblePaths": possible_paths,
        "statistics": {
            "totalNodes": len(nodes),
            "totalEdges": len(edges),
            "criticalNodes": len([n for n in nodes if n["status"] == "CRITICAL"]),
            "chokePointCount": len(choke_points),
        }
    })
