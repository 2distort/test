# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a single-file Python application (`sniper.py`) — a Reddit Lead Generation Tool ("TrojanHorse MVP v1"). It scans subreddits for posts matching pain-point keywords and exports leads to `leads.csv`.

### Dependencies

- Python 3.12+ (pre-installed in the VM)
- `praw` (Python Reddit API Wrapper) — the sole third-party dependency, listed in `requirements.txt`
- `flake8` — for linting

### Running

```bash
python3 sniper.py
```

The script requires valid Reddit API credentials. Currently, `CLIENT_ID` and `CLIENT_SECRET` are hardcoded placeholders in `sniper.py`. The script will exit with a `prawcore.exceptions.ResponseException: received 401 HTTP response` if credentials are invalid.

### Linting

```bash
flake8 sniper.py
```

Existing style warnings (E501 line length, F401 unused import, E302/E305 blank lines) are pre-existing in the repo and not introduced by setup.

### Key caveats

- No automated tests exist in this repo.
- No build step is needed — the app is a single Python script.
- Output file `leads.csv` is gitignored.
- The script uses `datetime.datetime.utcnow()` which emits a DeprecationWarning on Python 3.12+; this is a known pre-existing issue.
