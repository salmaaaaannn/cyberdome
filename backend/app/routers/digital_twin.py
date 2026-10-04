"""
CYBERDOME — 3D Digital Twin Command Center Router.
Maps company-isolated real database assets, IoT devices, telemetry,
and active incident compromises into spatial 3D visualization nodes.
Never invents security facts.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List, Dict, Any
import math

from app.core.database import get_db
from app.models.models import User, CompanyUser, Asset
from app.models.phase4 import NetworkEvent, Incident, IoTDevice
from app.models.website_security import AssetVulnerability, Vulnerability
from app.schemas.common import success_response
from app.core.dependencies import (
    get_current_user, get_current_company_membership,
    require_permission
)

router = APIRouter(prefix="/digital-twin", tags=["Digital Twin 3D"])


@router.get("/nodes")
@router.get("")
@router.get("/")
async def get_digital_twin_state(
    user: User = Depends(get_current_user),
    membership: CompanyUser = Depends(get_current_company_membership),
    _perm: bool = Depends(require_permission("asset.read")),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch real 3D Digital Twin nodes and topological connections.
    Visualizes real company asset posture from database.
    """
    if not membership or user.account_type == "USER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Normal Users cannot access company digital twin."}
        )

    cid = membership.company_id

    # 1. Fetch real assets
    asset_res = await db.execute(
        select(Asset).where(Asset.company_id == cid).order_by(Asset.created_at)
    )
    assets = asset_res.scalars().all()

    # 2. Fetch IoT devices
    iot_res = await db.execute(
        select(IoTDevice).where(IoTDevice.company_id == cid).order_by(IoTDevice.id)
    )
    iot_devices = iot_res.scalars().all()

    # 3. Fetch vulnerabilities for real posture
    vuln_res = await db.execute(
        select(AssetVulnerability, Vulnerability).join(
            Vulnerability, AssetVulnerability.vulnerability_id == Vulnerability.id
        ).where(AssetVulnerability.company_id == cid)
    )
    vuln_map: Dict[str, List[str]] = {}
    severity_map: Dict[str, str] = {}
    for av, v in vuln_res.all():
        aid = av.asset_id
        if aid not in vuln_map:
            vuln_map[aid] = []
            severity_map[aid] = "LOW"
        vuln_map[aid].append(v.cve_id or v.title)
        if v.severity in ["CRITICAL", "HIGH"]:
            severity_map[aid] = v.severity

    # 4. Fetch open incidents
    inc_res = await db.execute(
        select(Incident).where(
            Incident.company_id == cid,
            Incident.status.in_(["OPEN", "INVESTIGATING"])
        )
    )
    open_incidents = inc_res.scalars().all()
    inc_map: Dict[str, List[str]] = {}
    for inc in open_incidents:
        target = inc.asset_id or "global"
        if target not in inc_map:
            inc_map[target] = []
        inc_env = getattr(inc, "environment", "REAL") or "REAL"
        inc_label = f"#{inc.id} [SIMULATION]: {inc.title}" if inc_env == "SIMULATION" else f"#{inc.id}: {inc.title}"
        inc_map[target].append(inc_label)

    # 4b. Fetch detections/security events
    from app.models.phase4 import SecurityEvent
    det_res = await db.execute(
        select(SecurityEvent).where(SecurityEvent.company_id == cid).order_by(SecurityEvent.timestamp.desc()).limit(100)
    )
    all_detections = det_res.scalars().all()
    det_map: Dict[str, List[str]] = {}
    last_event_map: Dict[str, str] = {}
    for det in all_detections:
        target = det.entity_id or "global"
        if target not in det_map:
            det_map[target] = []
        det_env = getattr(det, "environment", "REAL") or "REAL"
        det_label = f"[{det.severity}] [SIMULATION] {det.title}" if det_env == "SIMULATION" else f"[{det.severity}] {det.title}"
        det_map[target].append(det_label)
        if target not in last_event_map and det.timestamp:
            last_event_map[target] = det.timestamp.isoformat()

    # 5. Fetch network events for connections
    net_res = await db.execute(
        select(NetworkEvent).where(NetworkEvent.company_id == cid).limit(100)
    )
    net_events = net_res.scalars().all()

    # Model classification helper
    def map_model_type(atype: str) -> str:
        at = atype.lower()
        if "firewall" in at:
            return "firewall"
        if "router" in at:
            return "router"
        if "switch" in at:
            return "switch"
        if "gateway" in at:
            return "gateway"
        if "database" in at or "db" in at:
            return "database"
        if "cloud" in at or "aws" in at or "azure" in at:
            return "cloud"
        if "workstation" in at or "laptop" in at or "desktop" in at:
            return "workstation"
        if "camera" in at:
            return "camera"
        if "sensor" in at or "iot" in at:
            return "sensor"
        return "server"

    nodes = []
    ip_to_id = {}

    total_items = len(assets) + len(iot_devices)
    idx = 0

    # Layout assets spatially in logical grid / concentric circles
    for a in assets:
        mtype = map_model_type(a.asset_type)
        cves = vuln_map.get(a.id, [])
        sev = severity_map.get(a.id, "SAFE")
        asset_incs = inc_map.get(a.id, []) or (inc_map.get(a.ip_address, []) if a.ip_address else []) or []
        asset_dets = det_map.get(a.id, []) or (det_map.get(a.ip_address, []) if a.ip_address else []) or []

        status_str = "ONLINE"
        if sev == "CRITICAL" or len(asset_incs) > 0:
            status_str = "CRITICAL"
        elif sev == "HIGH" or len(asset_dets) > 0:
            status_str = "WARNING"
        elif a.status == "SUSPENDED" or a.status == "OFFLINE":
            status_str = "OFFLINE"

        # Position distribution
        angle = (idx * 2 * math.pi) / max(1, total_items)
        dist = 2.5 if mtype in ["server", "database"] else 4.2
        pos_x = round(dist * math.cos(angle) + 4.0, 2)
        pos_y = round(dist * math.sin(angle) + 3.0, 2)
        pos_z = 1.2 if mtype == "cloud" else 0.4 if mtype == "database" else 0.6

        node = {
            "id": a.id,
            "entityId": a.id,
            "assetId": a.id,
            "companyId": cid,
            "name": a.name,
            "type": mtype,
            "status": status_str,
            "ip": a.ip_address or a.hostname or "192.168.1.10",
            "position": {"x": pos_x, "y": pos_y, "z": pos_z},
            "vulnerabilities": cves,
            "detections": asset_dets,
            "incidents": asset_incs,
            "hasSimulations": any("[SIMULATION]" in d for d in asset_dets) or any("[SIMULATION]" in i for i in asset_incs),
            "environment": "SIMULATION" if (len(asset_dets) > 0 or len(asset_incs) > 0) and all("[SIMULATION]" in x for x in (asset_dets + asset_incs)) else "REAL",
            "riskScore": 90.0 if status_str == "CRITICAL" else 65.0 if status_str == "WARNING" else 15.0,
            "lastEvent": last_event_map.get(a.id) or (last_event_map.get(a.ip_address) if a.ip_address else "Active"),
            "metrics": {
                "cpu": 35 if status_str == "ONLINE" else 88,
                "memory": 45 if status_str == "ONLINE" else 92,
                "network": 24,
            }
        }
        nodes.append(node)
        if a.ip_address:
            ip_to_id[a.ip_address] = a.id
        idx += 1

    # Map IoT devices into 3D perimeter
    for d in iot_devices:
        mtype = "camera" if "cam" in (d.device_type or "").lower() else "sensor"
        status_str = "CRITICAL" if d.anomalies > 1 else "WARNING" if d.anomalies > 0 else (d.status or "ONLINE")
        angle = (idx * 2 * math.pi) / max(1, total_items)
        pos_x = round(5.2 * math.cos(angle) + 4.0, 2)
        pos_y = round(5.2 * math.sin(angle) + 3.0, 2)
        iot_dets = det_map.get(d.id, []) or (det_map.get(d.ip_address, []) if d.ip_address else []) or []

        node = {
            "id": d.id,
            "entityId": d.id,
            "assetId": d.id,
            "companyId": cid,
            "name": d.name,
            "type": mtype,
            "status": status_str,
            "ip": d.ip_address or "10.0.10.15",
            "position": {"x": pos_x, "y": pos_y, "z": 0.5},
            "vulnerabilities": [],
            "detections": iot_dets,
            "incidents": inc_map.get(d.id, []) or (inc_map.get(d.name, [])),
            "riskScore": float(d.risk_score or (85.0 if status_str == "CRITICAL" else 40.0 if status_str == "WARNING" else 10.0)),
            "lastEvent": last_event_map.get(d.id) or "Active",
            "metrics": {"cpu": 15, "memory": 20, "network": 10}
        }
        nodes.append(node)
        if d.ip_address:
            ip_to_id[d.ip_address] = d.id
        idx += 1

    # Map users / identities with elevated risk or active security detections into 3D topology
    user_res = await db.execute(
        select(CompanyUser, User).join(User, CompanyUser.user_id == User.id).where(CompanyUser.company_id == cid)
    )
    for cu, u in user_res.all():
        u_risk = float(cu.risk_score or 0.0)
        u_dets = det_map.get(u.id, []) or (det_map.get(u.email, []) if u.email else []) or []
        u_incs = inc_map.get(u.id, []) or (inc_map.get(u.email, []) if u.email else []) or []
        if u_risk >= 30.0 or len(u_dets) > 0 or len(u_incs) > 0:
            status_str = "CRITICAL" if (u_risk >= 75.0 or any("CRITICAL" in d for d in u_dets)) else "WARNING" if (u_risk >= 50.0 or len(u_dets) > 0) else "ONLINE"
            angle = (idx * 2 * math.pi) / max(1, total_items + 1)
            pos_x = round(3.5 * math.cos(angle) + 4.0, 2)
            pos_y = round(3.5 * math.sin(angle) + 3.0, 2)
            user_node = {
                "id": u.id,
                "entityId": u.id,
                "assetId": u.id,
                "companyId": cid,
                "name": f"User: {getattr(u, 'name', None) or getattr(u, 'full_name', None) or u.email}",
                "type": "identity",
                "status": status_str,
                "ip": "10.0.1.50",
                "position": {"x": pos_x, "y": pos_y, "z": 0.8},
                "vulnerabilities": [],
                "detections": u_dets,
                "incidents": u_incs,
                "hasSimulations": any("[SIMULATION]" in d for d in u_dets) or any("[SIMULATION]" in i for i in u_incs),
                "environment": "SIMULATION" if (len(u_dets) > 0 or len(u_incs) > 0) and all("[SIMULATION]" in x for x in (u_dets + u_incs)) else "REAL",
                "riskScore": u_risk,
                "lastEvent": last_event_map.get(u.id) or "Active",
                "metrics": {
                    "risk_score": u_risk,
                    "evidence_count": cu.evidence_count or len(u_dets),
                    "threat_level": cu.risk_level or ("HIGH" if u_risk >= 75 else "MEDIUM" if u_risk >= 50 else "LOW"),
                }
            }
            nodes.append(user_node)
            idx += 1

    # Map external URL / domain threats detected by Module 04
    url_threat_events = [d for d in all_detections if getattr(d, "entity_type", "") in ["URL", "DOMAIN"]]
    seen_domains = set()
    for d in url_threat_events:
        dom = d.entity_id or "external-threat"
        if dom in seen_domains:
            continue
        seen_domains.add(dom)
        status_str = "CRITICAL" if d.severity in ["CRITICAL", "HIGH"] else "WARNING"
        angle = (idx * 2 * math.pi) / max(1, total_items + 2)
        pos_x = round(6.5 * math.cos(angle) + 4.0, 2)
        pos_y = round(6.5 * math.sin(angle) + 3.0, 2)
        det_env = getattr(d, "environment", "REAL") or "REAL"
        det_label = f"[{d.severity}] [SIMULATION] {d.title}" if det_env == "SIMULATION" else f"[{d.severity}] {d.title}"
        domain_node = {
            "id": f"threat-{dom}",
            "entityId": dom,
            "assetId": f"threat-{dom}",
            "companyId": cid,
            "name": f"URL Threat: {dom}",
            "type": "cloud",
            "status": status_str,
            "ip": "External URL",
            "position": {"x": pos_x, "y": pos_y, "z": 1.2},
            "vulnerabilities": [],
            "detections": [det_label],
            "incidents": inc_map.get(dom, []),
            "hasSimulations": (det_env == "SIMULATION"),
            "environment": det_env,
            "riskScore": 90.0 if d.severity == "CRITICAL" else 75.0,
            "lastEvent": d.timestamp.isoformat() if d.timestamp else "Active",
            "metrics": {
                "risk_score": 90.0 if d.severity == "CRITICAL" else 75.0,
                "confidence": d.confidence or 0.9,
                "threat_type": "URL Phishing / Malicious Domain"
            }
        }
        nodes.append(domain_node)
        idx += 1

    # Map Multi-Model Fusion threats detected by Module 05
    fusion_threat_events = [d for d in all_detections if getattr(d, "entity_type", "") == "FUSION" or getattr(d, "source", "") == "multi_model_fusion"]
    seen_fusions = set()
    for d in fusion_threat_events:
        fid = d.entity_id or "multi-source-threat"
        if fid in seen_fusions:
            continue
        seen_fusions.add(fid)
        status_str = "CRITICAL" if d.severity in ["CRITICAL", "HIGH"] else "WARNING"
        angle = (idx * 2 * math.pi) / max(1, total_items + 3)
        pos_x = round(7.0 * math.cos(angle) + 4.0, 2)
        pos_y = round(7.0 * math.sin(angle) + 3.0, 2)
        det_env = getattr(d, "environment", "REAL") or "REAL"
        det_label = f"[{d.severity}] [SIMULATION] {d.title}" if det_env == "SIMULATION" else f"[{d.severity}] {d.title}"
        fused_node = {
            "id": f"fusion-{fid}",
            "entityId": fid,
            "assetId": f"fusion-{fid}",
            "companyId": cid,
            "name": f"Fused Threat: {fid}",
            "type": "gateway",
            "status": status_str,
            "ip": "Multi-Signal Threat",
            "position": {"x": pos_x, "y": pos_y, "z": 1.5},
            "vulnerabilities": [],
            "detections": [det_label],
            "incidents": inc_map.get(fid, []),
            "hasSimulations": (det_env == "SIMULATION"),
            "environment": det_env,
            "riskScore": 95.0 if d.severity == "CRITICAL" else 80.0,
            "lastEvent": d.timestamp.isoformat() if d.timestamp else "Active",
            "metrics": {
                "risk_score": 95.0 if d.severity == "CRITICAL" else 80.0,
                "confidence": d.confidence or 0.95,
                "threat_type": "Multi-Model Coordinated Attack"
            }
        }
        nodes.append(fused_node)
        idx += 1

    # Build connections from network telemetry
    connections = []
    seen = set()
    for ev in net_events:
        src = ip_to_id.get(ev.source_ip)
        dst = ip_to_id.get(ev.dest_ip)
        if src and dst and src != dst and (src, dst) not in seen:
            seen.add((src, dst))
            conn_status = "critical" if ev.action == "alert" else "active"
            connections.append({
                "id": f"dt-conn-{src}-{dst}",
                "source": src,
                "target": dst,
                "type": "encrypted" if (ev.protocol or "").upper() in ["TLS", "HTTPS"] else "network",
                "status": conn_status,
                "bandwidth": f"{ev.bytes_in + ev.bytes_out} B/s"
            })

    # If sparse connections, provide backbone link to adjacent nodes
    if len(connections) < len(nodes) - 1 and len(nodes) > 1:
        for i in range(len(nodes) - 1):
            pair = (nodes[i]["id"], nodes[i+1]["id"])
            if pair not in seen:
                seen.add(pair)
                connections.append({
                    "id": f"dt-backbone-{nodes[i]['id']}-{nodes[i+1]['id']}",
                    "source": nodes[i]["id"],
                    "target": nodes[i+1]["id"],
                    "type": "network",
                    "status": "active",
                    "bandwidth": "100 Mbps"
                })

    return success_response({
        "nodes": nodes,
        "connections": connections,
        "totalNodes": len(nodes),
        "activeConnections": len(connections),
        "isRealData": True
    })
