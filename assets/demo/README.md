# Recorded halflist demo

The "Try it" box in the Open Source section replays these two recordings. They are real output, not mocked:

```
halflist check --stdio "python3 sample_server.py"
halflist bench --stdio "python3 sample_server.py" --all -n 20 -w 2
```

- Tool: mcp-halflist v1.1.1, run with `NO_COLOR=1` and `COLUMNS=96`.
- Server: `sample_server.py` in this folder, a three-tool MCP server (add, echo, utc_time) with no resources or prompts. It reports no server version, which is why `check` fails one handshake test.
- Edits: the sample server's own timestamped log line was removed from `halflist-check.txt`. Nothing else was changed.
- To refresh: install `mcp-halflist`, rerun the two commands above from this folder, and save the output (minus the server log line).
