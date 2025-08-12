import csv
from functools import lru_cache
import os

@lru_cache
def _routes():
    # resolve path relative to backend dir
    base = os.path.dirname(os.path.dirname(__file__))
    path = os.path.join(base, 'routing.csv')
    with open(path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))

def lookup(iclass: str, ward: str = 'Ward-1'):
    ic = (iclass or '').strip().lower()
    wd = (ward or '').strip()
    for r in _routes():
        if (r.get('class','').strip().lower() == ic) and (r.get('ward','').strip() == wd):
            return r
    return {
        'authority_name': 'Municipal Helpdesk',
        'endpoint_type': 'email',
        'endpoint_value': 'helpdesk@example.com'
    }
