"""Run with: python3 -m unittest discover -s scripts -p 'test_*.py'."""

import http.client
import tempfile
import threading
import unittest
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

from dev_server import PreviewHandler


class PreviewServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory()
        Path(cls.directory.name, "demo.mp4").write_bytes(b"0123456789")
        Path(cls.directory.name, "index.html").write_text("preview")
        handler = partial(PreviewHandler, directory=cls.directory.name)
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.directory.cleanup()

    def request(self, value=None, method="GET", path="/demo.mp4"):
        connection = http.client.HTTPConnection(*self.server.server_address)
        headers = {"Range": value} if value is not None else {}
        connection.request(method, path, headers=headers)
        response = connection.getresponse()
        result = response.status, dict(response.getheaders()), response.read()
        connection.close()
        return result

    def test_partial_file_bytes_and_headers(self):
        for value, content, bounds in [
            ("bytes=3-5", b"345", "3-5"),
            ("bytes=7-", b"789", "7-9"),
            ("bytes=-4", b"6789", "6-9"),
            ("bytes=8-100", b"89", "8-9"),
            ("bytes=-100", b"0123456789", "0-9"),
        ]:
            with self.subTest(value=value):
                status, headers, body = self.request(value)
                self.assertEqual(status, 206)
                self.assertEqual(body, content)
                self.assertEqual(headers["Content-Range"], f"bytes {bounds}/10")
                self.assertEqual(int(headers["Content-Length"]), len(content))
                self.assertEqual(headers["Accept-Ranges"], "bytes")
                self.assertEqual(headers["Content-Type"], "video/mp4")

    def test_unsatisfiable_range(self):
        for value in ["bytes=10-", "bytes=5-2", "bytes=-0"]:
            with self.subTest(value=value):
                status, headers, body = self.request(value)
                self.assertEqual(status, 416)
                self.assertEqual(headers["Content-Range"], "bytes */10")
                self.assertEqual(body, b"")

    def test_full_file_and_ignored_ranges(self):
        for value in [None, "invalid", "bytes=-", "bytes=0-1,4-5"]:
            with self.subTest(value=value):
                status, headers, body = self.request(value)
                self.assertEqual(status, 200)
                self.assertEqual(body, b"0123456789")

    def test_head_has_no_body(self):
        status, headers, body = self.request("bytes=3-5", method="HEAD")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Content-Length"], "10")
        self.assertEqual(body, b"")

    def test_existing_static_routes(self):
        self.assertEqual(self.request(path="/")[2], b"preview")
        self.assertEqual(self.request("bytes=0-1", path="/missing.mp4")[0], 404)


if __name__ == "__main__":
    unittest.main()
