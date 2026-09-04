import praw
import csv
import datetime
import os

# CONFIGURATION
CLIENT_ID = os.environ.get('REDDIT_CLIENT_ID', 'YOUR_ID_HERE')
CLIENT_SECRET = os.environ.get('REDDIT_CLIENT_SECRET', 'YOUR_SECRET_HERE')
USER_AGENT = os.environ.get('REDDIT_USER_AGENT', 'TrojanHorse_MVP_v1')
SUBREDDITS = 'smallbusiness+entrepreneur+saas+marketing+automation'
KEYWORDS = ['hate', 'manual', 'stuck', 'annoying', 'wish there was', 'pay for', 'broken']
LOOKBACK_DAYS = 7

def run_sniper():
    reddit = praw.Reddit(client_id=CLIENT_ID, client_secret=CLIENT_SECRET, user_agent=USER_AGENT)
    subreddit = reddit.subreddit(SUBREDDITS)

    print(f"Scanning r/{SUBREDDITS} for keywords: {KEYWORDS}...")

    leads = []
    cutoff = datetime.datetime.utcnow().timestamp() - (LOOKBACK_DAYS * 86400)

    for post in subreddit.new(limit=500):
        if post.created_utc < cutoff:
            break

        full_text = (post.title + " " + post.selftext).lower()

        # Basic keyword match
        if any(k in full_text for k in KEYWORDS):
            leads.append([
                post.title,
                f"https://reddit.com{post.permalink}",
                post.subreddit.display_name,
                post.score,
                datetime.datetime.fromtimestamp(post.created_utc).strftime('%Y-%m-%d')
            ])

    # Export
    filename = 'leads.csv'
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['Title', 'URL', 'Subreddit', 'Score', 'Date'])
        writer.writerows(leads)

    print(f"Done. Found {len(leads)} potential leads. Saved to {filename}.")

if __name__ == "__main__":
    run_sniper()
