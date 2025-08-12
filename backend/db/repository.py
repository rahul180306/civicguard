from __future__ import annotations
from typing import Any, Dict, Optional
from datetime import datetime

from .session import get_session
from .models import Ticket


class TicketRepo:
    @staticmethod
    def _now() -> datetime:
        return datetime.utcnow()

    # Create
    @staticmethod
    def create(data: Dict[str, Any]) -> Dict[str, Any]:
        db = get_session()
        try:
            t = Ticket(**data)
            db.add(t)
            db.commit()
            return t.as_dict()
        finally:
            db.close()

    # Read one
    @staticmethod
    def get(tid: str) -> Optional[Dict[str, Any]]:
        db = get_session()
        try:
            t = db.get(Ticket, tid)
            return t.as_dict() if t else None
        finally:
            db.close()

    # List with filters/pagination (best-effort)
    @staticmethod
    def list(limit: int = 50, offset: int = 0, status: Optional[str] = None, iclass: Optional[str] = None) -> Dict[str, Any]:
        db = get_session()
        try:
            q = db.query(Ticket)
            if status:
                q = q.filter(Ticket.status == status)
            if iclass:
                q = q.filter(Ticket.iclass == iclass)
            total = q.count()
            rows = (
                q.order_by(Ticket.created_at.desc())
                 .offset(max(0, offset))
                 .limit(max(1, min(limit, 200)))
                 .all()
            )
            return {"count": total, "items": [r.as_dict() for r in rows]}
        finally:
            db.close()

    # Update fields
    @staticmethod
    def update(tid: str, changes: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        changes = {**changes, "updated_at": TicketRepo._now()}
        db = get_session()
        try:
            t = db.get(Ticket, tid)
            if not t:
                return None
            for k, v in changes.items():
                setattr(t, k, v)
            db.commit()
            return t.as_dict()
        finally:
            db.close()
