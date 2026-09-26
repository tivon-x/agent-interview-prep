import os
from pathlib import Path
import re
from urllib.parse import quote


ZERO2AGENT_ROOT = Path("materials/zero2agent")
UPSTREAM_ROOT = "https://onefly.top/zero2Agent"
RELATIVE_HTML_LINK = re.compile(
    r"\]\((?![A-Za-z][A-Za-z0-9+.-]*:|/|#)([^)\s]+?\.html(?:#[^)\s]*)?)\)"
)


def on_page_markdown(markdown, page, config, files):
    """Make zero2Agent's upstream HTML links work in the local MkDocs site."""
    source_uri = Path(page.file.src_uri)
    if ZERO2AGENT_ROOT not in source_uri.parents:
        return markdown

    docs_root = Path(config.docs_dir).resolve()
    source_path = docs_root / source_uri
    source_dir = source_path.parent
    zero2agent_root = docs_root / ZERO2AGENT_ROOT

    def rewrite(match):
        target = match.group(1)
        path_part, separator, fragment = target.partition("#")
        candidate = (source_dir / path_part).resolve()

        if candidate.exists():
            return match.group(0)

        local_markdown = candidate.with_suffix(".md")
        if local_markdown.is_file():
            relative_path = Path(os.path.relpath(local_markdown, source_dir)).as_posix()
            suffix = f"#{fragment}" if separator else ""
            return f"]({relative_path}{suffix})"

        try:
            upstream_path = candidate.relative_to(zero2agent_root).as_posix()
        except ValueError:
            return match.group(0)

        suffix = f"#{fragment}" if separator else ""
        return f"]({UPSTREAM_ROOT}/{quote(upstream_path, safe='/._~-')}{suffix})"

    return RELATIVE_HTML_LINK.sub(rewrite, markdown)
