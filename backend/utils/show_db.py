"""
Quick DB inspector for CivicGuard (SQL only).

Prints:
- DB URL and dialect
- Tables and columns
- Total tickets and a sample of recent rows
"""
from __future__ import annotations

import os
import sys
from sqlalchemy import inspect

# Ensure project imports work when run directly
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.append(ROOT)

from db.session import engine, get_session, DB_URL  # type: ignore
from db.models import Ticket  # type: ignore


def human(ts):
    if not ts:
        return "-"
    try:
        return ts.strftime("%Y-%m-%d %H:%M:%S") if hasattr(ts, "strftime") else str(ts)
    except Exception:
        return str(ts)


def main():
    print("Backend: SQL")
    insp = inspect(engine)
    print("DB_URL:", DB_URL)
    try:
        print("Dialect:", engine.dialect.name)
    except Exception:
        pass

    print("\nTables and columns:")
    for table_name in insp.get_table_names():
        cols = insp.get_columns(table_name)
        col_desc = ", ".join(f"{c['name']}:{c.get('type')}" for c in cols)
        print(f"- {table_name} ({len(cols)} cols): {col_desc}")

    # Tickets summary
    with get_session() as s:
        try:
            total = s.query(Ticket).count()
        except Exception:
            total = 0
        print(f"\nTotal tickets: {total}")

        rows = (
            s.query(Ticket)
            .order_by(Ticket.created_at.desc())
            .limit(20)
            .all()
        )
        if not rows:
            print("No tickets found.")
            return

        print("\nRecent tickets (up to 20):")
        print(
            f"{'id':36}  {'status':8}  {'iclass':12}  {'created_at':19}  {'lat':8}  {'lng':8}  address"
        )
        for r in rows:
            lat = f"{r.lat:.5f}" if r.lat is not None else "-"
            lng = f"{r.lng:.5f}" if r.lng is not None else "-"
            addr = (r.address or "-")
            if len(addr) > 60:
                addr = addr[:57] + "..."
            print(f"{r.id:36}  {str(r.status or '-'):8}  {str(r.iclass or '-'):12}  {human(r.created_at):19}  {lat:8}  {lng:8}  {addr}")

        # Sample media URLs
        samples = [r.media_url for r in rows if r.media_url]
        if samples:
            print("\nSample media_url values:")
            for u in samples[:5]:
                print("-", u)


if __name__ == "__main__":
    main()
