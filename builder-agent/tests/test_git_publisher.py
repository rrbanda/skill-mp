"""Unit tests for ``skill_builder.git_publisher.GitPublisher``."""

from __future__ import annotations

from pathlib import Path
from subprocess import CalledProcessError, CompletedProcess
from unittest.mock import patch

from skill_builder.configuration import Configuration
from skill_builder.git_publisher import GitPublisher


def _configuration(**overrides: object) -> Configuration:
    """Build a ``Configuration`` with explicit git fields (and safe test defaults)."""
    base: dict = {
        "neo4j_password": "test-neo4j-password",
        "llm_api_key": "test-llm-key",
        "git_repo_dir": "/tmp/test-repo",
        "git_remote": "origin",
        "git_branch": "main",
        "git_push_enabled": False,
        "git_author_name": "Test",
        "git_author_email": "test@test.com",
        "git_command_timeout": 5,
    }
    base.update(overrides)
    return Configuration(**base)


@patch("subprocess.run")
def test_init_available(mock_run: object) -> None:
    """When ``rev-parse --is-inside-work-tree`` succeeds, ``is_available()`` is True."""
    mock_run.return_value = CompletedProcess(
        ["git", "rev-parse", "--is-inside-work-tree"],
        returncode=0,
        stdout="true\n",
        stderr="",
    )
    publisher = GitPublisher(_configuration())
    assert publisher.is_available() is True


@patch("subprocess.run")
def test_init_unavailable(mock_run: object) -> None:
    """When the repo check fails (non-zero exit), ``is_available()`` is False."""
    mock_run.return_value = CompletedProcess(
        ["git", "rev-parse", "--is-inside-work-tree"],
        returncode=1,
        stdout="false\n",
        stderr="",
    )
    publisher = GitPublisher(_configuration())
    assert publisher.is_available() is False


@patch("subprocess.run")
def test_publish_result_fields(mock_run: object) -> None:
    """``publish`` returns a ``PublishResult`` with ``commit_sha`` and ``pushed`` set."""
    repo = Path("/tmp/test-repo").resolve()
    skill_file = repo / "registry" / "my-plugin" / "my-skill" / "SKILL.md"

    def _run_side_effect(cmd: list[str], **_kwargs: object) -> CompletedProcess[str]:
        git_args = cmd[1:]
        if git_args[:2] == ["add", str(skill_file.relative_to(repo))]:
            return CompletedProcess(cmd, 0, stdout="", stderr="")
        if git_args[0] == "commit":
            return CompletedProcess(cmd, 0, stdout="", stderr="")
        if git_args[:2] == ["rev-parse", "HEAD"]:
            return CompletedProcess(cmd, 0, stdout="deadbeefcafebabe1234567890ab\n", stderr="")
        raise AssertionError(f"unexpected git invocation: {cmd!r}")

    mock_run.side_effect = _run_side_effect

    publisher = GitPublisher(_configuration())
    result = publisher.publish(skill_file, None, "my-plugin", "my-skill")

    assert result.commit_sha == "deadbeefcafe"
    assert result.pushed is False


@patch("subprocess.run")
def test_stderr_none_handling(mock_run: object) -> None:
    """``CalledProcessError`` with ``stderr=None`` is handled without ``AttributeError``."""
    repo = Path("/tmp/test-repo").resolve()
    skill_file = repo / "registry" / "p" / "s" / "SKILL.md"

    calls: list[str] = []

    def _run_side_effect(cmd: list[str], **_kwargs: object) -> CompletedProcess[str]:
        git_args = cmd[1:]
        if git_args[:4] == ["pull", "--rebase", "origin", "main"]:
            calls.append("pull")
            raise CalledProcessError(1, cmd, stderr=None)
        if git_args[:2] == ["add", str(skill_file.relative_to(repo))]:
            calls.append("add")
            return CompletedProcess(cmd, 0, stdout="", stderr="")
        if git_args[0] == "commit":
            calls.append("commit")
            return CompletedProcess(cmd, 0, stdout="", stderr="")
        if git_args[:2] == ["rev-parse", "HEAD"]:
            calls.append("rev-parse")
            return CompletedProcess(cmd, 0, stdout="abc123\n", stderr="")
        if git_args[:3] == ["push", "origin", "main"]:
            calls.append("push")
            raise CalledProcessError(1, cmd, stderr=None)
        raise AssertionError(f"unexpected git invocation: {cmd!r}")

    mock_run.side_effect = _run_side_effect

    publisher = GitPublisher(
        _configuration(
            git_push_enabled=True,
        )
    )
    # Should not raise when pull/push failures use ``(exc.stderr or "").strip()``.
    result = publisher.publish(skill_file, None, "p", "s")
    assert "pull" in calls
    assert "push" in calls
    assert result.commit_sha == "abc123"
    assert result.pushed is False
