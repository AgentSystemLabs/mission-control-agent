#!/bin/sh
# mc-agent container entrypoint.
#
# Docker creates named-volume mount points (/workspace, ~/.ssh, ~/.config) owned
# by root:root, but mc-agent runs as the unprivileged `workspace` user — so writes
# into those volumes fail with EACCES (ssh key setup, agent CLI config, clones).
# Pre-creating the dirs in the image only fixes a *fresh* volume; a volume created
# by an older image stays root-owned. So fix ownership here on every boot, then
# drop privileges and exec the agent as `workspace`.
set -e

# Railway templates mount one volume at /home/workspace. When /workspace is not
# separately volume-backed, store clones under /home/workspace/workspace and
# symlink /workspace there so SSH keys, CLI auth, and repos share one volume.
link_workspace_into_home() {
  [ "${MC_LINK_WORKSPACE_TO_HOME:-}" = "1" ] || return 0
  grep -qs "[[:space:]]/workspace[[:space:]]" /proc/mounts 2>/dev/null && return 0
  mkdir -p /home/workspace/workspace
  if [ -L /workspace ]; then return 0; fi
  rm -rf /workspace
  ln -sfn /home/workspace/workspace /workspace
}
link_workspace_into_home

# Small dotfile dirs (incl. persisted agent-CLI auth volumes — .claude/.codex/
# .cursor): recursive is cheap and repairs the root-owned mount points Docker
# creates for fresh named volumes.
chown -R workspace:workspace \
  /home/workspace/.ssh \
  /home/workspace/.config \
  /home/workspace/.claude \
  /home/workspace/.codex \
  /home/workspace/.cursor \
  /home/workspace/.local/share/opencode \
  /home/workspace/workspace \
  2>/dev/null || true
chmod 700 /home/workspace/.ssh 2>/dev/null || true

# Package-manager caches (npm/pnpm). Older images built their global CLIs as root
# with HOME=/home/workspace, leaving these root-owned so a runtime `npm i` (uid
# 1000) fails with EACCES. Repair, but guard the recursive chown behind a cheap
# ownership check so a large warm cache isn't re-chowned on every boot.
for cache in /home/workspace/.npm /home/workspace/.cache; do
  if [ -d "$cache" ] && [ "$(stat -c %U "$cache" 2>/dev/null)" != "workspace" ]; then
    chown -R workspace:workspace "$cache" 2>/dev/null || true
  fi
done

# /workspace can hold large clones — only chown the mount root, not its tree
# (clones are created as `workspace` already, so their contents stay correct).
chown workspace:workspace /workspace 2>/dev/null || true

# setpriv execs (no fork), so the agent becomes PID 1 and receives docker-stop's
# SIGTERM directly. --init-groups sets supplementary groups from /etc/group.
exec setpriv --reuid=workspace --regid=workspace --init-groups "$@"
