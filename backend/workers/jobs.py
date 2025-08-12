import time, requests, smtplib, os
from email.message import EmailMessage
from db.repository import TicketRepo


SMTP_HOST = "smtp.sendgrid.net"
SMTP_PORT = 587
SMTP_USER = "apikey"
SMTP_PASS = os.getenv("SENDGRID_KEY", "YOUR_SENDGRID_KEY")
FROM = "noreply@civicguard.local"


def _file_via_email(to_addr: str, subject: str, body: str):
    msg = EmailMessage()
    msg["From"] = FROM
    msg["To"] = to_addr
    msg["Subject"] = subject
    msg.set_content(body)
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as s:
        s.starttls()
        s.login(SMTP_USER, SMTP_PASS)
        s.send_message(msg)


def _file_via_api(url: str, payload: dict):
    requests.post(url, json=payload, timeout=10)


def file_to_authority(ticket_id: str, file_url: str, iclass: str, address: str, contact: str | None):
    """File the ticket to an authority using routing table via email or API.
    Updates status/authority fields and writes authority_ticket_id using repo.
    """
    from agents.routing import lookup

    t = TicketRepo.get(ticket_id)
    if not t:
        return

    route = lookup(iclass, "Ward-1")
    TicketRepo.update(ticket_id, {"status": "FILING", "authority": route.get("authority_name")})

    subject = f"[CivicGuard] {iclass} at {address}"
    body = f"Issue: {iclass}\nAddress: {address}\nCitizen: {contact or ''}\nPhoto: {file_url}"

    try:
        if route.get("endpoint_type") == "email":
            _file_via_email(route.get("endpoint_value"), subject, body)
        else:
            _file_via_api(route.get("endpoint_value"), {"title": subject, "details": body, "photo": file_url})
    except Exception as e:
        print("[Filing] error:", e)

    authority_ticket_id = f"CG-{ticket_id[:8]}"
    TicketRepo.update(ticket_id, {"status": "FILED", "authority_ticket_id": authority_ticket_id})
    return {"ok": True, "authority_ticket_id": authority_ticket_id}
