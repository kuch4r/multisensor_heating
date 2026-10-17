"""Rolling statistics of each sensor vs. the reference sensor -> suggested offsets.

If a sensor typically reads ``d`` warmer than the reference sensor, its effective
target should be ``room_target + d`` so the reference ends up at the room target.
Samples are taken at a fixed interval, so the mean is time-weighted.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass


@dataclass(frozen=True)
class DeltaSummary:
    """Summary of (sensor - reference) over the window."""

    suggested_offset: float | None
    mean_delta: float | None
    min_delta: float | None
    max_delta: float | None
    samples: int

    def as_dict(self) -> dict[str, float | int | None]:
        return {
            "suggested_offset": self.suggested_offset,
            "mean_delta_24h": self.mean_delta,
            "min_delta_24h": self.min_delta,
            "max_delta_24h": self.max_delta,
            "samples_24h": self.samples,
        }


class OffsetStats:
    """Keep periodic (timestamp, delta) samples per sensor for a sliding window."""

    def __init__(self, window_s: float, sample_s: float, min_samples: int = 12) -> None:
        self.window_s = window_s
        self.sample_s = sample_s
        self.min_samples = min_samples
        self._samples: dict[str, deque[tuple[float, float]]] = {}

    def add(self, ts: float, temps: dict[str, float | None], reference: str) -> None:
        """Add one sample for every sensor that has a value at the same time as the reference."""
        ref = temps.get(reference)
        if ref is None:
            return
        for key, temp in temps.items():
            if temp is not None:
                self._samples.setdefault(key, deque()).append((ts, temp - ref))
        self._prune(ts)

    def seed(self, series: dict[str, list[tuple[float, float | None]]], reference: str,
             start: float, end: float) -> None:
        """Rebuild samples from history (step functions of (ts, value) sorted by ts)."""
        self._samples.clear()
        idx = dict.fromkeys(series, 0)
        current: dict[str, float | None] = dict.fromkeys(series)
        ts = start
        while ts <= end:
            for key, points in series.items():
                while idx[key] < len(points) and points[idx[key]][0] <= ts:
                    current[key] = points[idx[key]][1]
                    idx[key] += 1
            self.add(ts, dict(current), reference)
            ts += self.sample_s

    def summary(self, key: str, now: float) -> DeltaSummary:
        self._prune(now)
        deltas = [d for _, d in self._samples.get(key, ())]
        if not deltas:
            return DeltaSummary(None, None, None, None, 0)
        mean = sum(deltas) / len(deltas)
        suggested = round(mean, 1) if len(deltas) >= self.min_samples else None
        return DeltaSummary(suggested, round(mean, 2), round(min(deltas), 2),
                            round(max(deltas), 2), len(deltas))

    def _prune(self, now: float) -> None:
        cutoff = now - self.window_s
        for samples in self._samples.values():
            while samples and samples[0][0] < cutoff:
                samples.popleft()
