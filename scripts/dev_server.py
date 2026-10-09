#!/usr/bin/env python3
"""Static preview with single byte ranges so local media can seek."""

import os
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class PreviewHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        self.range_remaining = None
        path = self.translate_path(self.path)
        value = self.headers.get("Range", "")
        match = re.fullmatch(r"bytes=(\d*)-(\d*)", value)
        # Delegate normal, malformed, multipart and conditional requests to
        # the standard static handler. Ignoring a Range returns the full file.
        if (self.command != "GET" or not match or not any(match.groups()) or not os.path.isfile(path)
                or self.headers.get("If-Range")):
            return super().send_head()

        try:
            source = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None

        stat = os.fstat(source.fileno())
        size = stat.st_size
        first, last = match.groups()
        try:
            if first:
                start = int(first)
                end = min(int(last), size - 1) if last else size - 1
            else:
                start = max(0, size - int(last))
                end = size - 1
        except ValueError:
            source.close()
            self.send_error(400, "Invalid range")
            return None

        if start >= size or start > end:
            source.close()
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None

        source.seek(start)
        self.range_remaining = end - start + 1
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(self.range_remaining))
        self.send_header("Last-Modified", self.date_time_string(stat.st_mtime))
        self.end_headers()
        return source

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def copyfile(self, source, outputfile):
        if self.range_remaining is None:
            return super().copyfile(source, outputfile)
        remaining = self.range_remaining
        while remaining:
            chunk = source.read(min(64 * 1024, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    handler = partial(PreviewHandler, directory=str(root))
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    ThreadingHTTPServer(("", port), handler).serve_forever()
