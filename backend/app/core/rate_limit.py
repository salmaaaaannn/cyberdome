"""
CYBERDOME Security Rate Limiter.
In-memory sliding-window rate limiter for brute-force prevention,
login throttling, and API abuse protection.
"""
import time
from collections import defaultdict
from typing import Dict, List, Tuple

class SlidingWindowRateLimiter:
    def __init__(self, max_requests: int = 5, window_seconds: int = 300):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # key -> list of timestamp floats
        self._history: Dict[str, List[float]] = defaultdict(list)

    def _cleanup(self, key: str, now: float):
        cutoff = now - self.window_seconds
        self._history[key] = [ts for ts in self._history[key] if ts > cutoff]

    def is_rate_limited(self, key: str) -> Tuple[bool, int]:
        """
        Check if key is rate limited.
        Returns (is_limited, retry_after_seconds).
        """
        now = time.time()
        self._cleanup(key, now)
        if len(self._history[key]) >= self.max_requests:
            oldest = self._history[key][0]
            retry_after = max(1, int(self.window_seconds - (now - oldest)))
            return True, retry_after
        return False, 0

    def record_attempt(self, key: str):
        """Record an attempt/failure for the key."""
        now = time.time()
        self._cleanup(key, now)
        self._history[key].append(now)

    def clear(self, key: str):
        """Reset attempts on success."""
        if key in self._history:
            del self._history[key]

# Singleton login rate limiter: max 5 failed attempts per 5 minutes per IP or email
login_rate_limiter = SlidingWindowRateLimiter(max_requests=5, window_seconds=300)
