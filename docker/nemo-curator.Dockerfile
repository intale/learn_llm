# External corpus preparation only. The Rust/site image stays independent.
# This official image pin is linux/amd64; provision with network, run offline.
ARG NEMO_CURATOR_BASE=nvcr.io/nvidia/nemo-curator@sha256:a9615e68a91af484e52aa35d5c6be0d92e02dc43767f44df7a22de31298fe80a
FROM ${NEMO_CURATOR_BASE}

# No corpus, model or recipe is acquired or embedded here. Supply mounts at run.
WORKDIR /course
ENTRYPOINT ["/opt/venv/bin/python"]
