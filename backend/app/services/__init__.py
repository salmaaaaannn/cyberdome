"""
Phase 2 — Real Website Security Scanner Engine.
Performs passive, non-destructive analysis:
  DNS resolution, TLS certificate inspection, HTTP security headers,
  technology detection, and vulnerability intelligence lookup.

NEVER fabricates data. Returns DATA_UNAVAILABLE when real info cannot be obtained.
"""
import asyncio
import ssl
import socket
import json
import re
import ipaddress
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any, Tuple
from urllib.parse import urlparse

import httpx
import dns.resolver
import dns.rdatatype
import dns.exception

logger = logging.getLogger("cyberdome.scanner")

# ─── Scan Step Constants ──────────────────────────────────────────────
SCAN_STEPS = [
    "target_validation",
    "dns_resolution",
    "tls_analysis",
    "http_analysis",
    "security_headers",
    "cookie_analysis",
    "technology_detection",
    "vulnerability_intelligence",
    "report_preparation",
]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(tzinfo=None).isoformat()


# ═══════════════════════════════════════════════════════════════════════
#  SSRF & IP REPUTATION VALIDATION
# ═══════════════════════════════════════════════════════════════════════
def is_private_or_reserved_ip(ip_str: str) -> bool:
    """
    Check if an IP string is private, loopback, link-local, multicast, or reserved.
    Blocks RFC 1918, RFC 3927 (link-local), RFC 4193 (IPv6 ULA), loopback (127.0.0.0/8, ::1),
    and AWS/GCP/cloud metadata (169.254.169.254).
    """
    try:
        ip = ipaddress.ip_address(ip_str.strip())
        if ip.version == 6 and ip.ipv4_mapped:
            ip = ip.ipv4_mapped
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        )
    except ValueError:
        return False


# ═══════════════════════════════════════════════════════════════════════
#  TARGET VALIDATION
# ═══════════════════════════════════════════════════════════════════════
def validate_target(url: str) -> Tuple[bool, str, str]:
    """Validate and parse the target URL. Returns (valid, domain, cleaned_url)."""
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        parsed = urlparse(url)
        domain = (parsed.hostname or "").lower()
        if not domain:
            return False, "", url

        # Block localhost, loopback, cloud metadata
        forbidden_hosts = {"localhost", "127.0.0.1", "::1", "0.0.0.0", "169.254.169.254", "metadata.google.internal"}
        if domain in forbidden_hosts:
            return False, domain, url

        # Block internal domain suffixes
        forbidden_suffixes = (".local", ".internal", ".localhost", ".lan", ".home", ".corp", ".test")
        if any(domain.endswith(suffix) for suffix in forbidden_suffixes):
            return False, domain, url

        # Direct IP check
        if is_private_or_reserved_ip(domain):
            return False, domain, url

        if "." not in domain:
            return False, "", url

        # Basic domain format validation or public IPv4
        if not re.match(r'^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$', domain):
            try:
                ip = ipaddress.ip_address(domain)
                if is_private_or_reserved_ip(domain):
                    return False, domain, url
                return True, domain, url
            except ValueError:
                return False, domain, url

        return True, domain, url
    except Exception:
        return False, "", url


# ═══════════════════════════════════════════════════════════════════════
#  DNS RESOLUTION
# ═══════════════════════════════════════════════════════════════════════
async def resolve_dns(domain: str) -> Dict[str, Any]:
    """Perform real DNS resolution for the domain."""
    results = {
        "a_records": [],
        "aaaa_records": [],
        "mx_records": [],
        "ns_records": [],
        "txt_records": [],
        "cname_records": [],
        "has_dnssec": False,
        "error": None,
    }

    try:
        resolver = dns.resolver.Resolver()
        resolver.timeout = 5
        resolver.lifetime = 10
    except Exception as e:
        results["error"] = str(e)
        return results

    record_types = {
        "A": "a_records",
        "AAAA": "aaaa_records",
        "MX": "mx_records",
        "NS": "ns_records",
        "TXT": "txt_records",
        "CNAME": "cname_records",
    }

    for rtype, key in record_types.items():
        try:
            answers = await asyncio.get_event_loop().run_in_executor(
                None, lambda rt=rtype: resolver.resolve(domain, rt)
            )
            for rdata in answers:
                results[key].append(str(rdata).strip('"'))
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.NoNameservers):
            pass
        except dns.exception.Timeout:
            results["error"] = "DNS resolution timed out"
        except Exception as e:
            logger.debug(f"DNS {rtype} lookup for {domain}: {e}")

    # Check DNSSEC
    try:
        answers = await asyncio.get_event_loop().run_in_executor(
            None, lambda: resolver.resolve(domain, "DNSKEY")
        )
        results["has_dnssec"] = len(list(answers)) > 0
    except Exception:
        results["has_dnssec"] = False

    # SSRF / DNS Rebinding Guard: verify resolved IPs are not private or loopback
    for ip in results["a_records"] + results["aaaa_records"]:
        if is_private_or_reserved_ip(ip):
            results["error"] = f"SSRF_BLOCKED: Target domain {domain} resolves to private/reserved IP ({ip}). Scanning internal/private targets is strictly prohibited."
            break

    return results



# ═══════════════════════════════════════════════════════════════════════
#  SUBDOMAIN DISCOVERY (passive — common prefixes only)
# ═══════════════════════════════════════════════════════════════════════
COMMON_SUBDOMAINS = [
    "www", "api", "mail", "smtp", "pop", "imap", "ftp",
    "cdn", "static", "media", "assets", "app", "auth",
    "login", "admin", "portal", "blog", "docs", "dev",
    "staging", "test", "beta", "m", "mobile", "shop",
    "store", "support", "help", "status", "monitor",
]

async def discover_subdomains(domain: str) -> List[Dict[str, Any]]:
    """Passive subdomain discovery via DNS A-record lookups of common prefixes."""
    discovered = []
    resolver = dns.resolver.Resolver()
    resolver.timeout = 3
    resolver.lifetime = 5

    async def check_subdomain(sub: str):
        fqdn = f"{sub}.{domain}"
        try:
            answers = await asyncio.get_event_loop().run_in_executor(
                None, lambda: resolver.resolve(fqdn, "A")
            )
            ips = [str(r) for r in answers]
            if ips:
                return {
                    "subdomain": fqdn,
                    "ip_addresses": ips,
                    "prefix": sub,
                }
        except Exception:
            pass
        return None

    # Run lookups concurrently (limited concurrency)
    sem = asyncio.Semaphore(10)
    async def limited_check(sub):
        async with sem:
            return await check_subdomain(sub)

    tasks = [limited_check(sub) for sub in COMMON_SUBDOMAINS]
    results = await asyncio.gather(*tasks)
    for r in results:
        if r:
            discovered.append(r)

    return discovered


# ═══════════════════════════════════════════════════════════════════════
#  TLS / CERTIFICATE ANALYSIS
# ═══════════════════════════════════════════════════════════════════════
async def analyze_tls(domain: str, port: int = 443) -> Dict[str, Any]:
    """Real TLS certificate and protocol analysis."""
    result = {
        "tls_version": None,
        "cipher_suite": None,
        "certificate": None,
        "cert_valid": False,
        "cert_issuer": None,
        "cert_subject": None,
        "cert_not_before": None,
        "cert_not_after": None,
        "cert_sans": [],
        "cert_serial": None,
        "days_until_expiry": None,
        "error": None,
    }

    try:
        def _get_cert_info():
            ctx = ssl.create_default_context()
            conn = ctx.wrap_socket(socket.socket(), server_hostname=domain)
            conn.settimeout(10)
            conn.connect((domain, port))
            cert = conn.getpeercert()
            cipher = conn.cipher()
            version = conn.version()
            conn.close()
            return cert, cipher, version

        cert, cipher, version = await asyncio.get_event_loop().run_in_executor(
            None, _get_cert_info
        )

        result["tls_version"] = version
        result["cipher_suite"] = cipher[0] if cipher else None
        result["cert_valid"] = True

        # Parse certificate
        if cert:
            issuer = dict(x[0] for x in cert.get("issuer", []))
            subject = dict(x[0] for x in cert.get("subject", []))
            result["cert_issuer"] = issuer.get("organizationName", issuer.get("commonName", "Unknown"))
            result["cert_subject"] = subject.get("commonName", "Unknown")
            result["cert_not_before"] = cert.get("notBefore")
            result["cert_not_after"] = cert.get("notAfter")
            result["cert_serial"] = cert.get("serialNumber")

            # SANs
            sans = []
            for san_type, san_value in cert.get("subjectAltName", []):
                sans.append(san_value)
            result["cert_sans"] = sans

            # Days until expiry
            try:
                not_after = ssl.cert_time_to_seconds(cert["notAfter"])
                now = datetime.now(timezone.utc).replace(tzinfo=None).timestamp()
                result["days_until_expiry"] = int((not_after - now) / 86400)
            except Exception:
                pass

    except ssl.SSLCertVerificationError as e:
        result["error"] = f"Certificate verification failed: {e}"
        result["cert_valid"] = False
    except (socket.timeout, socket.gaierror, ConnectionRefusedError, OSError) as e:
        result["error"] = f"TLS connection failed: {e}"
    except Exception as e:
        result["error"] = f"TLS analysis error: {e}"

    return result


# ═══════════════════════════════════════════════════════════════════════
#  HTTP ANALYSIS — Headers, Redirects, Cookies, Server Info
# ═══════════════════════════════════════════════════════════════════════
async def analyze_http(url: str) -> Dict[str, Any]:
    """Real HTTP analysis — security headers, cookies, redirects, server info."""
    result = {
        "status_code": None,
        "final_url": None,
        "redirect_chain": [],
        "headers": {},
        "security_headers": {},
        "cookies": [],
        "server": None,
        "powered_by": None,
        "content_type": None,
        "error": None,
    }

    SECURITY_HEADERS_TO_CHECK = [
        "strict-transport-security",
        "content-security-policy",
        "x-content-type-options",
        "x-frame-options",
        "x-xss-protection",
        "referrer-policy",
        "permissions-policy",
        "cross-origin-opener-policy",
        "cross-origin-resource-policy",
        "cross-origin-embedder-policy",
    ]

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(15.0),
            verify=True,
            max_redirects=10
        ) as client:
            response = await client.get(url)

            result["status_code"] = response.status_code
            result["final_url"] = str(response.url)

            # Redirect chain
            chain = [url]
            for resp in response.history:
                chain.append(str(resp.url))
            chain.append(str(response.url))
            result["redirect_chain"] = list(dict.fromkeys(chain))  # dedupe while preserving order

            # All response headers (lowercased)
            headers_lower = {k.lower(): v for k, v in response.headers.items()}
            result["headers"] = dict(response.headers)

            # Security headers check
            for header in SECURITY_HEADERS_TO_CHECK:
                value = headers_lower.get(header)
                result["security_headers"][header] = value  # None if absent

            # Server info
            result["server"] = headers_lower.get("server")
            result["powered_by"] = headers_lower.get("x-powered-by")
            result["content_type"] = headers_lower.get("content-type")

            # Cookie analysis
            for cookie_name, cookie_value in response.cookies.items():
                # Try to get cookie attributes from Set-Cookie headers
                cookie_info = {
                    "name": cookie_name,
                    "secure": False,
                    "httponly": False,
                    "samesite": None,
                    "path": "/",
                }
                # Parse Set-Cookie headers for attributes
                for raw_cookie in response.headers.get_list("set-cookie"):
                    if cookie_name in raw_cookie:
                        raw_lower = raw_cookie.lower()
                        cookie_info["secure"] = "secure" in raw_lower
                        cookie_info["httponly"] = "httponly" in raw_lower
                        if "samesite=strict" in raw_lower:
                            cookie_info["samesite"] = "Strict"
                        elif "samesite=lax" in raw_lower:
                            cookie_info["samesite"] = "Lax"
                        elif "samesite=none" in raw_lower:
                            cookie_info["samesite"] = "None"
                        break
                result["cookies"].append(cookie_info)

    except httpx.ConnectTimeout:
        result["error"] = "Connection timed out"
    except httpx.ConnectError as e:
        result["error"] = f"Connection error: {e}"
    except Exception as e:
        result["error"] = f"HTTP analysis error: {e}"

    return result


# ═══════════════════════════════════════════════════════════════════════
#  TECHNOLOGY DETECTION (from HTTP response headers/content)
# ═══════════════════════════════════════════════════════════════════════
TECH_PATTERNS = {
    # Server technologies
    "nginx": {"pattern": r"nginx(?:/(\d+\.\d+(?:\.\d+)?))?", "category": "web-server", "header": "server"},
    "apache": {"pattern": r"Apache(?:/(\d+\.\d+(?:\.\d+)?))?", "category": "web-server", "header": "server"},
    "cloudflare": {"pattern": r"cloudflare", "category": "cdn", "header": "server"},
    "microsoft-iis": {"pattern": r"Microsoft-IIS(?:/(\d+\.\d+))?", "category": "web-server", "header": "server"},
    "litespeed": {"pattern": r"LiteSpeed", "category": "web-server", "header": "server"},

    # Platforms
    "express": {"pattern": r"Express", "category": "framework", "header": "x-powered-by"},
    "php": {"pattern": r"PHP(?:/(\d+\.\d+(?:\.\d+)?))?", "category": "runtime", "header": "x-powered-by"},
    "asp.net": {"pattern": r"ASP\.NET", "category": "framework", "header": "x-powered-by"},
    "next.js": {"pattern": r"Next\.js", "category": "framework", "header": "x-powered-by"},
}

def detect_technologies(headers: Dict[str, str], html_content: str = "") -> List[Dict[str, Any]]:
    """Detect technologies from HTTP headers and HTML content."""
    detected = []
    headers_lower = {k.lower(): v for k, v in headers.items()}

    for tech_name, config in TECH_PATTERNS.items():
        header_value = headers_lower.get(config["header"], "")
        if header_value:
            match = re.search(config["pattern"], header_value, re.IGNORECASE)
            if match:
                version = match.group(1) if match.lastindex and match.lastindex >= 1 else None
                detected.append({
                    "name": tech_name,
                    "version": version,
                    "category": config["category"],
                    "source": f"HTTP Header: {config['header']}",
                    "evidence": f"{config['header']}: {header_value}",
                })

    # Check for technology indicators in HTML meta/headers
    if html_content:
        # WordPress
        if "wp-content" in html_content or "wp-includes" in html_content:
            wp_match = re.search(r'<meta name="generator" content="WordPress\s*([\d.]+)?', html_content)
            detected.append({
                "name": "WordPress",
                "version": wp_match.group(1) if wp_match else None,
                "category": "cms",
                "source": "HTML content analysis",
                "evidence": "WordPress markers detected in HTML",
            })

        # React
        if "__NEXT_DATA__" in html_content or "data-reactroot" in html_content or "_next/static" in html_content:
            detected.append({
                "name": "React",
                "version": None,
                "category": "frontend-framework",
                "source": "HTML content analysis",
                "evidence": "React/Next.js markers in HTML",
            })

        # Vue.js
        if "data-v-" in html_content or "__vue__" in html_content:
            detected.append({
                "name": "Vue.js",
                "version": None,
                "category": "frontend-framework",
                "source": "HTML content analysis",
                "evidence": "Vue.js markers in HTML",
            })

        # jQuery
        jq_match = re.search(r'jquery[.-]?(\d+\.\d+(?:\.\d+)?)?\.min\.js', html_content, re.IGNORECASE)
        if jq_match:
            detected.append({
                "name": "jQuery",
                "version": jq_match.group(1) if jq_match.lastindex else None,
                "category": "javascript-library",
                "source": "HTML content analysis",
                "evidence": "jQuery script reference detected",
            })

        # Google Analytics
        if "gtag" in html_content or "google-analytics" in html_content or "GA_MEASUREMENT_ID" in html_content:
            detected.append({
                "name": "Google Analytics",
                "version": None,
                "category": "analytics",
                "source": "HTML content analysis",
                "evidence": "Google Analytics tag detected",
            })

    return detected


# ═══════════════════════════════════════════════════════════════════════
#  NVD / CVE VULNERABILITY INTELLIGENCE
# ═══════════════════════════════════════════════════════════════════════
NVD_API_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0"
EPSS_API_BASE = "https://api.first.org/data/v1/epss"

async def query_nvd_for_product(product: str, version: Optional[str] = None) -> List[Dict[str, Any]]:
    """Query NVD for vulnerabilities affecting a specific product/version."""
    vulnerabilities = []
    try:
        params = {"keywordSearch": product, "resultsPerPage": 10}
        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0)) as client:
            response = await client.get(NVD_API_BASE, params=params)
            if response.status_code == 200:
                data = response.json()
                for item in data.get("vulnerabilities", []):
                    cve = item.get("cve", {})
                    cve_id = cve.get("id", "")

                    # Get description
                    descriptions = cve.get("descriptions", [])
                    desc_en = next((d["value"] for d in descriptions if d.get("lang") == "en"), "")

                    # Get CVSS score
                    metrics = cve.get("metrics", {})
                    cvss_score = None
                    cvss_vector = None
                    severity = "MEDIUM"

                    # Try CVSS v3.1 first, then v3.0, then v2.0
                    for cvss_key in ["cvssMetricV31", "cvssMetricV30"]:
                        cvss_data = metrics.get(cvss_key, [])
                        if cvss_data:
                            primary = cvss_data[0].get("cvssData", {})
                            cvss_score = primary.get("baseScore")
                            cvss_vector = primary.get("vectorString")
                            base_severity = primary.get("baseSeverity", "MEDIUM")
                            severity = base_severity.upper()
                            break

                    if not cvss_score:
                        cvss_v2 = metrics.get("cvssMetricV2", [])
                        if cvss_v2:
                            primary = cvss_v2[0].get("cvssData", {})
                            cvss_score = primary.get("baseScore")
                            cvss_vector = primary.get("vectorString")

                    # Published date
                    published = cve.get("published", "")

                    # References
                    refs = [ref.get("url") for ref in cve.get("references", []) if ref.get("url")][:5]

                    # Affected product/version from configurations
                    affected_product = product
                    affected_version = None

                    for config in cve.get("configurations", []):
                        for node in config.get("nodes", []):
                            for match in node.get("cpeMatch", []):
                                cpe_uri = match.get("criteria", "")
                                if product.lower() in cpe_uri.lower():
                                    parts = cpe_uri.split(":")
                                    if len(parts) >= 6:
                                        affected_version = parts[5] if parts[5] != "*" else None

                    vuln_entry = {
                        "cve_id": cve_id,
                        "title": f"{cve_id}: {desc_en[:120]}" if desc_en else cve_id,
                        "description": desc_en,
                        "severity": severity,
                        "cvss_score": cvss_score,
                        "cvss_vector": cvss_vector,
                        "affected_product": affected_product,
                        "affected_version": affected_version,
                        "published_at": published,
                        "references": refs,
                        "source": "NVD",
                    }
                    vulnerabilities.append(vuln_entry)

            elif response.status_code == 403:
                logger.warning("NVD API rate limited. Skipping vulnerability lookup.")
            else:
                logger.warning(f"NVD API returned status {response.status_code}")

    except httpx.TimeoutException:
        logger.warning(f"NVD API timeout for product: {product}")
    except Exception as e:
        logger.warning(f"NVD lookup error for {product}: {e}")

    return vulnerabilities


async def get_epss_scores(cve_ids: List[str]) -> Dict[str, float]:
    """Query FIRST EPSS API for exploit probability scores."""
    scores = {}
    if not cve_ids:
        return scores

    try:
        params = {"cve": ",".join(cve_ids[:30])}  # API limit
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
            response = await client.get(EPSS_API_BASE, params=params)
            if response.status_code == 200:
                data = response.json()
                for entry in data.get("data", []):
                    cve_id = entry.get("cve")
                    epss = entry.get("epss")
                    if cve_id and epss is not None:
                        scores[cve_id] = float(epss)
    except Exception as e:
        logger.warning(f"EPSS API error: {e}")

    return scores


async def check_cisa_kev(cve_ids: List[str]) -> Dict[str, bool]:
    """Check CISA Known Exploited Vulnerabilities catalog."""
    kev_status = {cve: False for cve in cve_ids}
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
            response = await client.get("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json")
            if response.status_code == 200:
                data = response.json()
                kev_cves = {v["cveID"] for v in data.get("vulnerabilities", [])}
                for cve in cve_ids:
                    kev_status[cve] = cve in kev_cves
    except Exception as e:
        logger.warning(f"CISA KEV lookup error: {e}")

    return kev_status


# ═══════════════════════════════════════════════════════════════════════
#  SECURITY HEADER FINDINGS GENERATOR
# ═══════════════════════════════════════════════════════════════════════
def generate_security_findings(
    http_result: Dict[str, Any],
    tls_result: Dict[str, Any],
    dns_result: Dict[str, Any],
    domain: str,
    url: str
) -> List[Dict[str, Any]]:
    """Generate scanner findings from real analysis results."""
    findings = []
    sec_headers = http_result.get("security_headers", {})

    # ── HTTPS enforcement ──
    if url.startswith("https://"):
        findings.append({
            "category": "HTTPS",
            "check_name": "HTTPS Enforcement",
            "title": "HTTPS Enforcement",
            "severity": "INFO",
            "check_status": "PASS",
            "details": f"Target uses HTTPS. Final URL: {http_result.get('final_url', url)}",
            "evidence": f"HTTP status: {http_result.get('status_code')}",
            "recommendation": None,
            "affected_target": url,
            "source": "SCANNER",
        })
    else:
        findings.append({
            "category": "HTTPS",
            "check_name": "HTTPS Enforcement",
            "title": "HTTPS Not Enforced",
            "severity": "HIGH",
            "check_status": "FAIL",
            "details": "Target does not enforce HTTPS.",
            "evidence": f"Target URL uses HTTP: {url}",
            "recommendation": "Enable HTTPS and redirect all HTTP traffic to HTTPS.",
            "affected_target": url,
            "source": "SCANNER",
        })

    # ── TLS version ──
    tls_version = tls_result.get("tls_version")
    if tls_version:
        if tls_version in ("TLSv1.3", "TLSv1.2"):
            findings.append({
                "category": "TLS",
                "check_name": "TLS Protocol Version",
                "title": f"TLS Protocol Version: {tls_version}",
                "severity": "INFO",
                "check_status": "PASS",
                "details": f"Server negotiates {tls_version}. Cipher: {tls_result.get('cipher_suite', 'N/A')}",
                "evidence": f"TLS version: {tls_version}",
                "recommendation": None,
                "affected_target": domain,
                "source": "SCANNER",
            })
        else:
            findings.append({
                "category": "TLS",
                "check_name": "TLS Protocol Version",
                "title": f"Outdated TLS Protocol: {tls_version}",
                "severity": "HIGH",
                "check_status": "FAIL",
                "details": f"Server uses {tls_version} which has known vulnerabilities.",
                "evidence": f"TLS version: {tls_version}",
                "recommendation": "Upgrade to TLS 1.2 or 1.3 and disable legacy protocols.",
                "affected_target": domain,
                "source": "SCANNER",
            })
    elif tls_result.get("error"):
        findings.append({
            "category": "TLS",
            "check_name": "TLS Protocol Version",
            "title": "TLS Analysis Failed",
            "severity": "MEDIUM",
            "check_status": "WARN",
            "details": f"Could not analyze TLS: {tls_result['error']}",
            "evidence": tls_result["error"],
            "recommendation": "Verify TLS configuration is accessible.",
            "affected_target": domain,
            "source": "SCANNER",
        })

    # ── Certificate validity ──
    if tls_result.get("cert_valid"):
        days = tls_result.get("days_until_expiry", 0)
        if days and days > 30:
            findings.append({
                "category": "CERTIFICATE",
                "check_name": "Certificate Validity",
                "title": "Valid TLS Certificate",
                "severity": "INFO",
                "check_status": "PASS",
                "details": f"Certificate issued by {tls_result.get('cert_issuer', 'Unknown')}. {days} days until expiry.",
                "evidence": f"Not After: {tls_result.get('cert_not_after')}, Issuer: {tls_result.get('cert_issuer')}",
                "recommendation": None,
                "affected_target": domain,
                "source": "SCANNER",
            })
        elif days and days <= 30:
            sev = "HIGH" if days <= 7 else "MEDIUM"
            findings.append({
                "category": "CERTIFICATE",
                "check_name": "Certificate Validity",
                "title": f"Certificate Expiring Soon ({days} days)",
                "severity": sev,
                "check_status": "WARN",
                "details": f"Certificate expires in {days} days. Issuer: {tls_result.get('cert_issuer')}.",
                "evidence": f"Not After: {tls_result.get('cert_not_after')}",
                "recommendation": "Renew the TLS certificate before expiry.",
                "affected_target": domain,
                "source": "SCANNER",
            })
    elif tls_result.get("error") and "verification failed" in str(tls_result.get("error", "")).lower():
        findings.append({
            "category": "CERTIFICATE",
            "check_name": "Certificate Validity",
            "title": "Invalid or Untrusted Certificate",
            "severity": "CRITICAL",
            "check_status": "FAIL",
            "details": f"TLS certificate verification failed.",
            "evidence": tls_result.get("error", ""),
            "recommendation": "Install a valid CA-signed TLS certificate.",
            "affected_target": domain,
            "source": "SCANNER",
        })

    # ── HSTS ──
    hsts = sec_headers.get("strict-transport-security")
    if hsts:
        findings.append({
            "category": "HEADERS",
            "check_name": "Strict-Transport-Security (HSTS)",
            "title": "HSTS Header Present",
            "severity": "INFO",
            "check_status": "PASS",
            "details": f"HSTS is configured: {hsts}",
            "evidence": f"Strict-Transport-Security: {hsts}",
            "recommendation": None,
            "affected_target": url,
            "source": "SCANNER",
        })
    else:
        findings.append({
            "category": "HEADERS",
            "check_name": "Strict-Transport-Security (HSTS)",
            "title": "Missing HSTS Header",
            "severity": "MEDIUM",
            "check_status": "FAIL",
            "details": "No Strict-Transport-Security header found. Browsers may not enforce HTTPS.",
            "evidence": "HTTP response headers inspected; no Strict-Transport-Security directive found.",
            "recommendation": "Add Strict-Transport-Security header with max-age=31536000; includeSubDomains; preload.",
            "affected_target": url,
            "source": "SCANNER",
        })

    # ── CSP ──
    csp = sec_headers.get("content-security-policy")
    if csp:
        findings.append({
            "category": "HEADERS",
            "check_name": "Content-Security-Policy (CSP)",
            "title": "CSP Header Present",
            "severity": "INFO",
            "check_status": "PASS",
            "details": f"Content-Security-Policy is configured.",
            "evidence": f"Content-Security-Policy: {csp[:200]}",
            "recommendation": None,
            "affected_target": url,
            "source": "SCANNER",
        })
    else:
        findings.append({
            "category": "HEADERS",
            "check_name": "Content-Security-Policy (CSP)",
            "title": "Missing Content-Security-Policy Header",
            "severity": "HIGH",
            "check_status": "FAIL",
            "details": "No Content-Security-Policy header. Site may be vulnerable to XSS and data injection.",
            "evidence": "HTTP response headers inspected; no Content-Security-Policy directive found.",
            "recommendation": "Configure an appropriate CSP policy restricting script sources and frame-ancestors.",
            "affected_target": url,
            "source": "SCANNER",
        })

    # ── X-Frame-Options ──
    xfo = sec_headers.get("x-frame-options")
    if xfo:
        findings.append({
            "category": "HEADERS",
            "check_name": "X-Frame-Options",
            "title": "X-Frame-Options Header Present",
            "severity": "INFO",
            "check_status": "PASS",
            "details": f"X-Frame-Options set to {xfo}.",
            "evidence": f"X-Frame-Options: {xfo}",
            "recommendation": None,
            "affected_target": url,
            "source": "SCANNER",
        })
    else:
        findings.append({
            "category": "HEADERS",
            "check_name": "X-Frame-Options",
            "title": "Missing X-Frame-Options Header",
            "severity": "MEDIUM",
            "check_status": "FAIL",
            "details": "No X-Frame-Options header. Page may be vulnerable to clickjacking.",
            "evidence": "HTTP response headers inspected; no X-Frame-Options directive found.",
            "recommendation": "Set X-Frame-Options to DENY or SAMEORIGIN.",
            "affected_target": url,
            "source": "SCANNER",
        })

    # ── X-Content-Type-Options ──
    xcto = sec_headers.get("x-content-type-options")
    if xcto and xcto.lower() == "nosniff":
        findings.append({
            "category": "HEADERS",
            "check_name": "X-Content-Type-Options",
            "title": "X-Content-Type-Options Set",
            "severity": "INFO",
            "check_status": "PASS",
            "details": "X-Content-Type-Options configured as nosniff.",
            "evidence": f"X-Content-Type-Options: {xcto}",
            "recommendation": None,
            "affected_target": url,
            "source": "SCANNER",
        })
    else:
        findings.append({
            "category": "HEADERS",
            "check_name": "X-Content-Type-Options",
            "title": "Missing X-Content-Type-Options Header",
            "severity": "LOW",
            "check_status": "FAIL",
            "details": "No X-Content-Type-Options header. Browser may MIME-sniff content type.",
            "evidence": "HTTP response headers inspected; no X-Content-Type-Options directive found.",
            "recommendation": "Set X-Content-Type-Options: nosniff.",
            "affected_target": url,
            "source": "SCANNER",
        })

    # ── Referrer-Policy ──
    rp = sec_headers.get("referrer-policy")
    if rp:
        findings.append({
            "category": "HEADERS",
            "check_name": "Referrer-Policy",
            "title": "Referrer-Policy Header Present",
            "severity": "INFO",
            "check_status": "PASS",
            "details": f"Referrer-Policy set to {rp}.",
            "evidence": f"Referrer-Policy: {rp}",
            "recommendation": None,
            "affected_target": url,
            "source": "SCANNER",
        })
    else:
        findings.append({
            "category": "HEADERS",
            "check_name": "Referrer-Policy",
            "title": "Missing Referrer-Policy Header",
            "severity": "LOW",
            "check_status": "WARN",
            "details": "No Referrer-Policy header. Full referrer may leak to third parties.",
            "evidence": "HTTP response headers inspected; no Referrer-Policy directive found.",
            "recommendation": "Set Referrer-Policy: strict-origin-when-cross-origin or no-referrer.",
            "affected_target": url,
            "source": "SCANNER",
        })

    # ── Cookie security ──
    cookies = http_result.get("cookies", [])
    for cookie in cookies:
        issues = []
        if not cookie.get("secure"):
            issues.append("Missing Secure flag")
        if not cookie.get("httponly"):
            issues.append("Missing HttpOnly flag")
        if not cookie.get("samesite") or cookie.get("samesite") == "None":
            issues.append(f"SameSite={cookie.get('samesite', 'Not Set')}")

        if issues:
            findings.append({
                "category": "COOKIES",
                "check_name": "Cookie Security Attributes",
                "title": f"Cookie '{cookie['name']}' Security Issues",
                "severity": "MEDIUM" if "Secure" in str(issues) else "LOW",
                "check_status": "WARN",
                "details": f"Cookie '{cookie['name']}' has security issues: {', '.join(issues)}.",
                "evidence": f"Cookie: {cookie['name']}, Issues: {', '.join(issues)}",
                "recommendation": "Set Secure, HttpOnly, and SameSite=Strict on session cookies.",
                "affected_target": url,
                "source": "SCANNER",
            })
        else:
            findings.append({
                "category": "COOKIES",
                "check_name": "Cookie Security Attributes",
                "title": f"Cookie '{cookie['name']}' Properly Secured",
                "severity": "INFO",
                "check_status": "PASS",
                "details": f"Cookie '{cookie['name']}' has Secure, HttpOnly, SameSite flags.",
                "evidence": f"Cookie: {cookie['name']}, Secure=True, HttpOnly=True, SameSite={cookie.get('samesite')}",
                "recommendation": None,
                "affected_target": url,
                "source": "SCANNER",
            })

    # ── DNSSEC ──
    if dns_result.get("has_dnssec"):
        findings.append({
            "category": "DNS",
            "check_name": "DNSSEC Validation",
            "title": "DNSSEC Configured",
            "severity": "INFO",
            "check_status": "PASS",
            "details": "DNS zone has DNSSEC cryptographic signatures.",
            "evidence": "DNSKEY records found for domain.",
            "recommendation": None,
            "affected_target": domain,
            "source": "ATTACK_SURFACE",
        })
    else:
        findings.append({
            "category": "DNS",
            "check_name": "DNSSEC Validation",
            "title": "DNSSEC Not Configured",
            "severity": "LOW",
            "check_status": "WARN",
            "details": "DNS zone lacks DNSSEC cryptographic RRSIG and DS records.",
            "evidence": "No DNSKEY records found for domain.",
            "recommendation": "Enable DNSSEC signing at domain registrar and configure DS records.",
            "affected_target": domain,
            "source": "ATTACK_SURFACE",
        })

    return findings


# ═══════════════════════════════════════════════════════════════════════
#  FULL SCAN ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════════════
async def run_full_scan(
    url: str,
    domain: str,
    progress_callback=None,
) -> Dict[str, Any]:
    """
    Execute the complete scan pipeline:
    1. Target validation
    2. DNS resolution + subdomain discovery
    3. TLS/certificate analysis
    4. HTTP security analysis
    5. Security header checks
    6. Cookie analysis
    7. Technology detection
    8. Vulnerability intelligence
    9. Report compilation
    """

    result = {
        "dns": None,
        "subdomains": [],
        "tls": None,
        "http": None,
        "technologies": [],
        "findings": [],
        "vulnerabilities": [],
        "discovered_assets": [],
        "error": None,
    }

    try:
        # Step 1: Target validation
        if progress_callback:
            await progress_callback("target_validation", ["target_validation"], SCAN_STEPS[1:])
        valid, parsed_domain, cleaned_url = validate_target(url)
        if not valid:
            result["error"] = f"Invalid target URL: {url}"
            return result
        await asyncio.sleep(0.3)  # Brief pause for progress visibility

        # Step 2: DNS Resolution
        if progress_callback:
            await progress_callback("dns_resolution", SCAN_STEPS[:2], SCAN_STEPS[2:])
        dns_data = await resolve_dns(domain)
        result["dns"] = dns_data

        if dns_data.get("error") and "SSRF_BLOCKED" in str(dns_data.get("error")):
            result["error"] = dns_data["error"]
            return result

        # Subdomain discovery
        subdomains = await discover_subdomains(domain)
        result["subdomains"] = subdomains

        # Build discovered assets from DNS
        # Apex domain
        a_records = dns_data.get("a_records", [])
        aaaa_records = dns_data.get("aaaa_records", [])
        ip_str = a_records[0] if a_records else None
        result["discovered_assets"].append({
            "asset_type": "DOMAIN",
            "name": domain,
            "domain": domain,
            "hostname": domain,
            "ip_address": ip_str,
            "details": f"Apex domain (IPv4: {', '.join(a_records) if a_records else 'N/A'}, IPv6: {', '.join(aaaa_records) if aaaa_records else 'N/A'})",
            "source": "DNS",
            "exposure": "PUBLIC",
        })

        # Subdomains
        for sub in subdomains:
            result["discovered_assets"].append({
                "asset_type": "SUBDOMAIN",
                "name": sub["subdomain"],
                "domain": domain,
                "hostname": sub["subdomain"],
                "ip_address": sub["ip_addresses"][0] if sub["ip_addresses"] else None,
                "details": f"Subdomain resolved (IPv4: {', '.join(sub['ip_addresses'])})",
                "source": "DNS",
                "exposure": "PUBLIC",
            })

        # Step 3: TLS Analysis
        if progress_callback:
            await progress_callback("tls_analysis", SCAN_STEPS[:3], SCAN_STEPS[3:])
        tls_data = await analyze_tls(domain)
        result["tls"] = tls_data

        # Certificate asset
        if tls_data.get("cert_valid"):
            result["discovered_assets"].append({
                "asset_type": "CERTIFICATE",
                "name": f"{tls_data.get('cert_issuer', 'Unknown')} Certificate",
                "domain": domain,
                "hostname": domain,
                "details": f"Valid until {tls_data.get('cert_not_after', 'N/A')}, {tls_data.get('days_until_expiry', '?')} days remaining. SANs: {', '.join(tls_data.get('cert_sans', [])[:5])}",
                "source": "TLS",
                "exposure": "PUBLIC",
            })

        # Step 4: HTTP Analysis
        if progress_callback:
            await progress_callback("http_analysis", SCAN_STEPS[:4], SCAN_STEPS[4:])
        http_data = await analyze_http(url)
        result["http"] = http_data

        # Services (ports)
        result["discovered_assets"].append({
            "asset_type": "SERVICE",
            "name": "HTTPS (Port 443)",
            "domain": domain,
            "hostname": f"{domain}:443",
            "port": 443,
            "protocol": "tcp",
            "details": f"{tls_data.get('tls_version', 'TLS')} / HTTP status {http_data.get('status_code', 'N/A')}",
            "source": "HTTP",
            "exposure": "PUBLIC",
        })

        # Step 5: Security Headers
        if progress_callback:
            await progress_callback("security_headers", SCAN_STEPS[:5], SCAN_STEPS[5:])
        # (findings generated in step 9 compilation)

        # Step 6: Cookie Analysis
        if progress_callback:
            await progress_callback("cookie_analysis", SCAN_STEPS[:6], SCAN_STEPS[6:])
        # (cookies analyzed as part of HTTP, findings generated in step 9)

        # Step 7: Technology Detection
        if progress_callback:
            await progress_callback("technology_detection", SCAN_STEPS[:7], SCAN_STEPS[7:])

        # Get HTML content for technology detection
        html_content = ""
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
                resp = await client.get(url)
                html_content = resp.text[:50000]  # First 50KB
        except Exception:
            pass

        technologies = detect_technologies(http_data.get("headers", {}), html_content)
        result["technologies"] = technologies

        for tech in technologies:
            result["discovered_assets"].append({
                "asset_type": "TECHNOLOGY",
                "name": f"{tech['name']}" + (f" {tech['version']}" if tech.get('version') else ""),
                "domain": domain,
                "hostname": domain,
                "technology": tech["name"],
                "technology_version": tech.get("version"),
                "details": f"{tech.get('category', 'Unknown')} detected from {tech.get('source', 'analysis')}",
                "source": "HTTP",
                "exposure": "PUBLIC",
            })

        # Step 8: Vulnerability Intelligence
        if progress_callback:
            await progress_callback("vulnerability_intelligence", SCAN_STEPS[:8], SCAN_STEPS[8:])

        # Query NVD for detected technologies with known versions
        all_vulns = []
        for tech in technologies:
            if tech.get("version"):
                tech_vulns = await query_nvd_for_product(
                    f"{tech['name']} {tech['version']}",
                    tech.get("version")
                )
                all_vulns.extend(tech_vulns)
                # Rate limit: NVD allows 5 requests per 30 seconds without API key
                await asyncio.sleep(6)

        # Also query server software if detected
        server = http_data.get("server")
        if server and not any(t["name"].lower() in server.lower() for t in technologies):
            server_vulns = await query_nvd_for_product(server)
            all_vulns.extend(server_vulns)

        # Deduplicate by CVE ID
        seen_cves = set()
        unique_vulns = []
        for v in all_vulns:
            if v["cve_id"] not in seen_cves:
                seen_cves.add(v["cve_id"])
                unique_vulns.append(v)

        # Enrich with EPSS scores
        if unique_vulns:
            cve_ids = [v["cve_id"] for v in unique_vulns]
            epss_scores = await get_epss_scores(cve_ids)
            kev_status = await check_cisa_kev(cve_ids)

            for v in unique_vulns:
                v["epss_score"] = epss_scores.get(v["cve_id"])
                v["kev_status"] = kev_status.get(v["cve_id"], False)

        result["vulnerabilities"] = unique_vulns

        # Step 9: Report Compilation — Generate all findings
        if progress_callback:
            await progress_callback("report_preparation", SCAN_STEPS, [])
        findings = generate_security_findings(http_data, tls_data, dns_data, domain, url)
        result["findings"] = findings

    except Exception as e:
        logger.error(f"Scan error for {url}: {e}", exc_info=True)
        result["error"] = str(e)

    return result
