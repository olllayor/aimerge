from unittest.mock import patch

from src.cli import resolve_file_conflicts, show_diff_prompt
from src.conflict_parser import parse_conflicts


def test_show_diff_prompt(capsys):
    conflict = {
        "current": "Current code",
        "incoming": "Incoming code",
        "full_match": "Conflict marker",
    }

    # Mock user input
    with patch("typer.prompt", return_value="y"):
        response = show_diff_prompt(conflict, "Resolved code", 1, 3)

        captured = capsys.readouterr()
        assert "Conflict 1/3" in captured.out
        assert "Current code" in captured.out
        assert "Resolved code" in captured.out
        assert response == "y"


def test_resolve_file_conflicts_accept_all(conflicted_file):
    # Parse actual conflicts from the test file
    conflicts = parse_conflicts(str(conflicted_file))

    # Mock Gemini response - patch where it's imported in cli.py
    with patch(
        "src.cli.resolve_with_gemini", return_value='    print("Merged A and B")'
    ) as mock_resolve:
        result_content = resolve_file_conflicts(
            str(conflicted_file),
            conflicts,
            auto=True,  # Use auto mode to skip user prompts
            interactive=False,
            model="gemini-test",
        )

        assert 'print("Merged A and B")' in result_content
        assert "<<<<<<<" not in result_content
        # Verify the mock was called
        mock_resolve.assert_called_once()


def test_resolve_file_conflicts_skip(conflicted_file):
    # Parse actual conflicts from the test file
    conflicts = parse_conflicts(str(conflicted_file))

    with patch(
        "src.cli.resolve_with_gemini", return_value='    print("Merged A and B")'
    ) as mock_resolve:
        # Mock user input to skip
        with patch("src.cli.show_diff_prompt", return_value="s"):
            result_content = resolve_file_conflicts(
                str(conflicted_file),
                conflicts,
                auto=False,
                interactive=True,
                model="gemini-test",
            )

            # Should still contain conflict markers since skipped
            assert "<<<<<<<" in result_content
            assert 'print("Merged A and B")' not in result_content
            # Verify the mock was called
            mock_resolve.assert_called_once()


def test_resolve_file_conflicts_edit(conflicted_file):
    # Parse actual conflicts from the test file
    conflicts = parse_conflicts(str(conflicted_file))

    # Mock editor input
    with patch(
        "src.cli.resolve_with_gemini",
        return_value="original_resolution",
    ) as mock_resolve:
        with patch("typer.edit", return_value="edited_resolution"):
            with patch("src.cli.show_diff_prompt", return_value="e"):  # Choose edit option
                result_content = resolve_file_conflicts(
                    str(conflicted_file),
                    conflicts,
                    auto=False,
                    interactive=True,
                    model="gemini-test",
                )

                assert "edited_resolution" in result_content
                assert "original_resolution" not in result_content
                # Verify the mock was called
                mock_resolve.assert_called_once()


def test_auto_mode(conflicted_file):
    # Parse actual conflicts from the test file
    conflicts = parse_conflicts(str(conflicted_file))

    # Mock at the CLI import level, not the original module
    with patch(
        "src.cli.resolve_with_gemini",
        return_value="auto_resolution",
    ) as mock_resolve:
        result_content = resolve_file_conflicts(
            str(conflicted_file),
            conflicts,
            auto=True,
            interactive=False,
            model="gemini-test",
        )

        assert "auto_resolution" in result_content
        # Verify the mock was called
        mock_resolve.assert_called_once()
