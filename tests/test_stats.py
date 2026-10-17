"""Tests for suggested offset statistics."""

from custom_components.multisensor_heating.stats import OffsetStats


def test_suggested_offset_is_mean_delta_vs_reference():
    stats = OffsetStats(window_s=3600, sample_s=60, min_samples=3)
    for i, (trv, ref) in enumerate([(19.0, 21.0), (19.5, 21.0), (18.5, 21.0)]):
        stats.add(i * 60, {"trv": trv, "ref": ref}, "ref")
    s = stats.summary("trv", 180)
    assert s.suggested_offset == -2.0
    assert (s.min_delta, s.max_delta, s.samples) == (-2.5, -1.5, 3)
    assert stats.summary("ref", 180).suggested_offset == 0.0


def test_no_suggestion_until_enough_samples_and_window_pruning():
    stats = OffsetStats(window_s=100, sample_s=10, min_samples=2)
    stats.add(0, {"a": 20.0, "ref": 21.0}, "ref")
    assert stats.summary("a", 0).suggested_offset is None
    stats.add(10, {"a": 22.0, "ref": 21.0}, "ref")
    assert stats.summary("a", 10).suggested_offset == 0.0
    assert stats.summary("a", 105).samples == 1


def test_seed_from_step_history():
    stats = OffsetStats(window_s=1000, sample_s=100, min_samples=1)
    stats.seed(
        {"a": [(0, 18.0), (500, 20.0)], "ref": [(0, 21.0)]},
        "ref", start=0, end=900,
    )
    s = stats.summary("a", 900)
    assert s.samples == 10
    assert s.mean_delta == -2.0
