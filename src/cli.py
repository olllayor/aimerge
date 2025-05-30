import typer
from typing import List, Dict
from conflict_detector import find_conflicts
from conflict_parser import parse_conflicts
from gemini_resolver import resolve_with_gemini
from git_integration import stage_resolution
from utils import backup_file, restore_backup

app = typer.Typer()


class Colors:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    END = "\033[0m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"


colors = Colors()


def show_diff_prompt(
    conflict: Dict, resolved_code: str, conflict_num: int, total_conflicts: int
):
    """Show resolution diff and prompt user"""
    print(f"\n{colors.YELLOW}🚧 Conflict {conflict_num}/{total_conflicts}{colors.END}")

    # Show conflict overview
    print(f"{colors.CYAN}Current changes:{colors.END}")
    print(conflict["current"][:200] + ("..." if len(conflict["current"]) > 200 else ""))

    print(f"\n{colors.CYAN}Incoming changes:{colors.END}")
    print(
        conflict["incoming"][:200] + ("..." if len(conflict["incoming"]) > 200 else "")
    )

    # Show AI resolution
    print(f"\n{colors.GREEN}💡 AI Resolution:{colors.END}")
    print(resolved_code)

    return typer.prompt(
        f"\n{colors.BOLD}Accept?{colors.END} [y]es, [n]o, [e]dit, [s]kip", default="y"
    ).lower()


@app.command()
def resolve(
    auto: bool = typer.Option(
        False, "--auto", help="Auto-accept resolutions without confirmation"
    ),
    interactive: bool = typer.Option(
        True, "--interactive", help="Review each resolution interactively"
    ),
    model: str = typer.Option("gemini-1.5-pro", "--model", help="Gemini model version"),
):
    """Resolve Git merge conflicts using AI"""
    try:
        # Step 1: Detect conflicted files
        conflicted_files = find_conflicts()
        if not conflicted_files:
            typer.echo(f"{colors.GREEN}✅ No merge conflicts detected{colors.END}")
            return

        typer.echo(
            f"{colors.BLUE}🔍 Found {len(conflicted_files)} conflicted file(s):{colors.END}"
        )
        for file in conflicted_files:
            typer.echo(f"  - {file}")

        for file_path in conflicted_files:
            # Step 2: Backup original file
            backup_path = backup_file(file_path)

            # Step 3: Parse conflict regions
            conflicts = parse_conflicts(file_path)
            typer.echo(
                f"\n{colors.HEADER}📄 Processing {file_path} ({len(conflicts)} conflicts){colors.END}"
            )

            # Step 4: Resolve each conflict
            resolved_content = resolve_file_conflicts(
                file_path, conflicts, auto, interactive, model
            )

            # Step 5: Write resolved content
            with open(file_path, "w") as f:
                f.write(resolved_content)

            # Step 6: Stage resolved file
            stage_resolution(file_path)
            typer.echo(f"{colors.GREEN}✅ Resolved and staged {file_path}{colors.END}")

    except Exception as e:
        typer.echo(f"{colors.RED}❌ Error: {str(e)}{colors.END}", err=True)
        if "backup_path" in locals():
            restore_backup(backup_path, file_path)
            typer.echo(f"{colors.YELLOW}⚠️ Restored original from backup{colors.END}")
        raise typer.Exit(code=1)


def resolve_file_conflicts(
    file_path: str, conflicts: List[Dict], auto: bool, interactive: bool, model: str
) -> str:
    """Process all conflicts in a file"""
    with open(file_path, "r") as f:
        content = f.read()

    total = len(conflicts)
    resolved_count = 0
    skipped_count = 0

    for i, conflict in enumerate(conflicts):
        # Get AI resolution
        resolved_code = resolve_with_gemini(conflict, model)

        # Handle user interaction
        user_action = "y" if auto else "?"
        if not auto and interactive:
            user_action = show_diff_prompt(
                conflict, resolved_code, conflict_num=i + 1, total_conflicts=total
            )

        # Process user decision
        if user_action == "e":
            # Open in editor
            resolved_code = typer.edit(resolved_code) or resolved_code
            content = content.replace(conflict["full_match"], resolved_code, 1)
            resolved_count += 1
        elif user_action == "y":
            # Accept AI resolution
            content = content.replace(conflict["full_match"], resolved_code, 1)
            resolved_count += 1
        elif user_action == "s":
            # Skip this conflict
            skipped_count += 1
            continue
        else:  # 'n' or any other
            # Keep conflict marker
            skipped_count += 1
            continue

    # Show resolution summary
    if resolved_count > 0:
        typer.echo(
            f"{colors.GREEN}  ➤ Resolved {resolved_count}/{total} conflicts{colors.END}"
        )
    if skipped_count > 0:
        typer.echo(
            f"{colors.YELLOW}  ➤ {skipped_count} conflicts require manual attention{colors.END}"
        )

    return content


@app.command()
def config(api_key: str = typer.Argument(..., help="Your Gemini API key")):
    """Save Gemini API key to .env file"""
    with open(".env", "w") as f:
        f.write(f"GEMINI_API_KEY={api_key}")
    typer.echo(f"{colors.GREEN}✅ API key saved to .env file{colors.END}")


if __name__ == "__main__":
    app()
